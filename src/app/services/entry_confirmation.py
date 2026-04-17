from __future__ import annotations

from src.app.services.push_subscriptions import (
    SendPushFn,
    VapidConfig,
    build_push_payload,
    delete_push_subscription,
    get_push_subscription,
    send_web_push,
)


def dispatch_entry_confirmation_push(
    db_path: str,
    entry: dict,
    *,
    vapid_config: VapidConfig | None = None,
    base_path: str = "",
    send_fn: SendPushFn | None = None,
) -> dict:
    if vapid_config is None:
        return {"sent": False, "reason": "missing_vapid_config"}

    user_slug = entry.get("user_slug")
    if not isinstance(user_slug, str) or not user_slug:
        return {"sent": False, "reason": "missing_user_slug"}

    subscription = get_push_subscription(db_path, user_slug)
    if not subscription:
        return {"sent": False, "reason": "missing_subscription"}

    entry_type = str(entry.get("type") or "entry").strip() or "entry"
    payload = build_push_payload(
        title="Entry saved",
        body=f"{entry_type.capitalize()} logged for {user_slug}",
        url=f"{base_path}/{user_slug}",
        tag=f"entry-confirmation-{user_slug}",
    )
    sender = send_fn or send_web_push
    result = sender(subscription, payload, vapid_config)
    if result.get("sent"):
        return {"sent": True, "payload": payload, "user_slug": user_slug}
    if result.get("reason") == "invalid_subscription":
        delete_push_subscription(db_path, user_slug)
        return {"sent": False, "reason": "invalid_subscription", "user_slug": user_slug}
    return {
        "sent": False,
        "reason": result.get("reason", "push_failed"),
        "user_slug": user_slug,
    }
