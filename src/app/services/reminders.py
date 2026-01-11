from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.app.services.notifications import Notifier
from src.app.storage.db import get_connection
from src.app.storage.reminders import get_due_reminders, mark_reminder_sent


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(value: datetime) -> str:
    return value.isoformat()


def dispatch_due_reminders(
    db_path: str, notifier: Notifier, now_utc: datetime | None = None
) -> list[dict]:
    now = now_utc or _now_utc()
    now_iso = _to_iso(now)
    dispatched: list[dict] = []
    with get_connection(db_path) as conn:
        due = get_due_reminders(conn, now_iso)
        for reminder in due:
            notifier.send(reminder["message"])
            next_due = now + timedelta(minutes=reminder["interval_min"])
            mark_reminder_sent(conn, reminder["id"], now_iso, _to_iso(next_due))
            dispatched.append(reminder)
    return dispatched
