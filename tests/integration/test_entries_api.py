def test_create_user_entry_allows_wee(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-1"},
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "wee"
    assert payload["user_slug"] == "suz"


def test_create_user_entry_rejects_unknown_type(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "sleep", "client_event_id": "evt-2"},
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "type must be feed, poo, or wee"
