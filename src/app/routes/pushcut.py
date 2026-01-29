from __future__ import annotations

import json
import logging
from urllib import request as urllib_request

from flask import Blueprint, current_app, jsonify, request

from src.app.services.settings import get_settings

pushcut_api = Blueprint("pushcut_api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)


def _db_path() -> str:
    return current_app.config["DB_PATH"]


def _build_pushcut_payload(payload: dict | None) -> dict:
    if not payload:
        return {"title": "Feed due", "body": "Time for a feed."}
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


@pushcut_api.post("/push/feed-due")
def push_feed_due_route():
    settings = get_settings(_db_path())
    pushcut_url = settings.get("pushcut_feed_due_url")
    if not pushcut_url:
        return jsonify({"error": "pushcut_feed_due_url not configured"}), 400

    payload = request.get_json(silent=True) or {}
    outbound = _build_pushcut_payload(payload)
    data = json.dumps(outbound).encode("utf-8")
    req = urllib_request.Request(
        pushcut_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib_request.urlopen(req, timeout=10):
            return jsonify({"sent": True, "payload": outbound})
    except Exception:
        logger.exception("Pushcut feed-due delivery failed")
        return jsonify({"sent": False, "error": "push_failed"}), 502
