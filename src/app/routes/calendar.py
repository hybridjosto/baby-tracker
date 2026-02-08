from flask import Blueprint, current_app, jsonify, request

from src.app.services.calendar import (
    CalendarEventNotFoundError,
    create_event,
    delete_event,
    get_event,
    list_event_occurrences,
    update_event,
)

calendar_api = Blueprint("calendar_api", __name__, url_prefix="/api")


def _db_path() -> str:
    return current_app.config["DB_PATH"]


@calendar_api.get("/calendar/events")
def list_calendar_events_route():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify({"error": "start and end are required"}), 400
    try:
        events = list_event_occurrences(_db_path(), start, end)
        return jsonify(events)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@calendar_api.get("/calendar/events/<int:event_id>")
def get_calendar_event_route(event_id: int):
    try:
        event = get_event(_db_path(), event_id)
        return jsonify(event)
    except CalendarEventNotFoundError:
        return jsonify({"error": "not_found"}), 404


@calendar_api.post("/calendar/events")
def create_calendar_event_route():
    payload = request.get_json(silent=True) or {}
    try:
        event = create_event(_db_path(), payload)
        return jsonify(event), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@calendar_api.patch("/calendar/events/<int:event_id>")
def update_calendar_event_route(event_id: int):
    payload = request.get_json(silent=True) or {}
    try:
        event = update_event(_db_path(), event_id, payload)
        return jsonify(event)
    except CalendarEventNotFoundError:
        return jsonify({"error": "not_found"}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@calendar_api.delete("/calendar/events/<int:event_id>")
def delete_calendar_event_route(event_id: int):
    try:
        delete_event(_db_path(), event_id)
        return ("", 204)
    except CalendarEventNotFoundError:
        return jsonify({"error": "not_found"}), 404
