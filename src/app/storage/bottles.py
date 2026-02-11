import sqlite3


def _has_user_slug_column(conn: sqlite3.Connection) -> bool:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(bottles)").fetchall()
    }
    return "user_slug" in columns


def create_bottle(conn: sqlite3.Connection, payload: dict) -> dict:
    if _has_user_slug_column(conn):
        cursor = conn.execute(
            """
            INSERT INTO bottles (
                user_slug,
                name,
                empty_weight_g,
                created_at_utc,
                updated_at_utc,
                deleted_at_utc
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                "global",
                payload["name"],
                payload["empty_weight_g"],
                payload["created_at_utc"],
                payload["updated_at_utc"],
                payload.get("deleted_at_utc"),
            ),
        )
    else:
        cursor = conn.execute(
            """
            INSERT INTO bottles (
                name,
                empty_weight_g,
                created_at_utc,
                updated_at_utc,
                deleted_at_utc
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload["name"],
                payload["empty_weight_g"],
                payload["created_at_utc"],
                payload["updated_at_utc"],
                payload.get("deleted_at_utc"),
            ),
        )
    conn.commit()
    return get_bottle(conn, cursor.lastrowid)


def list_bottles(conn: sqlite3.Connection, include_deleted: bool = False) -> list[dict]:
    clauses: list[str] = []
    params: list[object] = []
    if not include_deleted:
        clauses.append("deleted_at_utc IS NULL")
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    cursor = conn.execute(
        f"""
        SELECT id, name, empty_weight_g,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM bottles
        {where}
        ORDER BY updated_at_utc DESC, id DESC
        """,
        params,
    )
    return [dict(row) for row in cursor.fetchall()]


def get_bottle(conn: sqlite3.Connection, bottle_id: int) -> dict | None:
    cursor = conn.execute(
        """
        SELECT id, name, empty_weight_g,
               created_at_utc, updated_at_utc, deleted_at_utc
        FROM bottles
        WHERE id = ?
        """,
        (bottle_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_bottle(conn: sqlite3.Connection, bottle_id: int, fields: dict) -> dict | None:
    assignments: list[str] = []
    values: list[object] = []
    for key in ("name", "empty_weight_g", "updated_at_utc", "deleted_at_utc"):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if not assignments:
        return get_bottle(conn, bottle_id)
    values.append(bottle_id)
    conn.execute(
        f"UPDATE bottles SET {', '.join(assignments)} WHERE id = ?",
        values,
    )
    conn.commit()
    return get_bottle(conn, bottle_id)


def delete_bottle(
    conn: sqlite3.Connection, bottle_id: int, deleted_at_utc: str, updated_at_utc: str
) -> bool:
    cursor = conn.execute(
        """
        UPDATE bottles
        SET deleted_at_utc = ?, updated_at_utc = ?
        WHERE id = ? AND deleted_at_utc IS NULL
        """,
        (deleted_at_utc, updated_at_utc, bottle_id),
    )
    conn.commit()
    return cursor.rowcount > 0
