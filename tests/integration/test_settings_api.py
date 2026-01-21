def test_get_settings_defaults(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dob"] is None
    assert payload["feed_interval_min"] is None
    assert payload["custom_event_types"] == []
    assert payload["feed_goal_min"] is None
    assert payload["feed_goal_max"] is None
    assert payload["overnight_gap_min_hours"] is None
    assert payload["overnight_gap_max_hours"] is None
    assert payload["behind_target_mode"] is None
    assert payload["feed_schedule_anchor_time"] is None


def test_patch_settings_updates_values(client):
    response = client.patch(
        "/api/settings",
        json={
            "dob": "2024-01-05",
            "feed_interval_min": 180,
            "custom_event_types": ["room/body temp", "Outdoor Temp"],
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dob"] == "2024-01-05"
    assert payload["feed_interval_min"] == 180
    assert payload["custom_event_types"] == ["room/body temp", "Outdoor Temp"]

    follow_up = client.get("/api/settings")
    payload = follow_up.get_json()
    assert payload["dob"] == "2024-01-05"
    assert payload["feed_interval_min"] == 180
    assert payload["custom_event_types"] == ["room/body temp", "Outdoor Temp"]


def test_patch_settings_rejects_invalid_values(client):
    response = client.patch("/api/settings", json={"dob": "01-05-2024"})
    assert response.status_code == 400

    response = client.patch("/api/settings", json={"feed_interval_min": -15})
    assert response.status_code == 400

    response = client.patch(
        "/api/settings", json={"custom_event_types": ["bad*chars"]}
    )
    assert response.status_code == 400


def test_patch_settings_updates_schedule_helper_fields(client):
    response = client.patch(
        "/api/settings",
        json={
            "feed_goal_min": 7,
            "feed_goal_max": 8,
            "overnight_gap_min_hours": 4,
            "overnight_gap_max_hours": 5,
            "behind_target_mode": "increase_next",
            "feed_schedule_anchor_time": "06:00",
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["feed_goal_min"] == 7
    assert payload["feed_goal_max"] == 8
    assert payload["overnight_gap_min_hours"] == 4
    assert payload["overnight_gap_max_hours"] == 5
    assert payload["behind_target_mode"] == "increase_next"
    assert payload["feed_schedule_anchor_time"] == "06:00"


def test_patch_settings_rejects_invalid_schedule_helper_fields(client):
    response = client.patch("/api/settings", json={"feed_goal_min": 0})
    assert response.status_code == 400

    response = client.patch("/api/settings", json={"feed_goal_max": -1})
    assert response.status_code == 400

    response = client.patch(
        "/api/settings",
        json={"feed_goal_min": 9, "feed_goal_max": 8},
    )
    assert response.status_code == 400

    response = client.patch(
        "/api/settings",
        json={"overnight_gap_min_hours": -1},
    )
    assert response.status_code == 400

    response = client.patch(
        "/api/settings",
        json={"overnight_gap_min_hours": 6, "overnight_gap_max_hours": 5},
    )
    assert response.status_code == 400

    response = client.patch(
        "/api/settings",
        json={"behind_target_mode": "nope"},
    )
    assert response.status_code == 400

    response = client.patch(
        "/api/settings",
        json={"feed_schedule_anchor_time": "6am"},
    )
    assert response.status_code == 400
