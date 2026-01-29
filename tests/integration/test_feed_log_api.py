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
