from datetime import timezone


def test_feed_log_requires_amount(client):
    response = client.post("/api/feed/log")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "amount is required"


def test_feed_log_uses_default_user_slug(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    response = client.post("/api/feed/log?amount=90")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "feed"
    assert entry["formula_ml"] == 90.0


def test_feed_log_accepts_user_slug_override(client):
    response = client.post("/api/feed/log?amount=70&user_slug=rob")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "rob"
    assert entry["formula_ml"] == 70.0


def test_feed_log_accepts_json_body(client):
    response = client.post(
        "/api/feed/log",
        json={"amount": 110, "user_slug": "suz"},
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["formula_ml"] == 110.0


def test_sleep_start_uses_default_user_slug(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    response = client.post("/api/sleep/start")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "sleep"
    assert entry["feed_duration_min"] is None


def test_cry_start_accepts_user_slug_override(client):
    response = client.post("/api/cry/start?user_slug=rob")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "rob"
    assert entry["type"] == "cry"
    assert entry["feed_duration_min"] is None


def test_sleep_start_accepts_notes_and_timestamp_payload(client):
    response = client.post(
        "/api/sleep/start",
        json={
            "user_slug": "suz",
            "notes": "Settled quickly",
            "timestamp_utc": "2026-03-07T09:30:00Z",
        },
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "sleep"
    assert entry["notes"] == "Settled quickly"
    assert entry["timestamp_utc"] == "2026-03-07T09:30:00+00:00"
    assert entry["feed_duration_min"] is None


def test_sleep_stop_ends_active_sleep_for_default_user(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    start_response = client.post(
        "/api/sleep/start",
        json={"timestamp_utc": "2026-03-07T09:30:00Z"},
    )
    assert start_response.status_code == 201

    response = client.post(
        "/api/sleep/stop",
        json={"end_timestamp_utc": "2026-03-07T10:45:00Z"},
    )

    assert response.status_code == 200
    entry = response.get_json()
    assert entry["type"] == "sleep"
    assert entry["user_slug"] == "suz"
    assert entry["timestamp_utc"] == "2026-03-07T09:30:00+00:00"
    assert entry["feed_duration_min"] == 75


def test_sleep_stop_uses_user_slug_override(client):
    client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-03-07T09:00:00Z"},
    )
    rob_start = client.post(
        "/api/sleep/start",
        json={"user_slug": "rob", "timestamp_utc": "2026-03-07T09:15:00Z"},
    ).get_json()

    response = client.post(
        "/api/sleep/stop?user_slug=rob",
        json={"end_timestamp_utc": "2026-03-07T09:45:00Z"},
    )

    assert response.status_code == 200
    entry = response.get_json()
    assert entry["id"] == rob_start["id"]
    assert entry["user_slug"] == "rob"
    assert entry["feed_duration_min"] == 30

    suz_entries = client.get("/api/entries?type=sleep").get_json()
    active_suz = [item for item in suz_entries if item["user_slug"] == "suz"]
    assert active_suz[0]["feed_duration_min"] is None


def test_sleep_stop_returns_404_without_active_sleep(client):
    response = client.post("/api/sleep/stop?user_slug=suz")
    assert response.status_code == 404
    assert response.get_json()["error"] == "not_found"


def test_sleep_stop_rejects_invalid_end_timestamp(client):
    client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-03-07T09:30:00Z"},
    )

    response = client.post(
        "/api/sleep/stop",
        json={"user_slug": "suz", "end_timestamp_utc": "not-a-time"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "end_timestamp_utc must be ISO-8601"


def test_feed_log_sends_native_push_confirmation(client, monkeypatch):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["subscription"] = subscription
        captured["payload"] = payload
        captured["subject"] = vapid_config.subject
        return {"sent": True}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)

    subscribe_response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-feed",
                "keys": {"p256dh": "p256dh-feed", "auth": "auth-feed"},
            },
        },
    )
    assert subscribe_response.status_code == 200

    client.post(
        "/api/feed/log",
        json={
            "amount": 70,
            "user_slug": "suz",
            "timestamp_utc": "2026-04-26T08:00:00+00:00",
        },
    )
    client.post(
        "/api/feed/log",
        json={
            "amount": 15,
            "user_slug": "rob",
            "timestamp_utc": "2026-04-26T07:30:00+00:00",
        },
    )
    response = client.post(
        "/api/feed/log",
        json={"amount": 110, "user_slug": "suz", "timestamp_utc": "2026-04-27T08:00:00+00:00"},
    )
    assert response.status_code == 201
    assert (
        captured["subscription"]["endpoint"] == "https://push.example.com/device-feed"
    )
    assert captured["payload"] == {
        "title": "Entry saved",
        "body": "Today: 110 ml / Yesterday by now: 85 ml",
        "url": "/suz",
        "tag": "entry-confirmation-suz",
    }
    assert captured["subject"] == "mailto:test@example.com"


def test_sleep_start_sends_native_push_confirmation(client, monkeypatch):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["payload"] = payload
        return {"sent": True}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)

    subscribe_response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "rob",
            "subscription": {
                "endpoint": "https://push.example.com/device-sleep",
                "keys": {"p256dh": "p256dh-sleep", "auth": "auth-sleep"},
            },
        },
    )
    assert subscribe_response.status_code == 200

    response = client.post("/api/sleep/start", json={"user_slug": "rob"})
    assert response.status_code == 201
    assert captured["payload"]["body"] == "Sleep logged for rob"


