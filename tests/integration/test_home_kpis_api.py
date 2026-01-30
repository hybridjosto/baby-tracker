from datetime import datetime, timezone


def test_home_kpis_defaults_when_empty(client):
    response = client.get("/api/home-kpis")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "content": "Homepage KPIs",
        "inputs": {
            "input0": "Next feed due: --",
            "input1": "Feed total (24h): 0 ml",
            "input2": "Goal (24h): --",
        },
    }


def test_home_kpis_returns_feed_total_goal_and_due(client, monkeypatch):
    fixed_now = datetime(2026, 1, 1, 1, 0, tzinfo=timezone.utc)

    from src.app.services import home_kpis as home_kpis_module

    monkeypatch.setattr(home_kpis_module, "_now_utc", lambda: fixed_now)

    settings_response = client.patch(
        "/api/settings",
        json={"feed_interval_min": 60, "default_user_slug": "suz"},
    )
    assert settings_response.status_code == 200

    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 720, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201

    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-1",
            "timestamp_utc": "2025-12-31T02:00:00+00:00",
            "amount_ml": 120,
            "expressed_ml": 30,
            "formula_ml": 20,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-2",
            "timestamp_utc": "2025-12-31T12:00:00+00:00",
            "formula_ml": 40,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-breast",
            "timestamp_utc": "2025-12-31T20:00:00+00:00",
            "notes": "Breastfeeding (started)",
            "amount_ml": 200,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-old",
            "timestamp_utc": "2025-12-30T00:00:00+00:00",
            "amount_ml": 500,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-other",
            "timestamp_utc": "2025-12-31T03:00:00+00:00",
            "amount_ml": 900,
        },
    )

    response = client.get("/api/home-kpis")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "content": "Homepage KPIs",
        "inputs": {
            "input0": "Next feed due: due now",
            "input1": "Feed total (24h): 210 ml",
            "input2": "Goal (24h): 720 ml",
        },
    }
