from flask import Blueprint, current_app, jsonify, request

from src.app.services.bottles import (
    BottleNotFoundError,
    create_bottle,
    delete_bottle,
    list_bottles,
    update_bottle,
)

bottles_api = Blueprint("bottles_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@bottles_api.get("/bottles")
def list_bottles_route():
    try:
        bottles = list_bottles(_db_path())
        return jsonify(bottles)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@bottles_api.post("/bottles")
def create_bottle_route():
    payload = request.get_json(silent=True) or {}
    try:
        bottle = create_bottle(_db_path(), payload)
        return jsonify(bottle), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@bottles_api.patch("/bottles/<int:bottle_id>")
def update_bottle_route(bottle_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        bottle = update_bottle(_db_path(), bottle_id, payload)
        return jsonify(bottle)
    except BottleNotFoundError:
        return jsonify({"error": "not_found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@bottles_api.delete("/bottles/<int:bottle_id>")
def delete_bottle_route(bottle_id: int):
    try:
        delete_bottle(_db_path(), bottle_id)
        return ("", 204)
    except BottleNotFoundError:
        return jsonify({"error": "not_found"}), 404