def test_sleep_stop_sends_comparative_native_push_confirmation(client, monkeypatch):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["payload"] = payload
        return {"sent": True}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)
    monkeypatch.setattr(confirmation_module, "_get_server_timezone", lambda: timezone.utc)

    client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-sleep-stop",
                "keys": {"p256dh": "p256dh-stop", "auth": "auth-stop"},
            },
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "sleep",
            "client_event_id": "sleep-yesterday-complete",
            "timestamp_utc": "2026-04-26T06:00:00+00:00",
            "feed_duration_min": 30,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "sleep",
            "client_event_id": "sleep-yesterday-other-user-complete",
            "timestamp_utc": "2026-04-26T06:15:00+00:00",
            "feed_duration_min": 10,
        },
    )
    start_response = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T07:00:00+00:00"},
    )
    assert start_response.status_code == 201

    response = client.post(
        "/api/sleep/stop",
        json={"user_slug": "suz", "end_timestamp_utc": "2026-04-27T07:45:00+00:00"},
    )

    assert response.status_code == 200
    assert captured["payload"]["body"] == "Slept today: 45 min / Yesterday by now: 40 min"


def test_second_sleep_start_auto_stops_prior_active_sleep_for_same_user(client):
    first = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T07:00:00+00:00"},
    ).get_json()
    second = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T08:15:00+00:00"},
    )

    assert second.status_code == 201
    sleeps = client.get("/api/entries?type=sleep").get_json()
    completed = next(item for item in sleeps if item["id"] == first["id"])
    active = next(item for item in sleeps if item["feed_duration_min"] is None)
    assert completed["feed_duration_min"] == 75
    assert active["user_slug"] == "suz"
    assert active["timestamp_utc"] == "2026-04-27T08:15:00+00:00"


def test_cry_start_auto_stops_active_sleep_for_same_user(client):
    sleep = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T09:00:00+00:00"},
    ).get_json()

    response = client.post(
        "/api/cry/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T09:20:00+00:00"},
    )

    assert response.status_code == 201
    sleeps = client.get("/api/entries?type=sleep").get_json()
    updated = next(item for item in sleeps if item["id"] == sleep["id"])
    assert updated["feed_duration_min"] == 20


def test_feed_poo_and_wee_logs_auto_stop_active_sleep_for_same_user(client):
    sleep = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T10:00:00+00:00"},
    ).get_json()

    feed_response = client.post(
        "/api/feed/log",
        json={"amount": 60, "user_slug": "suz", "timestamp_utc": "2026-04-27T10:10:00+00:00"},
    )
    assert feed_response.status_code == 201
    sleep_after_feed = next(
        item for item in client.get("/api/entries?type=sleep").get_json() if item["id"] == sleep["id"]
    )
    assert sleep_after_feed["feed_duration_min"] == 10

    next_sleep = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T11:00:00+00:00"},
    ).get_json()
    poo_response = client.post(
        "/api/poo/log",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T11:05:00+00:00"},
    )
    assert poo_response.status_code == 201
    sleep_after_poo = next(
        item for item in client.get("/api/entries?type=sleep").get_json() if item["id"] == next_sleep["id"]
    )
    assert sleep_after_poo["feed_duration_min"] == 5

    final_sleep = client.post(
        "/api/sleep/start",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T12:00:00+00:00"},
    ).get_json()
    wee_response = client.post(
        "/api/wee/log",
        json={"user_slug": "suz", "timestamp_utc": "2026-04-27T12:07:00+00:00"},
    )
    assert wee_response.status_code == 201
    sleep_after_wee = next(
        item for item in client.get("/api/entries?type=sleep").get_json() if item["id"] == final_sleep["id"]
    )
    assert sleep_after_wee["feed_duration_min"] == 7
