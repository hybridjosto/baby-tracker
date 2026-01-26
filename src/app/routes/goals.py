from flask import Blueprint, current_app, jsonify, request

from src.app.services.feeding_goals import create_goal, get_current_goal, list_goals

goals_api = Blueprint("goals_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@goals_api.get("/feeding-goals")
def list_goals_route():
    limit = request.args.get("limit", default=20, type=int)
    try:
        goals = list_goals(_db_path(), limit=limit)
        return jsonify(goals)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@goals_api.get("/feeding-goals/current")
def current_goal_route():
    try:
        goal = get_current_goal(_db_path())
        return jsonify(goal)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@goals_api.post("/feeding-goals")
def create_goal_route():
    payload = request.get_json(silent=True) or {}
    try:
        goal = create_goal(_db_path(), payload)
        return jsonify(goal), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
