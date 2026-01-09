from flask import Blueprint, current_app, jsonify, request

from src.app.services.settings import get_settings, update_settings

settings_api = Blueprint("settings_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@settings_api.get("/settings")
def get_settings_route():
    return jsonify(get_settings(_db_path()))


@settings_api.patch("/settings")
def update_settings_route():
    payload = request.get_json(silent=True) or {}
    try:
        settings = update_settings(_db_path(), payload)
        return jsonify(settings)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
