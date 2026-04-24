from __future__ import annotations

from datetime import datetime, timezone
import logging
import time
import threading

from flask import Flask

from src.app.services.entries import get_next_feed_time
from src.app.services.push_subscriptions import (
    SendPushFn,
    VapidConfig,
    build_push_payload,
    delete_push_subscription,
    list_push_subscriptions,
    mark_push_subscription_notified,
    send_web_push,
)

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


def dispatch_feed_due(
    db_path: str,
    vapid_config: VapidConfig | None = None,
    base_path: str = "",
    now_utc: datetime | None = None,
    send_fn: SendPushFn | None = None,
) -> dict:
    now = now_utc or _now_utc()
    if vapid_config is None:
        return {"sent": False, "reason": "missing_vapid_config"}

    subscriptions = list_push_subscriptions(db_path)
    if not subscriptions:
        return {"sent": False, "reason": "missing_subscription"}

    sender = send_fn or send_web_push
    sent_users: list[str] = []
    invalid_users: list[str] = []
    due_users: list[str] = []

    for subscription in subscriptions:
        user_slug = subscription.get("user_slug")
        if not user_slug:
            continue
        next_feed = get_next_feed_time(db_path, user_slug=user_slug)
        next_timestamp = next_feed.get("timestamp_utc")
        source_entry_id = next_feed.get("source_entry_id")
        if not next_timestamp or not source_entry_id:
            continue
        due_at = _parse_utc(next_timestamp)
        if not due_at or now < due_at:
            continue
        due_users.append(user_slug)
        if (
            subscription.get("last_notified_entry_id") == source_entry_id
            and subscription.get("last_notified_due_at_utc") == next_timestamp
        ):
            continue
        payload = build_push_payload(
            title="Feed due",
            body="Time for a feed.",
            url=f"{base_path}/{user_slug}" if user_slug else f"{base_path}/",
            tag=f"feed-due-{user_slug}",
        )
        result = sender(subscription, payload, vapid_config)
        if result.get("sent"):
            mark_push_subscription_notified(
                db_path,
                user_slug=user_slug,
                last_notified_entry_id=source_entry_id,
                last_notified_due_at_utc=next_timestamp,
                last_sent_at_utc=now.isoformat(),
            )
            sent_users.append(user_slug)
            continue
        reason = result.get("reason")
        if reason == "invalid_subscription":
            delete_push_subscription(db_path, user_slug)
            invalid_users.append(user_slug)

    if sent_users:
        return {"sent": True, "users": sent_users}
    if invalid_users:
        return {"sent": False, "reason": "invalid_subscription", "users": invalid_users}
    if due_users:
        return {"sent": False, "reason": "already_sent", "users": due_users}
    return {"sent": False, "reason": "not_due"}


def start_feed_due_scheduler(app: Flask, poll_seconds: int) -> None:
    if poll_seconds <= 0:
        return

    def _loop() -> None:
        while True:
            try:
                with app.app_context():
                    dispatch_feed_due(
                        app.config["DB_PATH"],
                        vapid_config=app.config.get("VAPID_CONFIG"),
                        base_path=app.config.get("BASE_PATH", ""),
                    )
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
