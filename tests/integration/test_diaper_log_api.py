
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
