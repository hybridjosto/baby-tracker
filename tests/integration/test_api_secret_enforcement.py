from src.app.main import create_app


def _build_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.sqlite"
    monkeypatch.setenv("BABY_TRACKER_DB_PATH", str(db_path))
    monkeypatch.setenv("BABY_TRACKER_STORAGE_BACKEND", "dual")
    monkeypatch.setenv("BABY_TRACKER_APP_SHARED_SECRET", "test-secret")
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()


def test_home_kpis_get_does_not_require_secret(tmp_path, monkeypatch):
    client = _build_client(tmp_path, monkeypatch)

    response = client.get("/api/home-kpis")

    assert response.status_code == 200


def test_write_api_still_requires_secret(tmp_path, monkeypatch):
    client = _build_client(tmp_path, monkeypatch)

    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-auth-required-1",
            "timestamp_utc": "2026-01-01T00:00:00+00:00",
            "amount_ml": 60,
        },
    )

    assert response.status_code == 401
