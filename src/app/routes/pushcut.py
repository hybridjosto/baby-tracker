from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from src.app.services.feed_due import dispatch_feed_due
from src.app.services.push_subscriptions import (
    build_push_payload,
    delete_push_subscription,
    get_push_subscription,
    save_push_subscription,
    send_web_push,
)
from src.lib.validation import normalize_user_slug

pushcut_api = Blueprint("push_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


def _base_path() -> str:
    return current_app.config.get("BASE_PATH", "")


def _vapid_config():
    return current_app.config.get("VAPID_CONFIG")


def _get_user_slug(payload: dict | None = None) -> str:
    raw: str | None = None
    if payload:
        candidate = payload.get("user_slug")
        if isinstance(candidate, str):
            raw = candidate
    if raw is None:
        raw = request.args.get("user_slug")
    if raw is None:
        raise ValueError("user_slug is required")
    return normalize_user_slug(raw)


@pushcut_api.get("/push/vapid-public-key")
def push_vapid_public_key_route():
    config = _vapid_config()
    if not config:
        return jsonify({"error": "vapid_not_configured"}), 404
    return jsonify({"public_key": config.public_key})


@pushcut_api.get("/push/subscription")
def get_push_subscription_route():
    config = _vapid_config()
    try:
        user_slug = _get_user_slug()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    subscription = get_push_subscription(_db_path(), user_slug)
    if not subscription:
        return jsonify(
            {"configured": bool(config), "enabled": False, "user_slug": user_slug}
        )
    return jsonify(
        {
            "configured": bool(config),
            "enabled": True,
            "user_slug": user_slug,
            "endpoint": subscription.get("endpoint"),
            "updated_at_utc": subscription.get("updated_at_utc"),
        }
    )


@pushcut_api.post("/push/subscription")
def save_push_subscription_route():
    payload = request.get_json(silent=True) or {}
    try:
        config = _vapid_config()
        if not config:
            return jsonify({"error": "vapid_not_configured"}), 503
        user_slug = _get_user_slug(payload)
        subscription_payload = payload.get("subscription")
        if not isinstance(subscription_payload, dict):
            raise ValueError("subscription is required")
        subscription = save_push_subscription(
            _db_path(),
            user_slug=user_slug,
            subscription=subscription_payload,
            user_agent=request.headers.get("User-Agent"),
        )
        dispatch_feed_due(
            _db_path(),
            vapid_config=config,
            base_path=_base_path(),
        )
        return jsonify(
            {
                "enabled": True,
                "user_slug": user_slug,
                "endpoint": subscription.get("endpoint"),
                "updated_at_utc": subscription.get("updated_at_utc"),
            }
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@pushcut_api.delete("/push/subscription")
def delete_push_subscription_route():
    payload = request.get_json(silent=True) or {}
    try:
        user_slug = _get_user_slug(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    deleted = delete_push_subscription(_db_path(), user_slug)
    return jsonify(
        {
            "configured": bool(_vapid_config()),
            "enabled": False,
            "deleted": deleted,
            "user_slug": user_slug,
        }
    )


@pushcut_api.post("/push/feed-due")
def push_feed_due_route():
    payload = request.get_json(silent=True) or {}
    try:
        config = _vapid_config()
        if not config:
            return jsonify({"error": "vapid_not_configured"}), 503
        user_slug = _get_user_slug(payload)
        subscription = get_push_subscription(_db_path(), user_slug)
        if not subscription:
            return jsonify({"error": "push_subscription_not_configured"}), 400
        outbound = build_push_payload(
            title=str(payload.get("title") or "Feed due (test)"),
            body=str(
                payload.get("body") or "This is a test notification from Baby Tracker."
            ),
            url=f"{_base_path()}/{user_slug}",
            tag=f"feed-due-{user_slug}",
        )
        result = send_web_push(subscription, outbound, config)
        if result.get("sent"):
            return jsonify({"sent": True, "payload": outbound})
        if result.get("reason") == "invalid_subscription":
            delete_push_subscription(_db_path(), user_slug)
            return jsonify({"sent": False, "error": "invalid_subscription"}), 410
        return jsonify(
            {"sent": False, "error": result.get("reason", "push_failed")}
        ), 502
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
