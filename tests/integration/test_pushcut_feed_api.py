import json


def test_pushcut_feed_due_requires_url(client):
    response = client.post("/api/push/feed-due", json={"title": "Hi", "body": "Now"})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "pushcut_feed_due_url not configured"


def test_pushcut_feed_due_sends_payload(client, monkeypatch):
    captured: dict = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["data"] = req.data
        captured["headers"] = dict(req.headers)
        return DummyResponse()

    from src.app.routes import pushcut as pushcut_module

    monkeypatch.setattr(pushcut_module.urllib_request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={"pushcut_feed_due_url": "https://pushcut.example.com/feed"},
    )
    assert settings_response.status_code == 200

    response = client.post(
        "/api/push/feed-due",
        json={"title": "Feed", "body": "Now"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["sent"] is True
    assert captured["url"] == "https://pushcut.example.com/feed"
    assert json.loads(captured["data"].decode("utf-8")) == {
        "title": "Feed",
        "body": "Now",
    }


def test_pushcut_feed_due_defaults_payload(client, monkeypatch):
    captured: dict = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    def fake_urlopen(req, timeout=0):
        captured["data"] = req.data
        return DummyResponse()

    from src.app.routes import pushcut as pushcut_module

    monkeypatch.setattr(pushcut_module.urllib_request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={"pushcut_feed_due_url": "https://pushcut.example.com/feed"},
    )
    assert settings_response.status_code == 200

    response = client.post("/api/push/feed-due", json={})
    assert response.status_code == 200
    assert json.loads(captured["data"].decode("utf-8")) == {
        "title": "Feed due",
        "body": "Time for a feed.",
    }
