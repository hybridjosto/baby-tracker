import json
import sqlite3


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
        SELECT dob, feed_interval_min, custom_event_types
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    if not row:
        return {"dob": None, "feed_interval_min": None, "custom_event_types": []}
    data = dict(row)
    data["custom_event_types"] = _parse_custom_event_types(data.get("custom_event_types"))
    return data


def update_settings(conn: sqlite3.Connection, fields: dict) -> dict:
    _ensure_settings_row(conn)
    assignments: list[str] = []
    values: list[object] = []
    for key in ("dob", "feed_interval_min", "custom_event_types", "updated_at_utc"):
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
