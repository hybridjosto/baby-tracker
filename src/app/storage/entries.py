import sqlite3
from typing import Optional

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection, next_counter


def _entries_col():
    return collection("entries")


def _doc_to_entry(doc) -> dict:
    data = doc.to_dict() or {}
    entry = {
        "id": data.get("id"),
        "user_slug": data.get("user_slug"),
        "type": data.get("type"),
        "timestamp_utc": data.get("timestamp_utc"),
        "client_event_id": data.get("client_event_id") or doc.id,
        "notes": data.get("notes"),
        "amount_ml": data.get("amount_ml"),
        "expressed_ml": data.get("expressed_ml"),
        "formula_ml": data.get("formula_ml"),
        "feed_duration_min": data.get("feed_duration_min"),
        "caregiver_id": data.get("caregiver_id"),
        "created_at_utc": data.get("created_at_utc"),
        "updated_at_utc": data.get("updated_at_utc"),
        "deleted_at_utc": data.get("deleted_at_utc"),
    }
    return entry


def _firestore_get_by_client_event_id(client_event_id: str) -> Optional[dict]:
    snap = _entries_col().document(client_event_id).get()
    if not snap.exists:
        return None
    return _doc_to_entry(snap)


def _firestore_get_by_id(entry_id: int) -> Optional[dict]:
    docs = _entries_col().where("id", "==", entry_id).limit(1).stream()
    for doc in docs:
        return _doc_to_entry(doc)
    return None


def _firestore_write_entry(payload: dict, *, preserve_id: int | None = None) -> dict:
    client_event_id = payload["client_event_id"]
    doc_ref = _entries_col().document(client_event_id)
    existing = doc_ref.get()
    if existing.exists:
        return _doc_to_entry(existing)
    entry_id = preserve_id if preserve_id is not None else next_counter("entry_id")
    record = {
        "id": entry_id,
        "user_slug": payload["user_slug"],
        "type": payload["type"],
        "timestamp_utc": payload["timestamp_utc"],
        "client_event_id": client_event_id,
        "notes": payload.get("notes"),
        "amount_ml": payload.get("amount_ml"),
        "expressed_ml": payload.get("expressed_ml"),
        "formula_ml": payload.get("formula_ml"),
        "feed_duration_min": payload.get("feed_duration_min"),
        "caregiver_id": payload.get("caregiver_id"),
        "created_at_utc": payload["created_at_utc"],
        "updated_at_utc": payload["updated_at_utc"],
        "deleted_at_utc": payload.get("deleted_at_utc"),
    }
    doc_ref.set(record)
    return record


def _firestore_update_entry(entry_id: int, fields: dict) -> Optional[dict]:
    current = _firestore_get_by_id(entry_id)
    if not current:
        return None
    client_event_id = current["client_event_id"]
    _entries_col().document(client_event_id).set(fields, merge=True)
    snap = _entries_col().document(client_event_id).get()
    return _doc_to_entry(snap)


def _firestore_delete_entry(entry_id: int, deleted_at_utc: str, updated_at_utc: str) -> bool:
    current = _firestore_get_by_id(entry_id)
    if not current or current.get("deleted_at_utc"):
        return False
    _entries_col().document(current["client_event_id"]).set(
        {"deleted_at_utc": deleted_at_utc, "updated_at_utc": updated_at_utc},
        merge=True,
    )
    return True


def _firestore_list_entries(
    limit: int,
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
    entry_type: str | None = None,
    include_deleted: bool = False,
) -> list[dict]:
    query = _entries_col()
    if user_slug:
        query = query.where("user_slug", "==", user_slug)
    if entry_type:
        query = query.where("type", "==", entry_type)
    if since_utc:
        query = query.where("timestamp_utc", ">=", since_utc)
    if until_utc:
        query = query.where("timestamp_utc", "<=", until_utc)
    if not include_deleted:
        query = query.where("deleted_at_utc", "==", None)
    docs = query.order_by("timestamp_utc", direction="DESCENDING").limit(limit).stream()
    return [_doc_to_entry(doc) for doc in docs]


def _firestore_list_entries_for_export(
    user_slug: str | None = None,
    since_utc: str | None = None,
    until_utc: str | None = None,
    entry_type: str | None = None,
) -> list[dict]:
    query = _entries_col()
    if user_slug:
        query = query.where("user_slug", "==", user_slug)
    if entry_type:
        query = query.where("type", "==", entry_type)
    if since_utc:
        query = query.where("timestamp_utc", ">=", since_utc)
    if until_utc:
        query = query.where("timestamp_utc", "<=", until_utc)
    docs = query.order_by("timestamp_utc", direction="ASCENDING").stream()
    return [_doc_to_entry(doc) for doc in docs]


