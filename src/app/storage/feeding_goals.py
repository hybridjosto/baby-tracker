import sqlite3


def create_goal(conn: sqlite3.Connection, payload: dict) -> dict:
    cursor = conn.execute(
        """
        INSERT INTO feeding_goals (goal_ml, start_date, created_at_utc)
        VALUES (?, ?, ?)
        """,
        (payload["goal_ml"], payload["start_date"], payload["created_at_utc"]),
    )
    conn.commit()
    goal_id = cursor.lastrowid
    return get_goal(conn, goal_id)


def list_goals(conn: sqlite3.Connection, limit: int = 50) -> list[dict]:
    cursor = conn.execute(
        """
        SELECT id, goal_ml, start_date, created_at_utc
        FROM feeding_goals
        ORDER BY start_date DESC, created_at_utc DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(row) for row in cursor.fetchall()]


def get_current_goal(conn: sqlite3.Connection) -> dict | None:
    cursor = conn.execute(
        """
        SELECT id, goal_ml, start_date, created_at_utc
        FROM current_goal
        """
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_goal(conn: sqlite3.Connection, goal_id: int) -> dict | None:
    cursor = conn.execute(
        """
        SELECT id, goal_ml, start_date, created_at_utc
        FROM feeding_goals
        WHERE id = ?
        """,
        (goal_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def update_goal(conn: sqlite3.Connection, goal_id: int, fields: dict) -> dict | None:
    assignments: list[str] = []
    values: list[object] = []
    for key in ("goal_ml", "start_date"):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if not assignments:
        return get_goal(conn, goal_id)
    values.append(goal_id)
    conn.execute(
        f"UPDATE feeding_goals SET {', '.join(assignments)} WHERE id = ?",
        values,
    )
    conn.commit()
    return get_goal(conn, goal_id)


def delete_goal(conn: sqlite3.Connection, goal_id: int) -> bool:
    cursor = conn.execute(
        """
        DELETE FROM feeding_goals
        WHERE id = ?
        """,
        (goal_id,),
    )
    conn.commit()
    return cursor.rowcount > 0
