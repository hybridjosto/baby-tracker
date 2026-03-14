def test_feed_log_requires_amount(client):
    response = client.post("/api/feed/log")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "amount is required"


def test_feed_log_uses_default_user_slug(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    response = client.post("/api/feed/log?amount=90")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "feed"
    assert entry["formula_ml"] == 90.0


def test_feed_log_accepts_user_slug_override(client):
    response = client.post("/api/feed/log?amount=70&user_slug=rob")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "rob"
    assert entry["formula_ml"] == 70.0


def test_feed_log_accepts_json_body(client):
    response = client.post(
        "/api/feed/log",
        json={"amount": 110, "user_slug": "suz"},
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["formula_ml"] == 110.0


def test_sleep_start_uses_default_user_slug(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    response = client.post("/api/sleep/start")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "sleep"
    assert entry["feed_duration_min"] is None


def test_cry_start_accepts_user_slug_override(client):
    response = client.post("/api/cry/start?user_slug=rob")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "rob"
    assert entry["type"] == "cry"
    assert entry["feed_duration_min"] is None


def test_sleep_start_accepts_notes_and_timestamp_payload(client):
    response = client.post(
        "/api/sleep/start",
        json={
            "user_slug": "suz",
            "notes": "Settled quickly",
            "timestamp_utc": "2026-03-07T09:30:00Z",
        },
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "sleep"
    assert entry["notes"] == "Settled quickly"
    assert entry["timestamp_utc"] == "2026-03-07T09:30:00+00:00"
    assert entry["feed_duration_min"] is None
