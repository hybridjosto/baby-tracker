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


def test_push_feed_due_route_is_removed(client):
    response = client.post("/api/push/feed-due", json={"user_slug": "suz"})
    assert response.status_code == 404


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


def test_push_subscription_does_not_send_notification(client, monkeypatch):
    def fail_send(*args, **kwargs):
        raise AssertionError("saving a subscription must not send a notification")

    from src.app.services import push_subscriptions as push_module

    monkeypatch.setattr(push_module, "send_web_push", fail_send)
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
