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


def test_current_goal_selects_latest_by_create_time(client):
    response = client.get("/api/feeding-goals/current")
    assert response.status_code == 200
    assert response.get_json() is None

    first = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 500, "start_date": "2024-01-01"},
    ).get_json()
    second = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 800, "start_date": "2023-12-01"},
    ).get_json()

    current = client.get("/api/feeding-goals/current")
    assert current.status_code == 200
    payload = current.get_json()
    assert payload["id"] == second["id"]
    assert payload["goal_ml"] == 800.0


def test_create_feeding_goal_rejects_invalid_payload(client):
    response = client.post("/api/feeding-goals", json={"goal_ml": -10})
    assert response.status_code == 400

    missing = client.post("/api/feeding-goals", json={})
    assert missing.status_code == 400


def test_update_feeding_goal_updates_amount_and_start_date(client):
    created = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 650, "start_date": "2024-01-05"},
    ).get_json()

    response = client.patch(
        f"/api/feeding-goals/{created['id']}",
        json={"goal_ml": 700, "start_date": "2024-02-01"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["id"] == created["id"]
    assert payload["goal_ml"] == 700.0
    assert payload["start_date"] == "2024-02-01"


def test_update_feeding_goal_returns_404_for_missing_goal(client):
    response = client.patch(
        "/api/feeding-goals/999999",
        json={"goal_ml": 700},
    )
    assert response.status_code == 404
    assert response.get_json()["error"] == "not_found"


def test_delete_feeding_goal_removes_goal(client):
    created = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 650, "start_date": "2024-01-05"},
    ).get_json()

    response = client.delete(f"/api/feeding-goals/{created['id']}")
    assert response.status_code == 204

    listed = client.get("/api/feeding-goals").get_json()
    assert listed == []


def test_delete_feeding_goal_returns_404_for_missing_goal(client):
    response = client.delete("/api/feeding-goals/999999")
    assert response.status_code == 404
    assert response.get_json()["error"] == "not_found"
