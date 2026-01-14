def test_get_settings_defaults(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["dob"] is None
    assert payload["feed_interval_min"] is None
    assert payload["custom_event_types"] == []


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
