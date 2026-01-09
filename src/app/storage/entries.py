import sqlite3
from typing import Iterable, Optional


def create_entry(conn: sqlite3.Connection, payload: dict) -> tuple[dict, bool]:
    try:
        cursor = conn.execute(
            """
            INSERT INTO entries (
                user_slug,
                type,
                timestamp_utc,
                client_event_id,
                notes,
                amount_ml,
                feed_duration_min,
                caregiver_id,
                created_at_utc,
                updated_at_utc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["user_slug"],
                payload["type"],
                payload["timestamp_utc"],
                payload["client_event_id"],
                payload.get("notes"),
                payload.get("amount_ml"),
                payload.get("feed_duration_min"),
                payload.get("caregiver_id"),
                payload["created_at_utc"],
                payload["updated_at_utc"],
            ),
        )
        conn.commit()
        entry_id = cursor.lastrowid
        return get_entry(conn, entry_id), False
    except sqlite3.IntegrityError:
        existing = get_entry_by_client_event_id(conn, payload["client_event_id"])
        return existing, True


def list_entries(
    conn: sqlite3.Connection,
    limit: int,
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
) -> list[dict]:
    clauses: list[str] = []
    params: list[object] = []
    if user_slug:
        clauses.append("user_slug = ?")
        params.append(user_slug)
    if since_utc:
        clauses.append("timestamp_utc >= ?")
        params.append(since_utc)
    if until_utc:
        clauses.append("timestamp_utc <= ?")
        params.append(until_utc)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               feed_duration_min, caregiver_id, created_at_utc, updated_at_utc
        FROM entries
        {where}
        ORDER BY timestamp_utc DESC
        LIMIT ?
        """,
        (*params, limit),
    )
    return [dict(row) for row in cursor.fetchall()]


def get_entry(conn: sqlite3.Connection, entry_id: int) -> Optional[dict]:
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               feed_duration_min, caregiver_id, created_at_utc, updated_at_utc
        FROM entries
        WHERE id = ?
        """,
        (entry_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_entry_by_client_event_id(
    conn: sqlite3.Connection, client_event_id: str
) -> Optional[dict]:
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               feed_duration_min, caregiver_id, created_at_utc, updated_at_utc
        FROM entries
        WHERE client_event_id = ?
        """,
        (client_event_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_entry(conn: sqlite3.Connection, entry_id: int, fields: dict) -> Optional[dict]:
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "type",
        "timestamp_utc",
        "notes",
        "amount_ml",
        "feed_duration_min",
        "caregiver_id",
        "updated_at_utc",
    ):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])

    if not assignments:
        return get_entry(conn, entry_id)

    values.append(entry_id)
    conn.execute(
        f"UPDATE entries SET {', '.join(assignments)} WHERE id = ?",
        values,
    )
    conn.commit()
    return get_entry(conn, entry_id)


def delete_entry(conn: sqlite3.Connection, entry_id: int) -> bool:
    cursor = conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))
    conn.commit()
    return cursor.rowcount > 0
