import csv
import io
import json


def test_create_user_entry_allows_wee(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-1"},
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "wee"
    assert payload["user_slug"] == "suz"


def test_create_user_entry_allows_emoji_type(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "🌡 temp", "client_event_id": "evt-emoji-1"},
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "🌡 temp"
    assert payload["user_slug"] == "suz"


def test_create_user_entry_rejects_invalid_type(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "temp!*", "client_event_id": "evt-2"},
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "type must use letters, numbers, spaces, /, -, or emoji"


def test_create_user_entry_rejects_invalid_timestamp(client):
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-invalid-ts-create",
            "timestamp_utc": "not-a-timestamp",
        },
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "timestamp_utc must be ISO-8601"


def test_create_milk_express_entry_accepts_metrics(client):
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "milk express",
            "client_event_id": "evt-milk-1",
            "expressed_ml": 120.5,
            "feed_duration_min": 15,
            "notes": "first pump",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "milk express"
    assert payload["expressed_ml"] == 120.5
    assert payload["feed_duration_min"] == 15
    assert payload["notes"] == "first pump"


def test_create_entry_sends_webhook_payload(client, monkeypatch):
    captured: dict = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["data"] = req.data
        return DummyResponse()

    from src.app.services import webhooks as webhooks_module

    monkeypatch.setattr(webhooks_module.request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={"entry_webhook_url": "https://example.com/entry-hook"},
    )
    assert settings_response.status_code == 200

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-hook-1"},
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert captured["url"] == "https://example.com/entry-hook"
    assert json.loads(captured["data"].decode("utf-8")) == entry


def test_create_entry_skips_webhook_without_url(client, monkeypatch):
    called = {"count": 0}

    def fake_urlopen(req, timeout=0):
        called["count"] += 1
        raise AssertionError("urlopen should not be called without webhook URL")

    from src.app.services import webhooks as webhooks_module

    monkeypatch.setattr(webhooks_module.request, "urlopen", fake_urlopen)

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-hook-2"},
    )
    assert response.status_code == 201
    assert called["count"] == 0


def test_create_user_entry_sends_native_push_confirmation(client, monkeypatch):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["subscription"] = subscription
        captured["payload"] = payload
        captured["subject"] = vapid_config.subject
        return {"sent": True}

    from src.app.routes import entries as entries_module

    monkeypatch.setattr(entries_module, "send_web_push", fake_send, raising=False)

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)

    subscribe_response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )
    assert subscribe_response.status_code == 200

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-push-confirm-1"},
    )
    assert response.status_code == 201
    assert captured["subscription"]["endpoint"] == "https://push.example.com/device-1"
    assert captured["payload"] == {
        "title": "Entry saved",
        "body": "Feed logged for suz",
        "url": "/suz",
        "tag": "entry-confirmation-suz",
    }
    assert captured["subject"] == "mailto:test@example.com"


def test_create_entry_skips_native_push_confirmation_without_subscription(
    client, monkeypatch
):
    called = {"count": 0}

    def fake_send(subscription, payload, vapid_config):
        called["count"] += 1
        return {"sent": True}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-push-confirm-2"},
    )
    assert response.status_code == 201
    assert called["count"] == 0


def test_create_entry_removes_invalid_push_subscription(client, monkeypatch):
    def fake_send(subscription, payload, vapid_config):
        return {"sent": False, "reason": "invalid_subscription"}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)

    subscribe_response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )
    assert subscribe_response.status_code == 200

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "poo", "client_event_id": "evt-push-confirm-3"},
    )
    assert response.status_code == 201

    follow_up = client.get("/api/push/subscription?user_slug=suz")
    assert follow_up.status_code == 200
    assert follow_up.get_json()["enabled"] is False


def test_create_entry_route_sends_confirmation_for_payload_user_slug(
    client, monkeypatch
):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["subscription"] = subscription
        captured["payload"] = payload
        return {"sent": True}

    from src.app.services import entry_confirmation as confirmation_module

    monkeypatch.setattr(confirmation_module, "send_web_push", fake_send)

    subscribe_response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "rob",
            "subscription": {
                "endpoint": "https://push.example.com/device-2",
                "keys": {"p256dh": "p256dh-2", "auth": "auth-2"},
            },
        },
    )
    assert subscribe_response.status_code == 200

    response = client.post(
        "/api/entries",
        json={
            "type": "sleep",
            "client_event_id": "evt-push-confirm-4",
            "user_slug": "rob",
        },
    )
    assert response.status_code == 201
    assert captured["subscription"]["endpoint"] == "https://push.example.com/device-2"
    assert captured["payload"]["body"] == "Sleep logged for rob"


