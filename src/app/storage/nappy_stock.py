import sqlite3


def get_nappy_stock_threshold(conn: sqlite3.Connection | None) -> int:
    assert conn is not None
    row = conn.execute(
        """
        SELECT nappy_stock_threshold_count
        FROM baby_settings
        WHERE id = 1
        """
    ).fetchone()
    return int(row["nappy_stock_threshold_count"] if row else 0)


def update_nappy_stock_threshold(
    conn: sqlite3.Connection | None, threshold_count: int, updated_at_utc: str
) -> None:
    assert conn is not None
    conn.execute(
        """
        UPDATE baby_settings
        SET nappy_stock_threshold_count = ?, updated_at_utc = ?
        WHERE id = 1
        """,
        (threshold_count, updated_at_utc),
    )
    conn.commit()


def create_nappy_stock_batch(conn: sqlite3.Connection | None, payload: dict) -> dict:
    assert conn is not None
    cursor = conn.execute(
        """
        INSERT INTO nappy_stock_batches (
            total_count,
            threshold_count,
            stock_added_at_utc,
            notes,
            created_at_utc,
            updated_at_utc
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            payload["total_count"],
            payload["threshold_count"],
            payload["stock_added_at_utc"],
            payload.get("notes"),
            payload["created_at_utc"],
            payload["updated_at_utc"],
        ),
    )
    conn.commit()
    return get_nappy_stock_batch(conn, cursor.lastrowid)


def get_latest_nappy_stock_batch(conn: sqlite3.Connection | None) -> dict | None:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, total_count, threshold_count, stock_added_at_utc, notes,
               created_at_utc, updated_at_utc
        FROM nappy_stock_batches
        ORDER BY datetime(stock_added_at_utc) DESC, id DESC
        LIMIT 1
        """
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def get_nappy_stock_batch(
    conn: sqlite3.Connection | None, batch_id: int
) -> dict | None:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, total_count, threshold_count, stock_added_at_utc, notes,
               created_at_utc, updated_at_utc
        FROM nappy_stock_batches
        WHERE id = ?
        """,
        (batch_id,),
    )
    row = cursor.fetchone()
    return dict(row) if row else None


def list_nappy_stock_batches(
    conn: sqlite3.Connection | None, limit: int = 10
) -> list[dict]:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT id, total_count, threshold_count, stock_added_at_utc, notes,
               created_at_utc, updated_at_utc
        FROM nappy_stock_batches
        ORDER BY datetime(stock_added_at_utc) DESC, id DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(row) for row in cursor.fetchall()]


def update_nappy_stock_batch(
    conn: sqlite3.Connection | None, batch_id: int, fields: dict
) -> dict | None:
    assert conn is not None
    assignments: list[str] = []
    values: list[object] = []
    for key in (
        "total_count",
        "threshold_count",
        "stock_added_at_utc",
        "notes",
        "updated_at_utc",
    ):
        if key in fields:
            assignments.append(f"{key} = ?")
            values.append(fields[key])
    if not assignments:
        return get_nappy_stock_batch(conn, batch_id)
    values.append(batch_id)
    conn.execute(
        f"UPDATE nappy_stock_batches SET {', '.join(assignments)} WHERE id = ?",
        values,
    )
    conn.commit()
    return get_nappy_stock_batch(conn, batch_id)


def count_nappy_changes_since(
    conn: sqlite3.Connection | None, since_utc: str
) -> int:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM entries
        WHERE type IN ('wee', 'poo')
          AND deleted_at_utc IS NULL
          AND datetime(timestamp_utc) >= datetime(?)
        """,
        (since_utc,),
    )
    row = cursor.fetchone()
    return int(row["count"] if row else 0)


def count_nappy_changes_between(
    conn: sqlite3.Connection | None, since_utc: str, before_utc: str
) -> int:
    assert conn is not None
    cursor = conn.execute(
        """
        SELECT COUNT(*) AS count
        FROM entries
        WHERE type IN ('wee', 'poo')
          AND deleted_at_utc IS NULL
          AND datetime(timestamp_utc) >= datetime(?)
          AND datetime(timestamp_utc) < datetime(?)
        """,
        (since_utc, before_utc),
    )
    row = cursor.fetchone()
    return int(row["count"] if row else 0)
