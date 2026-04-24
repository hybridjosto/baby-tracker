from __future__ import annotations

from dataclasses import dataclass
import importlib
import json
from typing import Callable

from src.app.storage.db import get_connection
from src.app.storage.push_subscriptions import (
    delete_push_subscription as repo_delete_push_subscription,
    get_push_subscription as repo_get_push_subscription,
    list_push_subscriptions as repo_list_push_subscriptions,
    upsert_push_subscription as repo_upsert_push_subscription,
    update_push_subscription_delivery_state,
)
from src.lib.validation import normalize_user_slug


@dataclass(frozen=True)
class VapidConfig:
    public_key: str
    private_key: str
    subject: str


def build_vapid_config(
    public_key: str | None,
    private_key: str | None,
    subject: str | None,
) -> VapidConfig | None:
    if not public_key or not private_key or not subject:
        return None
    return VapidConfig(
        public_key=public_key,
        private_key=private_key,
        subject=subject,
    )


def _normalize_subscription_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("subscription is required")
    endpoint = payload.get("endpoint")
    if not isinstance(endpoint, str) or not endpoint.strip():
        raise ValueError("subscription.endpoint is required")
    keys = payload.get("keys")
    if not isinstance(keys, dict):
        raise ValueError("subscription.keys is required")
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not isinstance(p256dh, str) or not p256dh.strip():
        raise ValueError("subscription.keys.p256dh is required")
    if not isinstance(auth, str) or not auth.strip():
        raise ValueError("subscription.keys.auth is required")
    return {
        "endpoint": endpoint.strip(),
        "keys": {
            "p256dh": p256dh.strip(),
            "auth": auth.strip(),
        },
    }


def list_push_subscriptions(db_path: str) -> list[dict]:
    with get_connection(db_path) as conn:
        return repo_list_push_subscriptions(conn)


def get_push_subscription(db_path: str, user_slug: str) -> dict | None:
    normalized = normalize_user_slug(user_slug)
    with get_connection(db_path) as conn:
        return repo_get_push_subscription(conn, normalized)


def save_push_subscription(
    db_path: str,
    *,
    user_slug: str,
    subscription: dict,
    user_agent: str | None = None,
) -> dict:
    normalized_user = normalize_user_slug(user_slug)
    normalized_subscription = _normalize_subscription_payload(subscription)
    with get_connection(db_path) as conn:
        return repo_upsert_push_subscription(
            conn,
            user_slug=normalized_user,
            endpoint=normalized_subscription["endpoint"],
            p256dh=normalized_subscription["keys"]["p256dh"],
            auth=normalized_subscription["keys"]["auth"],
            user_agent=user_agent,
        )


def delete_push_subscription(db_path: str, user_slug: str) -> bool:
    normalized = normalize_user_slug(user_slug)
    with get_connection(db_path) as conn:
        return repo_delete_push_subscription(conn, normalized)


def mark_push_subscription_notified(
    db_path: str,
    *,
    user_slug: str,
    last_notified_entry_id: int | None,
    last_notified_due_at_utc: str | None,
    last_sent_at_utc: str | None,
) -> dict | None:
    normalized = normalize_user_slug(user_slug)
    with get_connection(db_path) as conn:
        return update_push_subscription_delivery_state(
            conn,
            user_slug=normalized,
            last_notified_entry_id=last_notified_entry_id,
            last_notified_due_at_utc=last_notified_due_at_utc,
            last_sent_at_utc=last_sent_at_utc,
        )


def build_push_payload(
    *,
    title: str,
    body: str,
    url: str,
    tag: str,
) -> dict:
    return {
        "title": title.strip() or "Feed due",
        "body": body.strip() or "Time for a feed.",
        "url": url,
        "tag": tag,
    }


def send_web_push(subscription: dict, payload: dict, vapid_config: VapidConfig) -> dict:
    try:
        pywebpush = importlib.import_module("pywebpush")
    except ImportError as exc:
        raise RuntimeError(
            "pywebpush is required for native push notifications"
        ) from exc

    webpush = pywebpush.webpush
    webpush_exception = pywebpush.WebPushException

    try:
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": {
                    "p256dh": subscription["p256dh"],
                    "auth": subscription["auth"],
                },
            },
            data=json.dumps(payload),
            vapid_private_key=vapid_config.private_key,
            vapid_claims={"sub": vapid_config.subject},
        )
        return {"sent": True}
    except webpush_exception as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        if status_code in {404, 410}:
            return {"sent": False, "reason": "invalid_subscription"}
        return {"sent": False, "reason": "push_failed"}


SendPushFn = Callable[[dict, dict, VapidConfig], dict]
