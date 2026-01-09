from datetime import datetime, timezone
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
        _ensure_settings_table(conn)
        conn.commit()
    finally:
        conn.close()


def _ensure_entry_type_constraint(conn: sqlite3.Connection) -> None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='entries'"
    ).fetchone()
    if not row or not row["sql"]:
        return
    if "wee" in row["sql"]:
        return

    conn.execute("ALTER TABLE entries RENAME TO entries_old")
    conn.execute(
        """
        CREATE TABLE entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_slug TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('feed', 'poo', 'wee')),
            timestamp_utc TEXT NOT NULL,
            client_event_id TEXT NOT NULL UNIQUE,
            notes TEXT,
            amount_ml INTEGER,
            feed_duration_min INTEGER,
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
        conn.execute("ALTER TABLE entries ADD COLUMN feed_duration_min INTEGER")


def _ensure_settings_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS baby_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            dob TEXT,
            feed_interval_min INTEGER,
            updated_at_utc TEXT NOT NULL
        )
        """
    )
    row = conn.execute("SELECT id FROM baby_settings WHERE id = 1").fetchone()
    if not row:
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            "INSERT INTO baby_settings (id, dob, feed_interval_min, updated_at_utc) VALUES (1, NULL, NULL, ?)",
            (now,),
        )


def get_connection(db_path: str) -> sqlite3.Connection:
    return _connect(db_path)
