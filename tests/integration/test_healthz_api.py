def test_healthz_reports_app_and_database_health(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["ok"] is True
    assert payload["timestamp_utc"]
    assert payload["uptime_seconds"] >= 0
    assert payload["db"]["ok"] is True
    assert payload["db"]["latency_ms"] >= 0


def test_healthz_honors_base_path(tmp_path, monkeypatch):
    from src.app.main import create_app

    monkeypatch.setenv("BABY_TRACKER_DB_PATH", str(tmp_path / "test.sqlite"))
    monkeypatch.setenv("BABY_TRACKER_BASE_PATH", "/baby")

    app = create_app()
    app.config.update(TESTING=True)

    response = app.test_client().get("/baby/healthz")

    assert response.status_code == 200
    assert response.get_json()["ok"] is True
