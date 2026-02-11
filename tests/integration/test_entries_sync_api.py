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
