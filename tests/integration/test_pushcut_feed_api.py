def test_push_vapid_public_key_route(client):
    response = client.get("/api/push/vapid-public-key")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["public_key"] == "test-public-key"


def test_push_subscription_round_trip(client):
    response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["enabled"] is True
    assert payload["user_slug"] == "suz"

    follow_up = client.get("/api/push/subscription?user_slug=suz")
    assert follow_up.status_code == 200
    follow_payload = follow_up.get_json()
    assert follow_payload["enabled"] is True
    assert follow_payload["endpoint"] == "https://push.example.com/device-1"


def test_push_subscription_delete_route(client):
    client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )

    response = client.delete("/api/push/subscription", json={"user_slug": "suz"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["enabled"] is False
    assert payload["deleted"] is True


def test_push_feed_due_requires_subscription(client):
    response = client.post("/api/push/feed-due", json={"user_slug": "suz"})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "push_subscription_not_configured"


def test_push_feed_due_sends_payload(client, monkeypatch):
    captured: dict = {}

    def fake_send(subscription, payload, vapid_config):
        captured["subscription"] = subscription
        captured["payload"] = payload
        captured["subject"] = vapid_config.subject
        return {"sent": True}

    from src.app.routes import pushcut as push_module

    monkeypatch.setattr(push_module, "send_web_push", fake_send)

    client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )

    response = client.post(
        "/api/push/feed-due",
        json={"user_slug": "suz", "title": "Feed", "body": "Now"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["sent"] is True
    assert captured["subscription"]["endpoint"] == "https://push.example.com/device-1"
    assert captured["payload"] == {
        "title": "Feed",
        "body": "Now",
        "url": "/suz",
        "tag": "feed-due-suz",
    }
    assert captured["subject"] == "mailto:test@example.com"


def test_push_subscription_requires_user_slug(client):
    response = client.post(
        "/api/push/subscription",
        json={
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "user_slug is required"


def test_push_subscription_triggers_due_check(client, monkeypatch):
    captured: dict = {}

    def fake_dispatch(
        db_path, vapid_config=None, base_path="", now_utc=None, send_fn=None
    ):
        captured["db_path"] = db_path
        captured["vapid_config"] = vapid_config
        captured["base_path"] = base_path
        return {"sent": False, "reason": "not_due"}

    from src.app.routes import pushcut as push_module

    monkeypatch.setattr(push_module, "dispatch_feed_due", fake_dispatch)

    response = client.post(
        "/api/push/subscription",
        json={
            "user_slug": "suz",
            "subscription": {
                "endpoint": "https://push.example.com/device-1",
                "keys": {"p256dh": "p256dh-1", "auth": "auth-1"},
            },
        },
    )

    assert response.status_code == 200
    assert captured["db_path"].endswith("test.sqlite")
    assert captured["base_path"] == ""
    assert captured["vapid_config"].subject == "mailto:test@example.com"
