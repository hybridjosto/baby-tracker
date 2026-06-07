
def test_poo_log_uses_default_user_slug(client):
    client.patch("/api/settings", json={"default_user_slug": "suz"})
    response = client.post("/api/poo/log")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "suz"
    assert entry["type"] == "poo"


def test_wee_log_accepts_user_slug_override(client):
    response = client.post("/api/wee/log?user_slug=rob")
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["user_slug"] == "rob"
    assert entry["type"] == "wee"


def test_poo_log_accepts_notes_payload(client):
    response = client.post(
        "/api/poo/log",
        json={"user_slug": "suz", "notes": "big one"},
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert entry["notes"] == "big one"


def test_poo_and_wee_routes_persist_distinct_event_types(client):
    poo_response = client.post("/api/poo/log?user_slug=josh")
    wee_response = client.post("/api/wee/log?user_slug=josh")

    assert poo_response.status_code == 201
    assert wee_response.status_code == 201
    assert poo_response.get_json()["type"] == "poo"
    assert wee_response.get_json()["type"] == "wee"

    entries_response = client.get("/api/entries?user_slug=josh")
    assert entries_response.status_code == 200
    assert [entry["type"] for entry in entries_response.get_json()] == ["wee", "poo"]
