from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

import uuid

from src.app.services.entries import create_entry
from src.app.services.settings import get_settings
from src.lib.validation import normalize_user_slug

feed_api = Blueprint("feed_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


def _resolve_user_slug(raw: str | None) -> str:
    if raw:
        return normalize_user_slug(raw)
    settings = get_settings(_db_path())
    configured = settings.get("default_user_slug")
    if configured:
        return normalize_user_slug(configured)
    return "default"


def _extract_user_slug(payload: dict) -> str | None:
    user_slug = request.args.get("user_slug")
    if not user_slug:
        user_slug = payload.get("user_slug")
    return user_slug


@feed_api.post("/feed/log")
def log_feed_route():
    payload = request.get_json(silent=True) or {}
    amount = request.args.get("amount", type=float)
    if amount is None:
        try:
            amount = float(payload.get("amount")) if payload.get("amount") is not None else None
        except (TypeError, ValueError):
            amount = None
    user_slug = _extract_user_slug(payload)
    if amount is None:
        return jsonify({"error": "amount is required"}), 400

    try:
        resolved_slug = _resolve_user_slug(user_slug)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    payload = {
        "type": "feed",
        "client_event_id": f"pushcut-{uuid.uuid4().hex}",
        "user_slug": resolved_slug,
        "formula_ml": amount,
    }
    try:
        entry = create_entry(_db_path(), payload)
        return jsonify(entry), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


def _log_simple_event(event_type: str):
    payload = request.get_json(silent=True) or {}
    user_slug = _extract_user_slug(payload)
    notes = payload.get("notes")

    try:
        resolved_slug = _resolve_user_slug(user_slug)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    entry_payload: dict = {
        "type": event_type,
        "client_event_id": f"pushcut-{uuid.uuid4().hex}",
        "user_slug": resolved_slug,
    }
    if notes is not None:
        entry_payload["notes"] = notes

    try:
        entry = create_entry(_db_path(), entry_payload)
        return jsonify(entry), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@feed_api.post("/poo/log")
def log_poo_route():
    return _log_simple_event("poo")


@feed_api.post("/wee/log")
def log_wee_route():
    return _log_simple_event("wee")
