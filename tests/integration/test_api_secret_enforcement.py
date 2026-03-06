from src.app.main import create_app


def _build_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test.sqlite"
    monkeypatch.setenv("BABY_TRACKER_DB_PATH", str(db_path))
    monkeypatch.setenv("BABY_TRACKER_STORAGE_BACKEND", "sqlite")
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()


def test_write_api_works_without_secret_header(tmp_path, monkeypatch):
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

    assert response.status_code == 201


def test_index_does_not_include_api_secret_dataset(tmp_path, monkeypatch):
    client = _build_client(tmp_path, monkeypatch)
    response = client.get("/")

    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "data-api-secret" not in html
