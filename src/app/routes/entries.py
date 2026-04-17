from flask import Blueprint, current_app, jsonify, request, Response

from src.app.services.entries import (
    DuplicateEntryError,
    EntryNotFoundError,
    create_entry,
    delete_entry,
    export_entries_csv,
    get_entry_summary,
    get_next_feed_schedule,
    import_entries_csv,
    list_feed_amount_entries,
    list_entries,
    sync_entries,
    update_entry,
)
from src.app.services.entry_confirmation import dispatch_entry_confirmation_push
from src.app.services.webhooks import send_entry_webhook
from src.app.services.home_kpis import dispatch_home_kpis
from src.app.services.llm_summary import LlmSummaryError, generate_ollama_summary

entries_api = Blueprint("entries_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


def _base_path() -> str:
    return current_app.config.get("BASE_PATH", "")


def _vapid_config():
    return current_app.config.get("VAPID_CONFIG")


@entries_api.get("/entries")
def list_entries_route():
    limit = request.args.get("limit", default=50, type=int)
    since_utc = request.args.get("since")
    until_utc = request.args.get("until")
    entry_type = request.args.get("type")
    try:
        entries = list_entries(
            _db_path(),
            limit=limit,
            since_utc=since_utc,
            until_utc=until_utc,
            entry_type=entry_type,
        )
        return jsonify(entries)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.get("/entries/output")
def list_entries_output_route():
    limit = request.args.get("limit", default=50, type=int)
    since_utc = request.args.get("since")
    until_utc = request.args.get("until")
    entry_type = request.args.get("type")
    try:
        entries = list_entries(
            _db_path(),
            limit=limit,
            since_utc=since_utc,
            until_utc=until_utc,
            entry_type=entry_type,
        )
        return jsonify({"entries": entries, "count": len(entries)})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.get("/entries/feeds/output")
def list_feed_amount_entries_output_route():
    limit = request.args.get("limit", default=50, type=int)
    since_utc = request.args.get("since")
    until_utc = request.args.get("until")
    try:
        entries = list_feed_amount_entries(
            _db_path(),
            limit=limit,
            since_utc=since_utc,
            until_utc=until_utc,
        )
        return jsonify({"entries": entries, "count": len(entries)})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.get("/entries/export")
def export_entries_route():
    try:
        csv_text = export_entries_csv(_db_path())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    response = Response(csv_text, mimetype="text/csv")
    response.headers["Content-Disposition"] = (
        'attachment; filename="baby-tracker-events-all-users.csv"'
    )
    return response


@entries_api.get("/entries/summary")
def get_entries_summary_route():
    try:
        summary = get_entry_summary(_db_path())
        return jsonify(summary)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.post("/entries/llm-summary")
def generate_entries_llm_summary_route():
    payload = request.get_json(silent=True) or {}
    try:
        summary = generate_ollama_summary(_db_path(), payload)
        return jsonify(summary)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except LlmSummaryError as exc:
        return jsonify({"error": str(exc)}), exc.status_code


@entries_api.get("/entries/feed-schedule")
def get_next_feed_schedule_route():
    user_slug = request.args.get("user_slug")
    count = request.args.get("count", default=6, type=int)
    try:
        schedule = get_next_feed_schedule(_db_path(), user_slug=user_slug, count=count)
        return jsonify(schedule)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.post("/entries")
def create_entry_route():
    payload = request.get_json(silent=True) or {}
    try:
        entry = create_entry(_db_path(), payload)
        dispatch_entry_confirmation_push(
            _db_path(),
            entry,
            vapid_config=_vapid_config(),
            base_path=_base_path(),
        )
        send_entry_webhook(_db_path(), entry)
        dispatch_home_kpis(_db_path())
        return jsonify(entry), 201
    except DuplicateEntryError as exc:
        return jsonify({"error": "duplicate", "entry": exc.entry}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.post("/users/<user_slug>/entries")
def create_user_entry_route(user_slug: str):
    payload = request.get_json(silent=True) or {}
    payload["user_slug"] = user_slug
    try:
        entry = create_entry(_db_path(), payload)
        dispatch_entry_confirmation_push(
            _db_path(),
            entry,
            vapid_config=_vapid_config(),
            base_path=_base_path(),
        )
        send_entry_webhook(_db_path(), entry)
        dispatch_home_kpis(_db_path())
        return jsonify(entry), 201
    except DuplicateEntryError as exc:
        return jsonify({"error": "duplicate", "entry": exc.entry}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.post("/users/<user_slug>/entries/import")
def import_user_entries_route(user_slug: str):
    file_storage = request.files.get("file")
    try:
        result = import_entries_csv(_db_path(), user_slug, file_storage)
        return jsonify(result), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.patch("/entries/<int:entry_id>")
def update_entry_route(entry_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        entry = update_entry(_db_path(), entry_id, payload)
        return jsonify(entry)
    except EntryNotFoundError:
        return jsonify({"error": "not_found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@entries_api.delete("/entries/<int:entry_id>")
def delete_entry_route(entry_id: int):
    try:
        delete_entry(_db_path(), entry_id)
        return ("", 204)
    except EntryNotFoundError:
        return jsonify({"error": "not_found"}), 404


@entries_api.post("/sync/entries")
def sync_entries_route():
    payload = request.get_json(silent=True) or {}
    try:
        result = sync_entries(_db_path(), payload)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