def test_list_entries_returns_all_users(client):
    first = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-10",
            "timestamp_utc": "2024-01-01T00:00:00+00:00",
        },
    ).get_json()
    second = client.post(
        "/api/users/rob/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-11",
            "timestamp_utc": "2024-01-02T00:00:00+00:00",
        },
    ).get_json()

    response = client.get("/api/entries")
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {first["id"], second["id"]}


def test_list_entries_filters_by_time_window(client):
    inside = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-12",
            "timestamp_utc": "2024-01-02T05:00:00+00:00",
        },
    ).get_json()
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-13",
            "timestamp_utc": "2024-01-03T05:00:00+00:00",
        },
    )

    response = client.get(
        "/api/entries?since=2024-01-02T00:00:00+00:00&until=2024-01-02T23:59:59+00:00"
    )
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {inside["id"]}


def test_list_entries_filters_by_type(client):
    feed = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-14"},
    ).get_json()
    client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-15"},
    )

    response = client.get("/api/entries?type=feed")
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {feed["id"]}


def test_list_feed_amount_entries_output_filters_and_formats_date(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-output-1",
            "timestamp_utc": "2024-03-01T05:06:00+00:00",
            "expressed_ml": 0,
            "formula_ml": 20,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-output-2",
            "timestamp_utc": "2024-03-02T05:06:00+00:00",
            "expressed_ml": 10,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "wee",
            "client_event_id": "evt-feed-output-3",
            "timestamp_utc": "2024-03-03T05:06:00+00:00",
            "expressed_ml": 5,
            "formula_ml": 5,
        },
    )

    response = client.get("/api/entries/feeds/output")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 1
    assert payload["entries"] == [
        {"date": "2024 0301", "expressed_ml": 0.0, "formula_ml": 20.0}
    ]


def test_entries_summary_returns_null_when_missing(client):
    response = client.get("/api/entries/summary")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "items": [
            {"title": "Last feed", "date_time": None},
            {"title": "Last wee", "date_time": None},
            {"title": "Last poo", "date_time": None},
            {"title": "Next feed", "date_time": None},
        ],
        "last_feed_time_utc": None,
        "summary": "Last feed: -- · Last wee: -- · Last poo: -- · Next feed: --",
    }


def test_entries_summary_returns_latest_entries(client):
    client.patch("/api/settings", json={"feed_interval_min": 180})
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-last-feed-1",
            "timestamp_utc": "2024-01-01T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-last-feed-2",
            "timestamp_utc": "2024-01-02T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "wee",
            "client_event_id": "evt-last-wee-1",
            "timestamp_utc": "2024-01-03T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-last-poo-1",
            "timestamp_utc": "2024-01-04T00:00:00+00:00",
        },
    )

    response = client.get("/api/entries/summary")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "items": [
            {"title": "Last feed", "date_time": "2024-01-02 00:00"},
            {"title": "Last wee", "date_time": "2024-01-03 00:00"},
            {"title": "Last poo", "date_time": "2024-01-04 00:00"},
            {"title": "Next feed", "date_time": "2024-01-02 03:00"},
        ],
        "last_feed_time_utc": "2024-01-02T00:00:00+00:00",
        "summary": (
            "Last feed: 2024-01-02 00:00 · Last wee: 2024-01-03 00:00 · "
            "Last poo: 2024-01-04 00:00 · Next feed: 2024-01-02 03:00"
        ),
    }


