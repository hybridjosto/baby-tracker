import sqlite3

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection, next_counter


def _events_col():
    return collection("calendar_events")


def _doc_to_event(doc) -> dict:
    data = doc.to_dict() or {}
    return {
        "id": data.get("id"),
        "title": data.get("title"),
        "date_local": data.get("date_local"),
        "start_time_local": data.get("start_time_local"),
        "end_time_local": data.get("end_time_local"),
        "location": data.get("location"),
        "notes": data.get("notes"),
        "category": data.get("category"),
        "recurrence": data.get("recurrence"),
        "recurrence_until_local": data.get("recurrence_until_local"),
        "created_at_utc": data.get("created_at_utc"),
        "updated_at_utc": data.get("updated_at_utc"),
        "deleted_at_utc": data.get("deleted_at_utc"),
    }


def _firestore_get_event(event_id: int) -> dict | None:
    snap = _events_col().document(str(event_id)).get()
    if not snap.exists:
        return None
    return _doc_to_event(snap)


def create_event(conn: sqlite3.Connection | None, payload: dict) -> dict:
    if is_firestore_backend():
        event_id = next_counter("calendar_event_id")
        record = {
            "id": event_id,
            "title": payload["title"],
            "date_local": payload["date_local"],
            "start_time_local": payload["start_time_local"],
            "end_time_local": payload.get("end_time_local"),
            "location": payload.get("location"),
            "notes": payload.get("notes"),
            "category": payload["category"],
            "recurrence": payload["recurrence"],
            "recurrence_until_local": payload.get("recurrence_until_local"),
            "created_at_utc": payload["created_at_utc"],
            "updated_at_utc": payload["updated_at_utc"],
            "deleted_at_utc": payload.get("deleted_at_utc"),
        }
        _events_col().document(str(event_id)).set(record)
        return record

    assert conn is not None
    cursor = conn.execute(
        """
        INSERT INTO calendar_events (
            title,
            date_local,
            start_time_local,
            end_time_local,
            location,
            notes,
            category,
            recurrence,
            recurrence_until_local,
            created_at_utc,
            updated_at_utc,
            deleted_at_utc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["title"],
            payload["date_local"],
            payload["start_time_local"],
            payload.get("end_time_local"),
            payload.get("location"),
            payload.get("notes"),
            payload["category"],
            payload["recurrence"],
            payload.get("recurrence_until_local"),
            payload["created_at_utc"],
            payload["updated_at_utc"],
            payload.get("deleted_at_utc"),
        ),
    )
    conn.commit()
    event = get_event(conn, cursor.lastrowid)
    if is_dual_backend() and event:
        _events_col().document(str(event["id"])).set(event)
    return event


def list_events(
    conn: sqlite3.Connection | None,
    start_date: str,
    end_date: str,
    include_deleted: bool = False,
) -> list[dict]:
    if is_firestore_backend():
        query = (
            _events_col()
            .where("date_local", "<=", end_date)
            .where("recurrence_until_local", ">=", start_date)
        )
        if not include_deleted:
            query = query.where("deleted_at_utc", "==", None)
        docs = (
            query.order_by("date_local", direction="ASCENDING")
            .order_by("start_time_local", direction="ASCENDING")
            .order_by("id", direction="ASCENDING")
            .stream()
        )
        events = [_doc_to_event(doc) for doc in docs]
        no_until_query = _events_col().where("recurrence_until_local", "==", None).where(
            "date_local", "<=", end_date
        )
        if not include_deleted:
            no_until_query = no_until_query.where("deleted_at_utc", "==", None)
        for doc in no_until_query.stream():
            event = _doc_to_event(doc)
            if event not in events:
                events.append(event)
        events.sort(key=lambda row: (row["date_local"], row["start_time_local"], row["id"]))
        return events

    assert conn is not None
    clauses: list[str] = ["date_local <= ?", "(recurrence_until_local IS NULL OR recurrence_until_local >= ?)"]
    params: list[object] = [end_date, start_date]
    if not include_deleted:
        clauses.append("deleted_at_utc IS NULL")
    where = "WHERE " + " AND ".join(clauses)
    cursor = conn.execute(
        f"""
        SELECT id, title, date_local, start_time_local, end_time_local,
               location, notes, category, recurrence, recurrence_until_local,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM calendar_events
        {where}
        ORDER BY date_local ASC, start_time_local ASC, id ASC
        """,
        params,
    )
    return [dict(row) for row in cursor.fetchall()]


def get_event(conn: sqlite3.Connection | None, event_id: int) -> dict | None:
    if is_firestore_backend():
        return _firestore_get_event(event_id)

    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, title, date_local, start_time_local, end_time_local,
               location, notes, category, recurrence, recurrence_until_local,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM calendar_events
        WHERE id = ?
        """,
        (event_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_event(conn: sqlite3.Connection | None, event_id: int, fields: dict) -> dict | None:
    if is_firestore_backend():
        current = _firestore_get_event(event_id)
        if not current:
            return None
        _events_col().document(str(event_id)).set(fields, merge=True)
        return _firestore_get_event(event_id)

    assert conn is not None
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "title",
        "date_local",
        "start_time_local",
        "end_time_local",
        "location",
        "notes",
        "category",
        "recurrence",
        "recurrence_until_local",
        "updated_at_utc",
        "deleted_at_utc",
    ):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if not assignments:
        return get_event(conn, event_id)
    values.append(event_id)
    conn.execute(
        f"UPDATE calendar_events SET {', '.join(assignments)} WHERE id = ?",
        values,
    )
    conn.commit()
    event = get_event(conn, event_id)
    if is_dual_backend() and event:
        _events_col().document(str(event_id)).set(event, merge=True)
    return event


def delete_event(conn: sqlite3.Connection | None, event_id: int, deleted_at_utc: str, updated_at_utc: str) -> bool:
    if is_firestore_backend():
        current = _firestore_get_event(event_id)
        if not current or current.get("deleted_at_utc"):
            return False
        _events_col().document(str(event_id)).set(
            {"deleted_at_utc": deleted_at_utc, "updated_at_utc": updated_at_utc},
            merge=True,
        )
        return True

    assert conn is not None
    cursor = conn.execute(
        """
        UPDATE calendar_events
        SET deleted_at_utc = ?, updated_at_utc = ?
        WHERE id = ? AND deleted_at_utc IS NULL
        """,
        (deleted_at_utc, updated_at_utc, event_id),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    if deleted and is_dual_backend():
        event = get_event(conn, event_id)
        if event:
            _events_col().document(str(event_id)).set(event, merge=True)
    return deleted
