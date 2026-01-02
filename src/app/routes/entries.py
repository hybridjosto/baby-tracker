from flask import Blueprint, current_app, jsonify, request

from src.app.services.entries import (
    DuplicateEntryError,
    EntryNotFoundError,
    create_entry,
    delete_entry,
    list_entries,
    update_entry,
)

entries_api = Blueprint("entries_api", __name__, url_prefix="/api/entries")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@entries_api.get("")
def list_entries_route():
    limit = request.args.get("limit", default=50, type=int)
    entries = list_entries(_db_path(), limit=limit)
    return jsonify(entries)


@entries_api.post("")
def create_entry_route():
    payload = request.get_json(silent=True) or {}
    try:
        entry = create_entry(_db_path(), payload)
        return jsonify(entry), 201
    except DuplicateEntryError as exc:
        return jsonify({"error": "duplicate", "entry": exc.entry}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.patch("/<int:entry_id>")
def update_entry_route(entry_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        entry = update_entry(_db_path(), entry_id, payload)
        return jsonify(entry)
    except EntryNotFoundError:
        return jsonify({"error": "not_found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.delete("/<int:entry_id>")
def delete_entry_route(entry_id: int):
    try:
        delete_entry(_db_path(), entry_id)
        return ("", 204)
    except EntryNotFoundError:
        return jsonify({"error": "not_found"}), 404
