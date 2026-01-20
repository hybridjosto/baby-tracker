def test_list_feeding_goals_defaults_empty(client):
    response = client.get("/api/feeding-goals")
    assert response.status_code == 200
    assert response.get_json() == []


def test_create_feeding_goal_then_list(client):
    response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 650, "start_date": "2024-01-05"},
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["goal_ml"] == 650.0
    assert payload["start_date"] == "2024-01-05"

    follow_up = client.get("/api/feeding-goals?limit=1")
    assert follow_up.status_code == 200
    listed = follow_up.get_json()
    assert len(listed) == 1
    assert listed[0]["goal_ml"] == 650.0


def test_create_feeding_goal_rejects_invalid_payload(client):
    response = client.post("/api/feeding-goals", json={"goal_ml": -10})
    assert response.status_code == 400

    missing = client.post("/api/feeding-goals", json={})
    assert missing.status_code == 400
