from datetime import datetime, timedelta, timezone
import sqlite3
from pathlib import Path


def _connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path: str) -> None:
    db_file = Path(db_path)
    db_file.parent.mkdir(parents=True, exist_ok=True)

    schema_path = Path(__file__).with_name("schema.sql")
    conn = _connect(db_path)
    try:
        with schema_path.open("r", encoding="utf-8") as schema_file:
            conn.executescript(schema_file.read())
        _ensure_entry_type_constraint(conn)
        _ensure_user_slug_column(conn)
        _ensure_feed_duration_column(conn)
        _ensure_feed_amount_columns(conn)
        _ensure_settings_table(conn)
        _ensure_feeding_goals_table(conn)
        _ensure_reminders_table(conn)
        _ensure_default_reminders(conn)
        conn.commit()
    finally:
        conn.close()


def _ensure_entry_type_constraint(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='entries'"
    ).fetchone()
    if not row or not row["sql"]:
        return
    if "CHECK (type IN" not in row["sql"]:
        return

    conn.execute("ALTER TABLE entries RENAME TO entries_old")
    conn.execute(
        """
        CREATE TABLE entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_slug TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp_utc TEXT NOT NULL,
            client_event_id TEXT NOT NULL UNIQUE,
            notes TEXT,
            amount_ml REAL,
            expressed_ml REAL,
            formula_ml REAL,
            feed_duration_min REAL,
            caregiver_id INTEGER,
            created_at_utc TEXT NOT NULL,
            updated_at_utc TEXT NOT NULL
        )
        """
    )
    new_cols = [
        row["name"] for row in conn.execute("PRAGMA table_info(entries)").fetchall()
    ]
    old_cols = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(entries_old)").fetchall()
    }
    copy_cols = [col for col in new_cols if col in old_cols]
    if copy_cols:
        col_list = ", ".join(copy_cols)
        conn.execute(
            f"INSERT INTO entries ({col_list}) SELECT {col_list} FROM entries_old"
        )
    conn.execute("DROP TABLE entries_old")
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_entries_timestamp_utc ON entries (timestamp_utc DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_entries_user_slug ON entries (user_slug)"
    )


def _ensure_user_slug_column(conn: sqlite3.Connection) -> None:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(entries)").fetchall()
    }
    if "user_slug" not in columns:
        conn.execute(
            "ALTER TABLE entries ADD COLUMN user_slug TEXT NOT NULL DEFAULT 'default'"
        )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_entries_user_slug ON entries (user_slug)"
    )


def _ensure_feed_duration_column(conn: sqlite3.Connection) -> None:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(entries)").fetchall()
    }
    if "feed_duration_min" not in columns:
        conn.execute("ALTER TABLE entries ADD COLUMN feed_duration_min REAL")


def _ensure_feed_amount_columns(conn: sqlite3.Connection) -> None:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(entries)").fetchall()
    }
    if "expressed_ml" not in columns:
        conn.execute("ALTER TABLE entries ADD COLUMN expressed_ml REAL")
    if "formula_ml" not in columns:
        conn.execute("ALTER TABLE entries ADD COLUMN formula_ml REAL")


def _ensure_settings_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS baby_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            dob TEXT,
            feed_interval_min INTEGER,
            custom_event_types TEXT,
            updated_at_utc TEXT NOT NULL
        )
        """
    )
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(baby_settings)").fetchall()
    }
    if "custom_event_types" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN custom_event_types TEXT")
    if "feed_goal_min" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN feed_goal_min INTEGER")
    if "feed_goal_max" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN feed_goal_max INTEGER")
    if "overnight_gap_min_hours" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN overnight_gap_min_hours REAL")
    if "overnight_gap_max_hours" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN overnight_gap_max_hours REAL")
    if "behind_target_mode" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN behind_target_mode TEXT")
    if "feed_schedule_anchor_time" not in columns:
        conn.execute("ALTER TABLE baby_settings ADD COLUMN feed_schedule_anchor_time TEXT")
    row = conn.execute("SELECT id FROM baby_settings WHERE id = 1").fetchone()
    if not row:
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO baby_settings
                (id, dob, feed_interval_min, custom_event_types,
                 feed_goal_min, feed_goal_max,
                 overnight_gap_min_hours, overnight_gap_max_hours,
                 behind_target_mode, feed_schedule_anchor_time, updated_at_utc)
            VALUES (1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
            """,
            (now,),
        )


def _ensure_reminders_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            kind TEXT NOT NULL,
            interval_min INTEGER NOT NULL CHECK (interval_min > 0),
            message TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            last_sent_at_utc TEXT,
            next_due_at_utc TEXT NOT NULL,
            created_at_utc TEXT NOT NULL,
            updated_at_utc TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reminders_next_due_at_utc ON reminders (next_due_at_utc)"
    )


def _ensure_feeding_goals_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS feeding_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_ml REAL NOT NULL,
            start_date TEXT NOT NULL,
            created_at_utc TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_feeding_goals_start_date
            ON feeding_goals (start_date DESC, created_at_utc DESC)
        """
    )


def _ensure_default_reminders(conn: sqlite3.Connection) -> None:
    row = conn.execute("SELECT COUNT(*) AS count FROM reminders").fetchone()
    if not row:
        return
    if row["count"] >= 2:
        return

    now = datetime.now(timezone.utc)
    created_at = now.isoformat()
    next_due_at = (now + timedelta(minutes=180)).isoformat()
    defaults = [
        ("Nappy check", "nappy", 180, "Time for a nappy check."),
        ("Feed", "food", 180, "Time for a feed."),
    ]
    for name, kind, interval_min, message in defaults[row["count"] :]:
        conn.execute(
            """
            INSERT INTO reminders (
                name,
                kind,
                interval_min,
                message,
                active,
                last_sent_at_utc,
                next_due_at_utc,
                created_at_utc,
                updated_at_utc
            )
            VALUES (?, ?, ?, ?, 1, NULL, ?, ?, ?)
            """,
            (name, kind, interval_min, message, next_due_at, created_at, created_at),
        )


def get_connection(db_path: str) -> sqlite3.Connection:
    return _connect(db_path)