def test_entries_llm_summary_calls_ollama_with_selected_window(client, monkeypatch):
    captured: dict = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

        def read(self):
            return json.dumps({"response": "- Fed well\n- One wee"}).encode("utf-8")

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["timeout"] = timeout
        captured["payload"] = json.loads(req.data.decode("utf-8"))
        return DummyResponse()

    from src.app.services import llm_summary as llm_summary_module

    monkeypatch.setattr(llm_summary_module.urllib_request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={
            "ollama_base_url": "http://ollama.local:11434",
            "ollama_model": "gemma4:latest",
            "ollama_timeout_seconds": 60,
        },
    )
    assert settings_response.status_code == 200

    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-llm-feed",
            "timestamp_utc": "2024-01-01T08:00:00+00:00",
            "amount_ml": 90,
            "notes": "settled afterwards",
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-llm-other-user",
            "timestamp_utc": "2024-01-01T09:00:00+00:00",
            "notes": "exclude me",
        },
    )

    response = client.post(
        "/api/entries/llm-summary",
        json={
            "user_slug": "suz",
            "since_utc": "2024-01-01T00:00:00+00:00",
            "until_utc": "2024-01-01T23:59:59+00:00",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["summary"] == "- Fed well\n- One wee"
    assert payload["event_count"] == 1
    assert payload["model"] == "gemma4:latest"
    assert payload["window"] == {
        "since_utc": "2024-01-01T00:00:00+00:00",
        "until_utc": "2024-01-01T23:59:59+00:00",
    }
    assert captured["url"] == "http://ollama.local:11434/api/generate"
    assert captured["timeout"] == 60
    assert captured["payload"]["model"] == "gemma4:latest"
    assert captured["payload"]["stream"] is False
    assert "settled afterwards" in captured["payload"]["prompt"]
    assert "exclude me" not in captured["payload"]["prompt"]


def test_entries_llm_summary_skips_ollama_without_events(client, monkeypatch):
    called = {"count": 0}

    def fake_urlopen(req, timeout=0):
        called["count"] += 1
        raise AssertionError("Ollama should not be called without events")

    from src.app.services import llm_summary as llm_summary_module

    monkeypatch.setattr(llm_summary_module.urllib_request, "urlopen", fake_urlopen)

    response = client.post(
        "/api/entries/llm-summary",
        json={
            "since_utc": "2024-01-01T00:00:00+00:00",
            "until_utc": "2024-01-01T23:59:59+00:00",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["summary"] == ""
    assert payload["event_count"] == 0
    assert payload["skipped"] is True
    assert called["count"] == 0


def test_entries_llm_summary_rejects_invalid_window(client):
    response = client.post(
        "/api/entries/llm-summary",
        json={
            "since_utc": "2024-01-02T00:00:00+00:00",
            "until_utc": "2024-01-01T00:00:00+00:00",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "since_utc must be before until_utc"

    response = client.post(
        "/api/entries/llm-summary",
        json={
            "since_utc": "2024-01-01T00:00:00+00:00",
            "until_utc": "2024-01-02T02:00:00+00:00",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "summary window must be 25 hours or less"


def test_feed_schedule_returns_next_six_feeds(client):
    client.patch("/api/settings", json={"feed_interval_min": 120})
    created = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-schedule-1",
            "timestamp_utc": "2024-01-01T08:00:00+00:00",
        },
    ).get_json()

    response = client.get("/api/entries/feed-schedule")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["interval_min"] == 120
    assert payload["source_entry_id"] == created["id"]
    assert payload["items"] == [
        {"sequence": 1, "timestamp_utc": "2024-01-01T10:00:00+00:00"},
        {"sequence": 2, "timestamp_utc": "2024-01-01T12:00:00+00:00"},
        {"sequence": 3, "timestamp_utc": "2024-01-01T14:00:00+00:00"},
        {"sequence": 4, "timestamp_utc": "2024-01-01T16:00:00+00:00"},
        {"sequence": 5, "timestamp_utc": "2024-01-01T18:00:00+00:00"},
        {"sequence": 6, "timestamp_utc": "2024-01-01T20:00:00+00:00"},
    ]


def test_feed_schedule_supports_user_slug_and_count(client):
    client.patch("/api/settings", json={"feed_interval_min": 90})
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-schedule-suz",
            "timestamp_utc": "2024-01-01T01:00:00+00:00",
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-schedule-rob",
            "timestamp_utc": "2024-01-01T03:00:00+00:00",
        },
    )

    response = client.get("/api/entries/feed-schedule?user_slug=suz&count=2")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["interval_min"] == 90
    assert [item["timestamp_utc"] for item in payload["items"]] == [
        "2024-01-01T02:30:00+00:00",
        "2024-01-01T04:00:00+00:00",
    ]


def test_feed_schedule_empty_without_interval_or_feed(client):
    response = client.get("/api/entries/feed-schedule")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {"interval_min": None, "source_entry_id": None, "items": []}


def test_list_feed_amount_entries_output_returns_all_users(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-user-1",
            "timestamp_utc": "2024-04-01T10:00:00+00:00",
            "expressed_ml": 30,
            "formula_ml": 15,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-user-2",
            "timestamp_utc": "2024-04-02T10:00:00+00:00",
            "expressed_ml": 40,
            "formula_ml": 10,
        },
    )

    response = client.get("/api/entries/feeds/output")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 2
    assert payload["entries"] == [
        {"date": "2024 0402", "expressed_ml": 40.0, "formula_ml": 10.0},
        {"date": "2024 0401", "expressed_ml": 30.0, "formula_ml": 15.0},
    ]


def test_user_scoped_output_routes_removed(client):
    response = client.get("/api/users/suz/entries")
    assert response.status_code == 405

    response = client.get("/api/users/suz/entries/output")
    assert response.status_code == 404

    response = client.get("/api/users/suz/entries/feeds/output")
    assert response.status_code == 404

    response = client.get("/api/users/suz/entries/export")
    assert response.status_code == 404


def test_create_entry_duplicate_client_event_returns_409(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-dup"},
    )
    assert response.status_code == 201
    created = response.get_json()

    duplicate = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-dup"},
    )
    assert duplicate.status_code == 409
    payload = duplicate.get_json()
    assert payload["error"] == "duplicate"
    assert payload["entry"]["id"] == created["id"]


def test_update_entry_success(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-20"},
    ).get_json()

    response = client.patch(
        f"/api/entries/{created['id']}",
        json={
            "type": "poo",
            "notes": "Changed",
            "amount_ml": 120.5,
            "expressed_ml": 80.25,
            "formula_ml": 60.75,
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["type"] == "poo"
    assert payload["notes"] == "Changed"
    assert payload["amount_ml"] == 120.5
    assert payload["expressed_ml"] == 80.25
    assert payload["formula_ml"] == 60.75


def test_update_entry_missing_returns_404(client):
    response = client.patch("/api/entries/9999", json={"type": "poo"})
    assert response.status_code == 404


def test_update_entry_rejects_invalid_timestamp(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-invalid-ts-update"},
    ).get_json()

    response = client.patch(
        f"/api/entries/{created['id']}",
        json={"timestamp_utc": "still-not-a-timestamp"},
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "timestamp_utc must be ISO-8601"


def test_delete_entry_success(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-30"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404


def test_delete_entry_soft_delete_idempotent(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-del-2"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)


def test_list_entries_rejects_invalid_since_filter(client):
    response = client.get("/api/entries?since=not-a-timestamp")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Invalid timestamp filter"


def test_list_entries_rejects_invalid_time_window(client):
    response = client.get(
        "/api/entries?since=2024-01-02T00:00:00+00:00&until=2024-01-01T00:00:00+00:00"
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Invalid time window"


def test_list_entries_accepts_plus_offset_in_query(client):
    response = client.get(
        "/api/entries?since=2024-01-01T00:00:00+00:00&until=2024-01-02T00:00:00+00:00"
    )
    assert response.status_code == 200


def test_import_csv_entries(client):
    csv_data = (
        "timestamp,type,duration,comment\n"
        "2024-01-01T01:00:00+00:00,feed,15.5,first feed\n"
        "2024-01-02T02:00:00+00:00,wee,,dry\n"
    )
    response = client.post(
        "/api/users/suz/entries/import",
        data={"file": (io.BytesIO(csv_data.encode("utf-8")), "entries.csv")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["created"] == 2

    feed_response = client.get("/api/entries?type=feed")
    assert feed_response.status_code == 200
    feed_entries = feed_response.get_json()
    assert feed_entries[0]["feed_duration_min"] == 15.5
    assert feed_entries[0]["notes"] == "first feed"


def test_import_csv_rejects_missing_headers(client):
    csv_data = "timestamp,type,comment\n2024-01-01T01:00:00+00:00,feed,hi\n"
    response = client.post(
        "/api/users/suz/entries/import",
        data={"file": (io.BytesIO(csv_data.encode("utf-8")), "entries.csv")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert (
        payload["error"] == "CSV must have headings: timestamp, type, duration, comment"
    )


def test_export_entries_csv_includes_feed_amounts(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-export-1",
            "timestamp_utc": "2024-02-01T08:30:00+00:00",
            "feed_duration_min": 12.5,
            "amount_ml": 80,
            "expressed_ml": 40,
            "formula_ml": 20,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-export-2",
            "timestamp_utc": "2024-02-02T08:30:00+00:00",
            "feed_duration_min": 10,
            "amount_ml": 60,
            "expressed_ml": 20,
            "formula_ml": 10,
        },
    )
    response = client.get("/api/entries/export")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"

    text = response.get_data(as_text=True)
    lines = [line for line in text.strip().splitlines() if line]
    reader = csv.reader(lines)
    header = next(reader)
    assert header == [
        "id",
        "user_slug",
        "type",
        "timestamp_utc",
        "client_event_id",
        "notes",
        "amount_ml",
        "feed_duration_min",
        "caregiver_id",
        "created_at_utc",
        "updated_at_utc",
        "expressed_ml",
        "formula_ml",
        "deleted_at_utc",
    ]
    rows = list(reader)
    assert len(rows) == 2
    rows_by_id = {
        row_map["client_event_id"]: row_map
        for row_map in (dict(zip(header, row, strict=True)) for row in rows)
    }
    assert set(rows_by_id.keys()) == {"evt-export-1", "evt-export-2"}
    assert rows_by_id["evt-export-1"]["user_slug"] == "suz"
    assert rows_by_id["evt-export-1"]["type"] == "feed"
    assert rows_by_id["evt-export-1"]["timestamp_utc"] == "2024-02-01T08:30:00+00:00"
    assert rows_by_id["evt-export-1"]["amount_ml"] == "80.0"
    assert rows_by_id["evt-export-1"]["feed_duration_min"] == "12.5"
    assert rows_by_id["evt-export-1"]["expressed_ml"] == "40.0"
    assert rows_by_id["evt-export-1"]["formula_ml"] == "20.0"
    assert rows_by_id["evt-export-1"]["deleted_at_utc"] == ""
    assert rows_by_id["evt-export-2"]["user_slug"] == "rob"
