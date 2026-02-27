import sqlite3

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection, next_counter


def _goals_col():
    return collection("feeding_goals")


def _doc_to_goal(doc) -> dict:
    data = doc.to_dict() or {}
    return {
        "id": data.get("id"),
        "goal_ml": data.get("goal_ml"),
        "start_date": data.get("start_date"),
        "created_at_utc": data.get("created_at_utc"),
    }


def _firestore_get_goal(goal_id: int) -> dict | None:
    snap = _goals_col().document(str(goal_id)).get()
    if not snap.exists:
        return None
    return _doc_to_goal(snap)


def create_goal(conn: sqlite3.Connection | None, payload: dict) -> dict:
    if is_firestore_backend():
        goal_id = next_counter("goal_id")
        record = {
            "id": goal_id,
            "goal_ml": payload["goal_ml"],
            "start_date": payload["start_date"],
            "created_at_utc": payload["created_at_utc"],
        }
        _goals_col().document(str(goal_id)).set(record)
        return record

    assert conn is not None
    cursor = conn.execute(
        """
        INSERT INTO feeding_goals (goal_ml, start_date, created_at_utc)
        VALUES (?, ?, ?)
        """,
        (payload["goal_ml"], payload["start_date"], payload["created_at_utc"]),
    )
    conn.commit()
    goal_id = cursor.lastrowid
    goal = get_goal(conn, goal_id)
    if is_dual_backend() and goal:
        _goals_col().document(str(goal_id)).set(goal)
    return goal


def list_goals(conn: sqlite3.Connection | None, limit: int = 50) -> list[dict]:
    if is_firestore_backend():
        docs = (
            _goals_col()
            .order_by("start_date", direction="DESCENDING")
            .order_by("created_at_utc", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [_doc_to_goal(doc) for doc in docs]

    assert conn is not None
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


def get_current_goal(conn: sqlite3.Connection | None) -> dict | None:
    if is_firestore_backend():
        docs = (
            _goals_col()
            .order_by("created_at_utc", direction="DESCENDING")
            .order_by("id", direction="DESCENDING")
            .limit(1)
            .stream()
        )
        for doc in docs:
            return _doc_to_goal(doc)
        return None

    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, goal_ml, start_date, created_at_utc
        FROM current_goal
        """
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_goal(conn: sqlite3.Connection | None, goal_id: int) -> dict | None:
    if is_firestore_backend():
        return _firestore_get_goal(goal_id)

    assert conn is not None
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


def update_goal(conn: sqlite3.Connection | None, goal_id: int, fields: dict) -> dict | None:
    if is_firestore_backend():
        current = _firestore_get_goal(goal_id)
        if not current:
            return None
        _goals_col().document(str(goal_id)).set(fields, merge=True)
        return _firestore_get_goal(goal_id)

    assert conn is not None
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
    goal = get_goal(conn, goal_id)
    if is_dual_backend() and goal:
        _goals_col().document(str(goal_id)).set(goal, merge=True)
    return goal


def delete_goal(conn: sqlite3.Connection | None, goal_id: int) -> bool:
    if is_firestore_backend():
        current = _firestore_get_goal(goal_id)
        if not current:
            return False
        _goals_col().document(str(goal_id)).delete()
        return True

    assert conn is not None
    cursor = conn.execute(
        """
        DELETE FROM feeding_goals
        WHERE id = ?
        """,
        (goal_id,),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    if deleted and is_dual_backend():
        _goals_col().document(str(goal_id)).delete()
    return deleted
