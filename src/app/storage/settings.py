import sqlite3


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
        "SELECT dob, feed_interval_min FROM baby_settings WHERE id = 1"
    ).fetchone()
    if not row:
        return {"dob": None, "feed_interval_min": None}
    return dict(row)


def update_settings(conn: sqlite3.Connection, fields: dict) -> dict:
    _ensure_settings_row(conn)
    assignments: list[str] = []
    values: list[object] = []
    for key in ("dob", "feed_interval_min", "updated_at_utc"):
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
