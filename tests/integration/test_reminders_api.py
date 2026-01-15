def test_list_reminders_defaults(client):
    response = client.get("/api/reminders")
    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload) == 2
    kinds = {reminder["kind"] for reminder in payload}
    assert kinds == {"nappy", "food"}


def test_patch_reminder_interval(client):
    response = client.get("/api/reminders")
    reminders = response.get_json()
    reminder_id = reminders[0]["id"]

    update = client.patch(
        f"/api/reminders/{reminder_id}",
        json={"interval_min": 90},
    )
    assert update.status_code == 200
    payload = update.get_json()
    assert payload["interval_min"] == 90


def test_patch_reminder_rejects_invalid(client):
    response = client.get("/api/reminders")
    reminders = response.get_json()
    reminder_id = reminders[0]["id"]

    update = client.patch(
        f"/api/reminders/{reminder_id}",
        json={"interval_min": -5},
    )
    assert update.status_code == 400

    update = client.patch(
        f"/api/reminders/{reminder_id}",
        json={},
    )
    assert update.status_code == 400


def test_dispatch_reminders_uses_threshold(client):
    response = client.get("/api/reminders")
    reminders = response.get_json()
    food_id = next(rem["id"] for rem in reminders if rem["kind"] == "food")
    client.patch(f"/api/reminders/{food_id}", json={"interval_min": 30})
    client.patch(
        "/api/settings",
        json={"discord_webhook_url": "https://example.com/webhook"},
    )

    payload = {
        "type": "feed",
        "timestamp_utc": "2024-01-01T08:00:00+00:00",
        "client_event_id": "feed-dispatch",
    }
    client.post("/api/users/default/entries", json=payload)

    dispatch = client.post("/api/reminders/dispatch")
    assert dispatch.status_code == 200
    assert dispatch.get_json()["dispatched"] == 1

    reminders_after = client.get("/api/reminders").get_json()
    updated = next(rem for rem in reminders_after if rem["id"] == food_id)
    assert updated["last_sent_at_utc"] is not None
