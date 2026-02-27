import sqlite3

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection, next_counter


def _bottles_col():
    return collection("bottles")


def _has_user_slug_column(conn: sqlite3.Connection) -> bool:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(bottles)").fetchall()
    }
    return "user_slug" in columns


def _doc_to_bottle(doc) -> dict:
    data = doc.to_dict() or {}
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "empty_weight_g": data.get("empty_weight_g"),
        "created_at_utc": data.get("created_at_utc"),
        "updated_at_utc": data.get("updated_at_utc"),
        "deleted_at_utc": data.get("deleted_at_utc"),
    }


def _firestore_get_bottle(bottle_id: int) -> dict | None:
    snap = _bottles_col().document(str(bottle_id)).get()
    if not snap.exists:
        return None
    return _doc_to_bottle(snap)


def _firestore_list_bottles(include_deleted: bool = False) -> list[dict]:
    query = _bottles_col()
    if not include_deleted:
        query = query.where("deleted_at_utc", "==", None)
    docs = query.order_by("updated_at_utc", direction="DESCENDING").stream()
    return [_doc_to_bottle(doc) for doc in docs]


def _firestore_create_bottle(payload: dict, preserve_id: int | None = None) -> dict:
    bottle_id = preserve_id if preserve_id is not None else next_counter("bottle_id")
    record = {
        "id": bottle_id,
        "name": payload["name"],
        "empty_weight_g": payload["empty_weight_g"],
        "created_at_utc": payload["created_at_utc"],
        "updated_at_utc": payload["updated_at_utc"],
        "deleted_at_utc": payload.get("deleted_at_utc"),
    }
    _bottles_col().document(str(bottle_id)).set(record)
    return record


def create_bottle(conn: sqlite3.Connection | None, payload: dict) -> dict:
    if is_firestore_backend():
        return _firestore_create_bottle(payload)

    assert conn is not None
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
    bottle = get_bottle(conn, cursor.lastrowid)
    if is_dual_backend() and bottle:
        _firestore_create_bottle(bottle, preserve_id=bottle["id"])
    return bottle


def list_bottles(conn: sqlite3.Connection | None, include_deleted: bool = False) -> list[dict]:
    if is_firestore_backend():
        return _firestore_list_bottles(include_deleted=include_deleted)

    assert conn is not None
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


def get_bottle(conn: sqlite3.Connection | None, bottle_id: int) -> dict | None:
    if is_firestore_backend():
        return _firestore_get_bottle(bottle_id)

    assert conn is not None
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


def update_bottle(conn: sqlite3.Connection | None, bottle_id: int, fields: dict) -> dict | None:
    if is_firestore_backend():
        current = _firestore_get_bottle(bottle_id)
        if not current:
            return None
        _bottles_col().document(str(bottle_id)).set(fields, merge=True)
        return _firestore_get_bottle(bottle_id)

    assert conn is not None
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
    bottle = get_bottle(conn, bottle_id)
    if is_dual_backend() and bottle:
        _bottles_col().document(str(bottle_id)).set(bottle, merge=True)
    return bottle


def delete_bottle(
    conn: sqlite3.Connection | None, bottle_id: int, deleted_at_utc: str, updated_at_utc: str
) -> bool:
    if is_firestore_backend():
        current = _firestore_get_bottle(bottle_id)
        if not current or current.get("deleted_at_utc"):
            return False
        _bottles_col().document(str(bottle_id)).set(
            {"deleted_at_utc": deleted_at_utc, "updated_at_utc": updated_at_utc},
            merge=True,
        )
        return True

    assert conn is not None
    cursor = conn.execute(
        """
        UPDATE bottles
        SET deleted_at_utc = ?, updated_at_utc = ?
        WHERE id = ? AND deleted_at_utc IS NULL
        """,
        (deleted_at_utc, updated_at_utc, bottle_id),
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    if deleted and is_dual_backend():
        bottle = get_bottle(conn, bottle_id)
        if bottle:
            _bottles_col().document(str(bottle_id)).set(bottle, merge=True)
    return deleted
