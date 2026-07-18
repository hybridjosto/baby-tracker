from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from src.app.services.push_subscriptions import (
    delete_push_subscription,
    get_push_subscription,
    save_push_subscription,
)
from src.lib.validation import normalize_user_slug

pushcut_api = Blueprint("push_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


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
