def test_create_and_list_bottles(client):
    response = client.post(
        "/api/bottles",
        json={"name": "Willow 5oz", "empty_weight_g": 38.5},
    )
    assert response.status_code == 201
    created = response.get_json()
    assert created["name"] == "Willow 5oz"
    assert created["empty_weight_g"] == 38.5

    response = client.get("/api/bottles")
    assert response.status_code == 200
    bottles = response.get_json()
    assert len(bottles) == 1
    assert bottles[0]["id"] == created["id"]


def test_update_and_delete_bottle(client):
    response = client.post(
        "/api/bottles",
        json={"name": "Medela", "empty_weight_g": 45},
    )
    bottle = response.get_json()

    response = client.patch(
        f"/api/bottles/{bottle['id']}",
        json={"name": "Medela 4oz", "empty_weight_g": 46.2},
    )
    assert response.status_code == 200
    updated = response.get_json()
    assert updated["name"] == "Medela 4oz"
    assert updated["empty_weight_g"] == 46.2

    response = client.delete(f"/api/bottles/{bottle['id']}")
    assert response.status_code == 204

    response = client.get("/api/bottles")
    assert response.status_code == 200
    assert response.get_json() == []


def test_bottle_validation_errors(client):
    response = client.post(
        "/api/bottles",
        json={"name": "", "empty_weight_g": 12},
    )
    assert response.status_code == 400

    response = client.post(
        "/api/bottles",
        json={"name": "Bad weight", "empty_weight_g": -2},
    )
    assert response.status_code == 400

    response = client.patch("/api/bottles/9999", json={"name": "New"})
    assert response.status_code == 404
