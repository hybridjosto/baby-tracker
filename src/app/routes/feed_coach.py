from flask import Blueprint, current_app, jsonify

from src.app.services.feed_coach import get_feed_coach

feed_coach_api = Blueprint("feed_coach_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@feed_coach_api.get("/feed-coach")
def get_feed_coach_route():
    return jsonify(get_feed_coach(_db_path()))
