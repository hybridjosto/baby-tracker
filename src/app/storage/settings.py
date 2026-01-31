import json
import sqlite3
from datetime import datetime, timezone


def _parse_custom_event_types(value: object) -> list[str]:
    if not value:
        return []
    if not isinstance(value, str):
        return []
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(loaded, list):
        return []
    return [item for item in loaded if isinstance(item, str)]


def _ensure_settings_row(conn: sqlite3.Connection) -> None:
    row = conn.execute("SELECT id FROM baby_settings WHERE id = 1").fetchone()
    if not row:
        conn.execute(
            """
            INSERT INTO baby_settings (id, dob, feed_interval_min, updated_at_utc)
            VALUES (1, NULL, NULL, datetime('now'))
            """
        )
        conn.commit()


def get_settings(conn: sqlite3.Connection) -> dict:
    _ensure_settings_row(conn)
    row = conn.execute(
        """
        SELECT dob, feed_interval_min, custom_event_types,
               feed_goal_min, feed_goal_max,
               overnight_gap_min_hours, overnight_gap_max_hours,
               behind_target_mode, entry_webhook_url,
               default_user_slug, pushcut_feed_due_url,
               home_kpis_webhook_url
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return {
            "dob": None,
            "feed_interval_min": None,
            "custom_event_types": [],
            "feed_goal_min": None,
            "feed_goal_max": None,
            "overnight_gap_min_hours": None,
            "overnight_gap_max_hours": None,
            "behind_target_mode": None,
            "entry_webhook_url": None,
            "default_user_slug": None,
            "pushcut_feed_due_url": None,
            "home_kpis_webhook_url": None,
        }
    data = dict(row)
    data["custom_event_types"] = _parse_custom_event_types(data.get("custom_event_types"))
    return data


def update_settings(conn: sqlite3.Connection, fields: dict) -> dict:
    _ensure_settings_row(conn)
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "dob",
        "feed_interval_min",
        "custom_event_types",
        "feed_goal_min",
        "feed_goal_max",
        "overnight_gap_min_hours",
        "overnight_gap_max_hours",
        "behind_target_mode",
        "entry_webhook_url",
        "default_user_slug",
        "pushcut_feed_due_url",
        "home_kpis_webhook_url",
        "updated_at_utc",
    ):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if assignments:
        values.append(1)
        conn.execute(
            f"UPDATE baby_settings SET {', '.join(assignments)} WHERE id = ?",
            values,
        )
        conn.commit()
    return get_settings(conn)


def get_feed_due_state(conn: sqlite3.Connection) -> dict:
    _ensure_settings_row(conn)
    row = conn.execute(
        """
        SELECT feed_due_last_entry_id, feed_due_last_sent_at_utc
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return {"feed_due_last_entry_id": None, "feed_due_last_sent_at_utc": None}
    return dict(row)


def update_feed_due_state(
    conn: sqlite3.Connection,
    last_entry_id: int | None,
    sent_at_utc: str | None,
) -> dict:
    _ensure_settings_row(conn)
    stamp = sent_at_utc or datetime.now(timezone.utc).isoformat()
    conn.execute(
        """
        UPDATE baby_settings
        SET feed_due_last_entry_id = ?,
            feed_due_last_sent_at_utc = ?,
            updated_at_utc = ?
        WHERE id = 1
        """,
        (last_entry_id, sent_at_utc, stamp),
    )
    conn.commit()
    return get_feed_due_state(conn)
