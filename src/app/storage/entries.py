import sqlite3
from typing import Optional


def create_entry(conn: sqlite3.Connection | None, payload: dict) -> tuple[dict, bool]:
    assert conn is not None
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
                expressed_ml,
                formula_ml,
                feed_duration_min,
                weight_kg,
                caregiver_id,
                created_at_utc,
                updated_at_utc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["user_slug"],
                payload["type"],
                payload["timestamp_utc"],
                payload["client_event_id"],
                payload.get("notes"),
                payload.get("amount_ml"),
                payload.get("expressed_ml"),
                payload.get("formula_ml"),
                payload.get("feed_duration_min"),
                payload.get("weight_kg"),
                payload.get("caregiver_id"),
                payload["created_at_utc"],
                payload["updated_at_utc"],
            ),
        )
        conn.commit()
        entry_id = cursor.lastrowid
        entry = get_entry(conn, entry_id)
        return entry, False
    except sqlite3.IntegrityError:
        existing = get_entry_by_client_event_id(conn, payload["client_event_id"])
        return existing, True


def list_entries(
    conn: sqlite3.Connection | None,
    limit: int,
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
    entry_type: str | None = None,
    include_deleted: bool = False,
) -> list[dict]:
    assert conn is not None
    clauses: list[str] = []
    params: list[object] = []
    if user_slug:
        clauses.append("user_slug = ?")
        params.append(user_slug)
    if entry_type:
        clauses.append("type = ?")
        params.append(entry_type)
    if since_utc:
        clauses.append("timestamp_utc >= ?")
        params.append(since_utc)
    if until_utc:
        clauses.append("timestamp_utc <= ?")
        params.append(until_utc)
    if not include_deleted:
        clauses.append("deleted_at_utc IS NULL")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {where}
        ORDER BY timestamp_utc DESC
        LIMIT ?
        """,
        (*params, limit),
    )
    return [dict(row) for row in cursor.fetchall()]


def list_entries_for_export(
    conn: sqlite3.Connection | None,
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
    entry_type: str | None = None,
) -> list[dict]:
    assert conn is not None
    clauses: list[str] = []
    params: list[object] = []
    if user_slug:
        clauses.append("user_slug = ?")
        params.append(user_slug)
    if entry_type:
        clauses.append("type = ?")
        params.append(entry_type)
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
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {where}
        ORDER BY timestamp_utc ASC
        """,
        params,
    )
    return [dict(row) for row in cursor.fetchall()]


def get_entry(conn: sqlite3.Connection | None, entry_id: int) -> Optional[dict]:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        WHERE id = ?
        """,
        (entry_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_entry_by_client_event_id(
    conn: sqlite3.Connection | None, client_event_id: str
) -> Optional[dict]:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        WHERE client_event_id = ?
        """,
        (client_event_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_latest_active_timed_entry(
    conn: sqlite3.Connection | None, entry_type: str, user_slug: str | None = None
) -> Optional[dict]:
    assert conn is not None
    clauses = [
        "type = ?",
        "feed_duration_min IS NULL",
        "deleted_at_utc IS NULL",
    ]
    params: list[object] = [entry_type]
    if user_slug:
        clauses.append("user_slug = ?")
        params.append(user_slug)
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        WHERE {' AND '.join(clauses)}
        ORDER BY timestamp_utc DESC
        LIMIT 1
        """,
        params,
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_entry(
    conn: sqlite3.Connection | None, entry_id: int, fields: dict
) -> Optional[dict]:
    assert conn is not None
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "type",
        "timestamp_utc",
        "notes",
        "amount_ml",
        "expressed_ml",
        "formula_ml",
        "feed_duration_min",
        "weight_kg",
        "caregiver_id",
        "updated_at_utc",
        "deleted_at_utc",
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


def delete_entry(
    conn: sqlite3.Connection | None,
    entry_id: int,
    deleted_at_utc: str,
    updated_at_utc: str,
) -> bool:
    assert conn is not None
    cursor = conn.execute(
        """
        UPDATE entries
        SET deleted_at_utc = ?, updated_at_utc = ?
        WHERE id = ? AND deleted_at_utc IS NULL
        """,
        (deleted_at_utc, updated_at_utc, entry_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def list_entries_updated_since(
    conn: sqlite3.Connection | None, since_utc: str | None, limit: int = 500
) -> list[dict]:
    assert conn is not None
    clauses: list[str] = []
    params: list[object] = []
    if since_utc:
        clauses.append("updated_at_utc > ?")
        params.append(since_utc)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, weight_kg, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {where}
        ORDER BY updated_at_utc ASC
        LIMIT ?
        """,
        (*params, limit),
    )
    return [dict(row) for row in cursor.fetchall()]


def upsert_entry_by_client_event_id(
    conn: sqlite3.Connection | None, payload: dict
) -> dict:
    existing = get_entry_by_client_event_id(conn, payload["client_event_id"])
    if not existing:
        entry, _ = create_entry(conn, payload)
        return entry
    fields = {
        "type": payload["type"],
        "timestamp_utc": payload["timestamp_utc"],
        "notes": payload.get("notes"),
        "amount_ml": payload.get("amount_ml"),
        "expressed_ml": payload.get("expressed_ml"),
        "formula_ml": payload.get("formula_ml"),
        "feed_duration_min": payload.get("feed_duration_min"),
        "weight_kg": payload.get("weight_kg"),
        "caregiver_id": payload.get("caregiver_id"),
        "updated_at_utc": payload["updated_at_utc"],
        "deleted_at_utc": payload.get("deleted_at_utc"),
    }
    return update_entry(conn, existing["id"], fields)
