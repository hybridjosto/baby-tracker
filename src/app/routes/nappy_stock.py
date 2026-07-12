from flask import Blueprint, current_app, jsonify, request

from src.app.services.nappy_stock import (
    adjust_nappy_stock_remaining,
    create_nappy_stock_batch,
    get_nappy_stock_status,
    update_latest_nappy_stock_batch,
)

nappy_stock_api = Blueprint("nappy_stock_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@nappy_stock_api.get("/nappy-stock")
def get_nappy_stock_status_route():
    limit = request.args.get("history_limit", default=10, type=int)
    try:
        return jsonify(get_nappy_stock_status(_db_path(), history_limit=limit))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@nappy_stock_api.post("/nappy-stock")
def create_nappy_stock_batch_route():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(create_nappy_stock_batch(_db_path(), payload)), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@nappy_stock_api.patch("/nappy-stock/latest")
def update_latest_nappy_stock_batch_route():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(update_latest_nappy_stock_batch(_db_path(), payload))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@nappy_stock_api.post("/nappy-stock/adjust")
def adjust_nappy_stock_remaining_route():
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify(adjust_nappy_stock_remaining(_db_path(), payload))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
