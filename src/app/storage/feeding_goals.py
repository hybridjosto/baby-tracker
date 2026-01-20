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
