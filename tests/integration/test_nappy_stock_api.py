from datetime import datetime, timezone


def _log_nappy(client, event_type: str, timestamp_utc: str, event_id: str):
    response = client.post(
        "/api/users/josh/entries",
        json={
            "type": event_type,
            "timestamp_utc": timestamp_utc,
            "client_event_id": event_id,
        },
    )
    assert response.status_code == 201


def test_nappy_stock_page_renders(client):
    response = client.get("/nappy-stock")
    assert response.status_code == 200
    assert b"Nappy Stock" in response.data
    assert b'nappy-stock-remaining' in response.data
    assert b"/static/app.js" not in response.data
    assert b"/static/nappy_stock.js" in response.data


def test_nappy_stock_status_deducts_nappies_since_latest_stock_batch(client):
    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 20,
            "threshold_count": 5,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert stock_response.status_code == 201

    _log_nappy(client, "wee", "2026-07-10T09:00:00+00:00", "nappy-stock-wee-1")
    _log_nappy(client, "poo", "2026-07-10T10:00:00+00:00", "nappy-stock-poo-1")
    _log_nappy(client, "wee", "2026-07-09T09:00:00+00:00", "nappy-stock-old-wee")

    response = client.get("/api/nappy-stock")
    assert response.status_code == 200
    data = response.get_json()
    assert data["configured"] is True
    assert data["used_count"] == 2
    assert data["remaining_count"] == 18
    assert data["threshold_count"] == 5
    assert data["is_below_threshold"] is False


def test_nappy_stock_status_flags_below_threshold(client):
    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 2,
            "threshold_count": 1,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert stock_response.status_code == 201
    _log_nappy(client, "wee", "2026-07-10T09:00:00+00:00", "nappy-stock-low-1")

    response = client.get("/api/nappy-stock")
    assert response.status_code == 200
    data = response.get_json()
    assert data["remaining_count"] == 1
    assert data["is_below_threshold"] is True


def test_nappy_stock_forecast_uses_usage_rate(client, monkeypatch):
    from src.app.services import nappy_stock as service

    fixed_now = datetime(2026, 7, 12, 8, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(service, "_now_utc", lambda: fixed_now)

    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 10,
            "threshold_count": 2,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert stock_response.status_code == 201
    for index, timestamp in enumerate(
        [
            "2026-07-10T12:00:00+00:00",
            "2026-07-11T08:00:00+00:00",
            "2026-07-11T20:00:00+00:00",
            "2026-07-12T07:00:00+00:00",
        ],
        start=1,
    ):
        _log_nappy(client, "wee", timestamp, f"nappy-stock-forecast-{index}")

    response = client.get("/api/nappy-stock")
    assert response.status_code == 200
    data = response.get_json()
    assert data["average_per_day"] == 2.0
    assert data["days_until_empty"] == 3.0
    assert data["estimated_empty_at_utc"] == "2026-07-15T08:00:00+00:00"
    assert data["estimated_threshold_at_utc"] == "2026-07-14T08:00:00+00:00"


def test_nappy_stock_adjusts_current_remaining_without_resetting_date(client):
    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 10,
            "threshold_count": 2,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert stock_response.status_code == 201
    _log_nappy(client, "wee", "2026-07-10T09:00:00+00:00", "nappy-adjust-1")
    _log_nappy(client, "poo", "2026-07-10T10:00:00+00:00", "nappy-adjust-2")

    response = client.post("/api/nappy-stock/adjust", json={"delta": 3})
    assert response.status_code == 200
    data = response.get_json()
    assert data["remaining_count"] == 11
    assert data["used_count"] == 2
    assert data["batch"]["total_count"] == 13
    assert data["batch"]["stock_added_at_utc"] == "2026-07-10T08:00:00+00:00"

    response = client.post("/api/nappy-stock/adjust", json={"delta": -4})
    assert response.status_code == 200
    data = response.get_json()
    assert data["remaining_count"] == 7
    assert data["batch"]["total_count"] == 9


def test_nappy_stock_adjust_rejects_negative_remaining(client):
    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 2,
            "threshold_count": 1,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert stock_response.status_code == 201

    response = client.post("/api/nappy-stock/adjust", json={"delta": -3})
    assert response.status_code == 400
    assert response.get_json()["error"] == "remaining stock cannot be negative"


def test_nappy_stock_updates_latest_batch(client):
    stock_response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 10,
            "threshold_count": 2,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
            "notes": "old",
        },
    )
    assert stock_response.status_code == 201

    response = client.patch(
        "/api/nappy-stock/latest",
        json={
            "total_count": 12,
            "threshold_count": 4,
            "stock_added_at_utc": "2026-07-10T09:00:00+00:00",
            "notes": "corrected",
        },
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["remaining_count"] == 12
    assert data["threshold_count"] == 4
    assert data["batch"]["notes"] == "corrected"
    assert data["batch"]["stock_added_at_utc"] == "2026-07-10T09:00:00+00:00"


def test_nappy_stock_rejects_threshold_above_total(client):
    response = client.post(
        "/api/nappy-stock",
        json={"total_count": 5, "threshold_count": 6},
    )
    assert response.status_code == 400
    assert (
        response.get_json()["error"]
        == "threshold_count cannot be greater than total_count"
    )
