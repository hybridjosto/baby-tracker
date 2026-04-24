from __future__ import annotations

import sqlite3
from datetime import datetime, timezone


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_push_subscriptions(conn: sqlite3.Connection | None) -> list[dict]:
    assert conn is not None
    rows = conn.execute(
        """
        SELECT id, user_slug, endpoint, p256dh, auth, user_agent,
               created_at_utc, updated_at_utc,
               last_notified_entry_id, last_notified_due_at_utc, last_sent_at_utc
        FROM push_subscriptions
        ORDER BY user_slug ASC
        """
    ).fetchall()
    return [dict(row) for row in rows]


def get_push_subscription(
    conn: sqlite3.Connection | None, user_slug: str
) -> dict | None:
    assert conn is not None
    row = conn.execute(
        """
        SELECT id, user_slug, endpoint, p256dh, auth, user_agent,
               created_at_utc, updated_at_utc,
               last_notified_entry_id, last_notified_due_at_utc, last_sent_at_utc
        FROM push_subscriptions
        WHERE user_slug = ?
        """,
        (user_slug,),
    ).fetchone()
    if not row:
        return None
    return dict(row)


def upsert_push_subscription(
    conn: sqlite3.Connection | None,
    *,
    user_slug: str,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str | None = None,
) -> dict:
    assert conn is not None
    existing = get_push_subscription(conn, user_slug)
    now = _now_utc_iso()
    conn.execute(
        "DELETE FROM push_subscriptions WHERE user_slug = ? OR endpoint = ?",
        (user_slug, endpoint),
    )
    created_at = existing["created_at_utc"] if existing else now
    last_notified_entry_id = existing["last_notified_entry_id"] if existing else None
    last_notified_due_at_utc = (
        existing["last_notified_due_at_utc"] if existing else None
    )
    last_sent_at_utc = existing["last_sent_at_utc"] if existing else None
    conn.execute(
        """
        INSERT INTO push_subscriptions (
            user_slug,
            endpoint,
            p256dh,
            auth,
            user_agent,
            created_at_utc,
            updated_at_utc,
            last_notified_entry_id,
            last_notified_due_at_utc,
            last_sent_at_utc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_slug,
            endpoint,
            p256dh,
            auth,
            user_agent,
            created_at,
            now,
            last_notified_entry_id,
            last_notified_due_at_utc,
            last_sent_at_utc,
        ),
    )
    conn.commit()
    return get_push_subscription(conn, user_slug) or {}


def delete_push_subscription(conn: sqlite3.Connection | None, user_slug: str) -> bool:
    assert conn is not None
    result = conn.execute(
        "DELETE FROM push_subscriptions WHERE user_slug = ?",
        (user_slug,),
    )
    conn.commit()
    return result.rowcount > 0


def update_push_subscription_delivery_state(
    conn: sqlite3.Connection | None,
    *,
    user_slug: str,
    last_notified_entry_id: int | None,
    last_notified_due_at_utc: str | None,
    last_sent_at_utc: str | None,
) -> dict | None:
    assert conn is not None
    now = _now_utc_iso()
    conn.execute(
        """
        UPDATE push_subscriptions
        SET last_notified_entry_id = ?,
            last_notified_due_at_utc = ?,
            last_sent_at_utc = ?,
            updated_at_utc = ?
        WHERE user_slug = ?
        """,
        (
            last_notified_entry_id,
            last_notified_due_at_utc,
            last_sent_at_utc,
            now,
            user_slug,
        ),
    )
    conn.commit()
    return get_push_subscription(conn, user_slug)
