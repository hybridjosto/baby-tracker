from datetime import datetime, timezone

from src.app.storage.db import get_connection, init_db


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
    assert b'nappy-stock-threshold-form' in response.data
    assert b'nappy-stock-mode-packs' in response.data


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


def test_nappy_stock_threshold_is_saved_separately_and_carried_to_new_stock(client):
    response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 5,
            "threshold_count": 2,
            "stock_added_at_utc": "2026-07-09T08:00:00+00:00",
        },
    )
    assert response.status_code == 201

    response = client.patch(
        "/api/nappy-stock/threshold",
        json={"threshold_count": 8},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["threshold_count"] == 8
    assert data["is_below_threshold"] is True

    response = client.post(
        "/api/nappy-stock/restock",
        json={
            "loose_count": 10,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["quantity_added"] == 10
    assert data["remaining_count"] == 15
    assert data["threshold_count"] == 8
    assert data["batch"]["threshold_count"] == 8


def test_nappy_stock_restock_adds_bulk_packs_to_current_remaining(client):
    response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 20,
            "threshold_count": 5,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert response.status_code == 201
    _log_nappy(client, "wee", "2026-07-10T09:00:00+00:00", "nappy-pack-1")
    _log_nappy(client, "poo", "2026-07-10T10:00:00+00:00", "nappy-pack-2")

    response = client.post(
        "/api/nappy-stock/restock",
        json={
            "pack_count": 3,
            "nappies_per_pack": 24,
            "stock_added_at_utc": "2026-07-11T08:00:00+00:00",
            "notes": "Three bulk packs",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["quantity_added"] == 72
    assert data["remaining_count"] == 90
    assert data["used_count"] == 0
    assert data["batch"]["total_count"] == 90
    assert data["batch"]["notes"] == "Three bulk packs"


def test_nappy_stock_restock_rejects_incomplete_pack_details(client):
    response = client.post(
        "/api/nappy-stock/restock",
        json={"pack_count": 3, "nappies_per_pack": 0},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == (
        "nappies_per_pack must be greater than zero"
    )


def test_nappy_stock_threshold_migration_preserves_latest_batch_value(tmp_path):
    db_path = str(tmp_path / "legacy-nappy-stock.sqlite")
    with get_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE baby_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                updated_at_utc TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "INSERT INTO baby_settings (id, updated_at_utc) VALUES (1, datetime('now'))"
        )
        conn.execute(
            """
            CREATE TABLE nappy_stock_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                total_count INTEGER NOT NULL,
                threshold_count INTEGER NOT NULL,
                stock_added_at_utc TEXT NOT NULL,
                notes TEXT,
                created_at_utc TEXT NOT NULL,
                updated_at_utc TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            INSERT INTO nappy_stock_batches (
                total_count, threshold_count, stock_added_at_utc,
                created_at_utc, updated_at_utc
            )
            VALUES (30, 7, '2026-07-10T08:00:00+00:00', datetime('now'), datetime('now'))
            """
        )
        conn.commit()

    init_db(db_path)

    with get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT nappy_stock_threshold_count FROM baby_settings WHERE id = 1"
        ).fetchone()

    assert row["nappy_stock_threshold_count"] == 7
