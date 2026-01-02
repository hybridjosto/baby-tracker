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
        _ensure_user_slug_column(conn)
        conn.commit()
    finally:
        conn.close()


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


def get_connection(db_path: str) -> sqlite3.Connection:
    return _connect(db_path)
