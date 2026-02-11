def test_create_and_list_calendar_events(client):
    response = client.post(
        "/api/calendar/events",
        json={
            "title": "Family Hub Drop-in",
            "date_local": "2026-02-10",
            "start_time_local": "13:00",
            "end_time_local": "15:00",
            "location": "Meadow Hub",
            "notes": "Free snacks",
            "category": "hub",
            "recurrence": "none",
            "recurrence_until_local": None,
        },
    )
    assert response.status_code == 201
    created = response.get_json()

    response = client.get(
        "/api/calendar/events?start=2026-02-10&end=2026-02-16"
    )
    assert response.status_code == 200
    events = response.get_json()
    assert len(events) == 1
    assert events[0]["id"] == created["id"]
    assert events[0]["occurrence_date"] == "2026-02-10"


def test_weekly_event_expands_and_delete(client):
    response = client.post(
        "/api/calendar/events",
        json={
            "title": "Playgroup",
            "date_local": "2026-02-03",
            "start_time_local": "09:30",
            "end_time_local": "11:00",
            "location": "Town Hall",
            "notes": "",
            "category": "group",
            "recurrence": "weekly",
            "recurrence_until_local": "2026-02-17",
        },
    )
    assert response.status_code == 201
    created = response.get_json()

    response = client.get(
        "/api/calendar/events?start=2026-02-03&end=2026-02-17"
    )
    assert response.status_code == 200
    events = response.get_json()
    dates = [item["occurrence_date"] for item in events]
    assert dates == ["2026-02-03", "2026-02-10", "2026-02-17"]

    delete_response = client.delete(f"/api/calendar/events/{created['id']}")
    assert delete_response.status_code == 204

    response = client.get(
        "/api/calendar/events?start=2026-02-03&end=2026-02-17"
    )
    assert response.status_code == 200
    assert response.get_json() == []
