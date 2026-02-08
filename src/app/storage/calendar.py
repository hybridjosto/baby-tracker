import sqlite3


def create_event(conn: sqlite3.Connection, payload: dict) -> dict:
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
    return get_event(conn, cursor.lastrowid)


def list_events(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
    include_deleted: bool = False,
) -> list[dict]:
    clauses: list[str] = ["date_local <= ?", "(recurrence_until_local IS NULL OR recurrence_until_local >= ?)" ]
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


def get_event(conn: sqlite3.Connection, event_id: int) -> dict | None:
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


def update_event(conn: sqlite3.Connection, event_id: int, fields: dict) -> dict | None:
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
    return get_event(conn, event_id)


def delete_event(conn: sqlite3.Connection, event_id: int, deleted_at_utc: str, updated_at_utc: str) -> bool:
    cursor = conn.execute(
        """
        UPDATE calendar_events
        SET deleted_at_utc = ?, updated_at_utc = ?
        WHERE id = ? AND deleted_at_utc IS NULL
        """,
        (deleted_at_utc, updated_at_utc, event_id),
    )
    conn.commit()
    return cursor.rowcount > 0
