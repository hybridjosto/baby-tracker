import json
from datetime import datetime, timezone, timedelta


def test_entry_creation_sends_home_kpis_webhook(client, monkeypatch):
    fixed_now = datetime(2026, 1, 1, 1, 0, tzinfo=timezone.utc)

    from src.app.services import home_kpis as home_kpis_module

    monkeypatch.setattr(home_kpis_module, "_now_utc", lambda: fixed_now)

    captured = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["data"] = req.data
        captured["content_type"] = req.headers.get("Content-Type") or req.headers.get(
            "Content-type"
        )
        return DummyResponse()

    monkeypatch.setattr(home_kpis_module.urllib_request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={
            "home_kpis_webhook_url": "https://example.com/home-kpis",
            "feed_interval_min": 60,
        },
    )
    assert settings_response.status_code == 200

    last_feed_at = fixed_now - timedelta(minutes=30)
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-home-kpis-1",
            "timestamp_utc": last_feed_at.isoformat(),
            "amount_ml": 100,
        },
    )
    assert response.status_code == 201

    assert captured["url"] == "https://example.com/home-kpis"
    assert captured["content_type"] == "application/json"

    payload = json.loads(captured["data"].decode("utf-8"))
    assert payload == {
        "content": "Homepage KPIs",
        "inputs": {
            "input0": "Next feed due: in 30m",
            "input1": "Feed total (24h): 100 ml",
            "input2": "Goal (24h): --",
            "input3": "Goal % (24h): --",
        },
    }
