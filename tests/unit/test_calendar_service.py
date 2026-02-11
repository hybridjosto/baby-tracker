from src.app.services.calendar import create_event, list_event_occurrences, update_event
from src.app.storage.db import init_db


def test_weekly_occurrence_expansion(tmp_path):
    db_path = tmp_path / "calendar.sqlite"
    init_db(str(db_path))
    create_event(
        str(db_path),
        {
            "title": "Playgroup",
            "date_local": "2026-02-02",
            "start_time_local": "09:30",
            "end_time_local": "11:00",
            "location": "Town Hall",
            "notes": "Bring snacks",
            "category": "group",
            "recurrence": "weekly",
            "recurrence_until_local": "2026-02-16",
        },
    )
    occurrences = list_event_occurrences(
        str(db_path),
        start="2026-02-01",
        end="2026-02-20",
    )
    dates = [item["occurrence_date"] for item in occurrences]
    assert dates == ["2026-02-02", "2026-02-09", "2026-02-16"]


def test_update_recurrence_until_validation(tmp_path):
    db_path = tmp_path / "calendar.sqlite"
    init_db(str(db_path))
    event = create_event(
        str(db_path),
        {
            "title": "Storytime",
            "date_local": "2026-02-05",
            "start_time_local": "10:00",
            "end_time_local": "11:00",
            "location": "Library",
            "notes": "",
            "category": "meetup",
            "recurrence": "weekly",
            "recurrence_until_local": "2026-03-01",
        },
    )
    try:
        update_event(
            str(db_path),
            event["id"],
            {"recurrence_until_local": "2026-02-01"},
        )
    except ValueError as exc:
        assert "recurrence_until_local" in str(exc)
    else:
        raise AssertionError("expected ValueError")
