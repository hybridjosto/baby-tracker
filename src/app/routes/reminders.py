from flask import Blueprint, current_app, jsonify, request

from src.app.services.notifications import DiscordWebhookNotifier, NullNotifier
from src.app.services.reminders import (
    dispatch_threshold_reminders,
    get_reminders,
    update_reminder,
)
from src.app.services.settings import get_settings

reminders_api = Blueprint("reminders_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@reminders_api.get("/reminders")
def list_reminders_route():
    return jsonify(get_reminders(_db_path()))


@reminders_api.patch("/reminders/<int:reminder_id>")
def update_reminder_route(reminder_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        reminder = update_reminder(_db_path(), reminder_id, payload)
        return jsonify(reminder)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@reminders_api.post("/reminders/dispatch")
def dispatch_reminders_route():
    settings = get_settings(_db_path())
    webhook_url = settings.get("discord_webhook_url")
    if not webhook_url:
        return jsonify({"dispatched": 0, "skipped": "missing webhook"}), 200
    notifier = (
        NullNotifier()
        if current_app.config.get("TESTING")
        else DiscordWebhookNotifier(webhook_url)
    )
    dispatched = dispatch_threshold_reminders(_db_path(), notifier)
    return jsonify({"dispatched": len(dispatched)})
