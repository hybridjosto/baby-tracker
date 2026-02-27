from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path

from src.app.storage.firestore_client import collection


def _connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _copy_entries(conn: sqlite3.Connection) -> int:
    rows = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        """
    ).fetchall()
    col = collection("entries")
    count = 0
    for row in rows:
        record = dict(row)
        doc_id = record["client_event_id"]
        col.document(doc_id).set(record)
        count += 1
    return count


def _copy_settings(conn: sqlite3.Connection) -> int:
    row = conn.execute(
        """
        SELECT dob, feed_interval_min, custom_event_types,
               feed_goal_min, feed_goal_max,
               overnight_gap_min_hours, overnight_gap_max_hours,
               behind_target_mode, entry_webhook_url,
               default_user_slug, pushcut_feed_due_url,
               home_kpis_webhook_url, feed_due_last_entry_id,
               feed_due_last_sent_at_utc, updated_at_utc
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return 0
    record = dict(row)
    custom_event_types = record.get("custom_event_types")
    if isinstance(custom_event_types, str) and custom_event_types.strip():
        try:
            record["custom_event_types"] = json.loads(custom_event_types)
        except json.JSONDecodeError:
            record["custom_event_types"] = []
    else:
        record["custom_event_types"] = []
    collection("settings").document("main").set(record, merge=True)
    return 1


def _copy_table(conn: sqlite3.Connection, table: str, columns: str, id_field: str) -> int:
    rows = conn.execute(f"SELECT {columns} FROM {table}").fetchall()
    col = collection(table)
    count = 0
    for row in rows:
        record = dict(row)
        col.document(str(record[id_field])).set(record)
        count += 1
    return count


def _copy_counters(conn: sqlite3.Connection) -> None:
    counters = {
        "entry_id": conn.execute("SELECT COALESCE(MAX(id), 0) FROM entries").fetchone()[0],
        "bottle_id": conn.execute("SELECT COALESCE(MAX(id), 0) FROM bottles").fetchone()[0],
        "goal_id": conn.execute("SELECT COALESCE(MAX(id), 0) FROM feeding_goals").fetchone()[0],
        "calendar_event_id": conn.execute("SELECT COALESCE(MAX(id), 0) FROM calendar_events").fetchone()[0],
        "reminder_id": conn.execute("SELECT COALESCE(MAX(id), 0) FROM reminders").fetchone()[0],
    }
    collection("meta").document("counters").set(counters, merge=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite data to Firestore")
    parser.add_argument(
        "--sqlite-path",
        default=os.getenv("BABY_TRACKER_DB_PATH", "./data/baby-tracker.sqlite"),
        help="Path to source SQLite database",
    )
    args = parser.parse_args()

    db_path = Path(args.sqlite_path)
    if not db_path.exists():
        raise FileNotFoundError(f"SQLite DB not found: {db_path}")

    with _connect(str(db_path)) as conn:
        counts = {
            "entries": _copy_entries(conn),
            "settings": _copy_settings(conn),
            "bottles": _copy_table(
                conn,
                "bottles",
                "id, name, empty_weight_g, created_at_utc, updated_at_utc, deleted_at_utc",
                "id",
            ),
            "feeding_goals": _copy_table(
                conn,
                "feeding_goals",
                "id, goal_ml, start_date, created_at_utc",
                "id",
            ),
            "reminders": _copy_table(
                conn,
                "reminders",
                "id, name, kind, interval_min, message, active, last_sent_at_utc, next_due_at_utc, created_at_utc, updated_at_utc",
                "id",
            ),
            "calendar_events": _copy_table(
                conn,
                "calendar_events",
                "id, title, date_local, start_time_local, end_time_local, location, notes, category, recurrence, recurrence_until_local, created_at_utc, updated_at_utc, deleted_at_utc",
                "id",
            ),
        }
        _copy_counters(conn)

    print(json.dumps({"migrated": counts}, indent=2))


if __name__ == "__main__":
    main()
