from __future__ import annotations

from datetime import datetime, timedelta, timezone
import sqlite3


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(value: datetime) -> str:
    return value.isoformat()


def create_reminder(
    conn: sqlite3.Connection,
    name: str,
    kind: str,
    interval_min: int,
    message: str,
    active: bool = True,
    now_utc: datetime | None = None,
    next_due_at_utc: str | None = None,
    last_sent_at_utc: str | None = None,
) -> dict:
    if interval_min <= 0:
        raise ValueError("interval_min must be a positive integer")
    now = now_utc or _now_utc()
    next_due = next_due_at_utc or _to_iso(now + timedelta(minutes=interval_min))
    created_at = _to_iso(now)
    conn.execute(
        """
        INSERT INTO reminders (
            name,
            kind,
            interval_min,
            message,
            active,
            last_sent_at_utc,
            next_due_at_utc,
            created_at_utc,
            updated_at_utc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            kind,
            interval_min,
            message,
            1 if active else 0,
            last_sent_at_utc,
            next_due,
            created_at,
            created_at,
        ),
    )
    conn.commit()
    row = conn.execute(
        """
        SELECT id, name, kind, interval_min, message, active, last_sent_at_utc,
               next_due_at_utc, created_at_utc, updated_at_utc
        FROM reminders
        WHERE id = last_insert_rowid()
        """
    ).fetchone()
    return dict(row)


def get_due_reminders(conn: sqlite3.Connection, now_utc_iso: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, name, kind, interval_min, message, active, last_sent_at_utc,
               next_due_at_utc, created_at_utc, updated_at_utc
        FROM reminders
        WHERE active = 1 AND next_due_at_utc <= ?
        ORDER BY next_due_at_utc ASC
        """,
        (now_utc_iso,),
    ).fetchall()
    return [dict(row) for row in rows]


def mark_reminder_sent(
    conn: sqlite3.Connection,
    reminder_id: int,
    sent_at_utc_iso: str,
    next_due_at_utc: str,
) -> None:
    conn.execute(
        """
        UPDATE reminders
        SET last_sent_at_utc = ?,
            next_due_at_utc = ?,
            updated_at_utc = ?
        WHERE id = ?
        """,
        (sent_at_utc_iso, next_due_at_utc, sent_at_utc_iso, reminder_id),
    )
    conn.commit()


def list_reminders(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT id, name, kind, interval_min, message, active, last_sent_at_utc,
               next_due_at_utc, created_at_utc, updated_at_utc
        FROM reminders
        ORDER BY id ASC
        """
    ).fetchall()
    return [dict(row) for row in rows]
