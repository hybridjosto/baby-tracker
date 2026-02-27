from __future__ import annotations

from datetime import datetime, timedelta, timezone
import sqlite3

from src.app.storage.backend import is_dual_backend, is_firestore_backend
from src.app.storage.firestore_client import collection, next_counter


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(value: datetime) -> str:
    return value.isoformat()


def _reminders_col():
    return collection("reminders")


def _doc_to_reminder(doc) -> dict:
    data = doc.to_dict() or {}
    return {
        "id": data.get("id"),
        "name": data.get("name"),
        "kind": data.get("kind"),
        "interval_min": data.get("interval_min"),
        "message": data.get("message"),
        "active": data.get("active"),
        "last_sent_at_utc": data.get("last_sent_at_utc"),
        "next_due_at_utc": data.get("next_due_at_utc"),
        "created_at_utc": data.get("created_at_utc"),
        "updated_at_utc": data.get("updated_at_utc"),
    }


def create_reminder(
    conn: sqlite3.Connection | None,
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

    if is_firestore_backend():
        reminder_id = next_counter("reminder_id")
        record = {
            "id": reminder_id,
            "name": name,
            "kind": kind,
            "interval_min": interval_min,
            "message": message,
            "active": 1 if active else 0,
            "last_sent_at_utc": last_sent_at_utc,
            "next_due_at_utc": next_due,
            "created_at_utc": created_at,
            "updated_at_utc": created_at,
        }
        _reminders_col().document(str(reminder_id)).set(record)
        return record

    assert conn is not None
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
    reminder = dict(row)
    if is_dual_backend():
        _reminders_col().document(str(reminder["id"])).set(reminder)
    return reminder


def get_due_reminders(conn: sqlite3.Connection | None, now_utc_iso: str) -> list[dict]:
    if is_firestore_backend():
        docs = (
            _reminders_col()
            .where("active", "==", 1)
            .where("next_due_at_utc", "<=", now_utc_iso)
            .order_by("next_due_at_utc", direction="ASCENDING")
            .stream()
        )
        return [_doc_to_reminder(doc) for doc in docs]

    assert conn is not None
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
    conn: sqlite3.Connection | None,
    reminder_id: int,
    sent_at_utc_iso: str,
    next_due_at_utc: str,
) -> None:
    if is_firestore_backend():
        _reminders_col().document(str(reminder_id)).set(
            {
                "last_sent_at_utc": sent_at_utc_iso,
                "next_due_at_utc": next_due_at_utc,
                "updated_at_utc": sent_at_utc_iso,
            },
            merge=True,
        )
        return

    assert conn is not None
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
    if is_dual_backend():
        _reminders_col().document(str(reminder_id)).set(
            {
                "last_sent_at_utc": sent_at_utc_iso,
                "next_due_at_utc": next_due_at_utc,
                "updated_at_utc": sent_at_utc_iso,
            },
            merge=True,
        )


def list_reminders(conn: sqlite3.Connection | None) -> list[dict]:
    if is_firestore_backend():
        docs = _reminders_col().order_by("id", direction="ASCENDING").stream()
        return [_doc_to_reminder(doc) for doc in docs]

    assert conn is not None
    rows = conn.execute(
        """
        SELECT id, name, kind, interval_min, message, active, last_sent_at_utc,
               next_due_at_utc, created_at_utc, updated_at_utc
        FROM reminders
        ORDER BY id ASC
        """
    ).fetchall()
    return [dict(row) for row in rows]