def _firestore_list_entries_updated_since(
    since_utc: str | None,
    limit: int = 500,
) -> list[dict]:
    query = _entries_col()
    if since_utc:
        query = query.where("updated_at_utc", ">=", since_utc)
    docs = query.order_by("updated_at_utc", direction="ASCENDING").limit(limit).stream()
    return [_doc_to_entry(doc) for doc in docs]


def create_entry(conn: sqlite3.Connection | None, payload: dict) -> tuple[dict, bool]:
    if is_firestore_backend():
        existing = _firestore_get_by_client_event_id(payload["client_event_id"])
        if existing:
            return existing, True
        created = _firestore_write_entry(payload)
        return created, False

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
                caregiver_id,
                created_at_utc,
                updated_at_utc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                payload.get("caregiver_id"),
                payload["created_at_utc"],
                payload["updated_at_utc"],
            ),
        )
        conn.commit()
        entry_id = cursor.lastrowid
        entry = get_entry(conn, entry_id)
        if is_dual_backend() and entry:
            _firestore_write_entry(entry, preserve_id=entry_id)
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
    if is_firestore_backend():
        return _firestore_list_entries(
            limit,
            user_slug=user_slug,
            since_utc=since_utc,
            until_utc=until_utc,
            entry_type=entry_type,
            include_deleted=include_deleted,
        )

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
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
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
    if is_firestore_backend():
        return _firestore_list_entries_for_export(
            user_slug=user_slug,
            since_utc=since_utc,
            until_utc=until_utc,
            entry_type=entry_type,
        )

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
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {where}
        ORDER BY timestamp_utc ASC
        """,
        params,
    )
    return [dict(row) for row in cursor.fetchall()]


def get_entry(conn: sqlite3.Connection | None, entry_id: int) -> Optional[dict]:
    if is_firestore_backend():
        return _firestore_get_by_id(entry_id)

    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
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
    if is_firestore_backend():
        return _firestore_get_by_client_event_id(client_event_id)

    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        WHERE client_event_id = ?
        """,
        (client_event_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_entry(conn: sqlite3.Connection | None, entry_id: int, fields: dict) -> Optional[dict]:
    if is_firestore_backend():
        return _firestore_update_entry(entry_id, fields)

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
    entry = get_entry(conn, entry_id)
    if is_dual_backend() and entry:
        _entries_col().document(entry["client_event_id"]).set(entry, merge=True)
    return entry


def delete_entry(
    conn: sqlite3.Connection | None, entry_id: int, deleted_at_utc: str, updated_at_utc: str
) -> bool:
    if is_firestore_backend():
        return _firestore_delete_entry(entry_id, deleted_at_utc, updated_at_utc)

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
    deleted = cursor.rowcount > 0
    if deleted and is_dual_backend():
        entry = get_entry(conn, entry_id)
        if entry:
            _entries_col().document(entry["client_event_id"]).set(entry, merge=True)
    return deleted


def list_entries_updated_since(
    conn: sqlite3.Connection | None, since_utc: str | None, limit: int = 500
) -> list[dict]:
    if is_firestore_backend():
        return _firestore_list_entries_updated_since(since_utc, limit=limit)

    assert conn is not None
    clauses: list[str] = []
    params: list[object] = []
    if since_utc:
        clauses.append("updated_at_utc >= ?")
        params.append(since_utc)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor = conn.execute(
        f"""
        SELECT id, user_slug, type, timestamp_utc, client_event_id, notes, amount_ml,
               expressed_ml, formula_ml, feed_duration_min, caregiver_id,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM entries
        {where}
        ORDER BY updated_at_utc ASC
        LIMIT ?
        """,
        (*params, limit),
    )
    return [dict(row) for row in cursor.fetchall()]


def upsert_entry_by_client_event_id(conn: sqlite3.Connection | None, payload: dict) -> dict:
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
        "caregiver_id": payload.get("caregiver_id"),
        "updated_at_utc": payload["updated_at_utc"],
        "deleted_at_utc": payload.get("deleted_at_utc"),
    }
    return update_entry(conn, existing["id"], fields)
