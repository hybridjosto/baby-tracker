from flask import Blueprint, current_app, jsonify

from src.app.services.home_kpis import build_home_kpis

home_kpis_api = Blueprint("home_kpis_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@home_kpis_api.get("/home-kpis")
def get_home_kpis_route():
    try:
        payload = build_home_kpis(_db_path(), user_slug=None)
        return jsonify(payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
