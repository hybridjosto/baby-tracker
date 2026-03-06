def test_sync_push_and_pull_changes(client):
    payload = {
        "device_id": "dev-1",
        "cursor": None,
        "changes": [
            {
                "action": "upsert",
                "entry": {
                    "user_slug": "suz",
                    "type": "feed",
                    "client_event_id": "evt-sync-1",
                    "timestamp_utc": "2024-01-01T00:00:00+00:00",
                },
            }
        ],
    }
    response = client.post("/api/sync/entries", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data["cursor"], str)
    assert any(
        entry["client_event_id"] == "evt-sync-1" for entry in data["entries"]
    )

    entries = client.get("/api/entries").get_json()
    assert any(entry["client_event_id"] == "evt-sync-1" for entry in entries)


def test_sync_cursor_does_not_replay_same_entries(client):
    first = client.post(
        "/api/sync/entries",
        json={
            "device_id": "dev-2",
            "cursor": None,
            "changes": [
                {
                    "action": "upsert",
                    "entry": {
                        "user_slug": "suz",
                        "type": "feed",
                        "client_event_id": "evt-sync-cursor-1",
                        "timestamp_utc": "2024-01-01T00:00:00+00:00",
                    },
                }
            ],
        },
    )
    assert first.status_code == 200
    first_data = first.get_json()

    second = client.post(
        "/api/sync/entries",
        json={
            "device_id": "dev-2",
            "cursor": first_data["cursor"],
            "changes": [],
        },
    )
    assert second.status_code == 200
    second_data = second.get_json()
    assert second_data["entries"] == []


def test_sync_rejects_invalid_entry_timestamp(client):
    response = client.post(
        "/api/sync/entries",
        json={
            "device_id": "dev-invalid-ts",
            "cursor": None,
            "changes": [
                {
                    "action": "upsert",
                    "entry": {
                        "user_slug": "suz",
                        "type": "feed",
                        "client_event_id": "evt-sync-invalid-ts",
                        "timestamp_utc": "bad-ts",
                    },
                }
            ],
        },
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "timestamp_utc must be ISO-8601"
