from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import time
import threading
from urllib import request as urllib_request

from flask import Flask
from typing import Callable

from src.app.services.entries import get_next_feed_time
from src.app.services.settings import get_settings
from src.app.storage.db import get_connection
from src.app.storage.settings import get_feed_due_state, update_feed_due_state

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_utc(value: str | None) -> datetime | None:
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    parsed = datetime.fromisoformat(cleaned)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _build_pushcut_payload(payload: dict | None = None) -> dict:
    if not payload:
        return {"title": "Feed due", "body": "Time for a feed.", "sound": "default", "badge": 1}
    title = payload.get("title")
    body = payload.get("body")
    if isinstance(title, str) and title.strip():
        title = title.strip()
    else:
        title = "Feed due"
    if isinstance(body, str) and body.strip():
        body = body.strip()
    else:
        body = "Time for a feed."
    return {"title": title, "body": body}


def _send_pushcut(pushcut_url: str, payload: dict) -> bool:
    data = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        pushcut_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=10):
            return True
    except Exception:
        logger.exception("Pushcut feed-due delivery failed")
        return False


def dispatch_feed_due(
    db_path: str,
    now_utc: datetime | None = None,
    send_fn: Callable[[str, dict], bool] | None = None,
) -> dict:
    settings = get_settings(db_path)
    pushcut_url = settings.get("pushcut_feed_due_url")
    if not pushcut_url:
        return {"sent": False, "reason": "missing_pushcut_url"}

    user_slug = settings.get("default_user_slug")
    next_feed = get_next_feed_time(db_path, user_slug=user_slug)
    next_timestamp = next_feed.get("timestamp_utc")
    source_entry_id = next_feed.get("source_entry_id")
    if not next_timestamp or not source_entry_id:
        return {"sent": False, "reason": "no_schedule"}

    due_at = _parse_utc(next_timestamp)
    if not due_at:
        return {"sent": False, "reason": "invalid_timestamp"}

    now = now_utc or _now_utc()
    if now < due_at:
        return {"sent": False, "reason": "not_due", "due_at_utc": due_at.isoformat()}

    with get_connection(db_path) as conn:
        state = get_feed_due_state(conn)
        if state.get("feed_due_last_entry_id") == source_entry_id:
            return {"sent": False, "reason": "already_sent"}

    payload = _build_pushcut_payload()
    sender = send_fn or _send_pushcut
    if not sender(pushcut_url, payload):
        return {"sent": False, "reason": "push_failed"}

    with get_connection(db_path) as conn:
        state = get_feed_due_state(conn)
        if state.get("feed_due_last_entry_id") == source_entry_id:
            return {"sent": False, "reason": "already_sent"}
        update_feed_due_state(conn, source_entry_id, now.isoformat())
    return {"sent": True, "payload": payload}


def start_feed_due_scheduler(app: Flask, poll_seconds: int) -> None:
    if poll_seconds <= 0:
        return

    def _loop() -> None:
        while True:
            try:
                with app.app_context():
                    dispatch_feed_due(app.config["DB_PATH"])
            except Exception:
                logger.exception("Feed due scheduler failed")
            time.sleep(poll_seconds)

    thread = threading.Thread(
        target=_loop,
        daemon=True,
        name="feed-due-scheduler",
    )
    thread.start()
    app.extensions["feed_due_scheduler"] = thread
