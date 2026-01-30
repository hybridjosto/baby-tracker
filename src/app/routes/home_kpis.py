from flask import Blueprint, current_app, jsonify, request

from src.app.services.home_kpis import build_home_kpis
from src.lib.validation import normalize_user_slug

home_kpis_api = Blueprint("home_kpis_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@home_kpis_api.get("/home-kpis")
def get_home_kpis_route():
    raw_slug = request.args.get("user_slug")
    try:
        user_slug = normalize_user_slug(raw_slug) if raw_slug else None
        payload = build_home_kpis(_db_path(), user_slug=user_slug)
        return jsonify(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
