import io


def test_create_user_entry_allows_wee(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-1"},
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "wee"
    assert payload["user_slug"] == "suz"


def test_create_user_entry_rejects_invalid_type(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "temp!*", "client_event_id": "evt-2"},
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "type must use letters, numbers, spaces, / or -"


def test_create_milk_express_entry_accepts_metrics(client):
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "milk express",
            "client_event_id": "evt-milk-1",
            "expressed_ml": 120.5,
            "feed_duration_min": 15,
            "notes": "first pump",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["type"] == "milk express"
    assert payload["expressed_ml"] == 120.5
    assert payload["feed_duration_min"] == 15
    assert payload["notes"] == "first pump"


def test_list_entries_returns_all_users(client):
    first = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-10",
            "timestamp_utc": "2024-01-01T00:00:00+00:00",
        },
    ).get_json()
    second = client.post(
        "/api/users/rob/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-11",
            "timestamp_utc": "2024-01-02T00:00:00+00:00",
        },
    ).get_json()

    response = client.get("/api/users/any/entries")
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {first["id"], second["id"]}

    response = client.get("/api/entries")
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {first["id"], second["id"]}


def test_list_entries_filters_by_time_window(client):
    inside = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-12",
            "timestamp_utc": "2024-01-02T05:00:00+00:00",
        },
    ).get_json()
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-13",
            "timestamp_utc": "2024-01-03T05:00:00+00:00",
        },
    )

    response = client.get(
        "/api/entries?since=2024-01-02T00:00:00+00:00&until=2024-01-02T23:59:59+00:00"
    )
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {inside["id"]}


def test_list_entries_filters_by_type(client):
    feed = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-14"},
    ).get_json()
    client.post(
        "/api/users/suz/entries",
        json={"type": "wee", "client_event_id": "evt-15"},
    )

    response = client.get("/api/entries?type=feed")
    assert response.status_code == 200
    entries = response.get_json()
    assert {entry["id"] for entry in entries} == {feed["id"]}


def test_create_entry_duplicate_client_event_returns_409(client):
    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-dup"},
    )
    assert response.status_code == 201
    created = response.get_json()

    duplicate = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-dup"},
    )
    assert duplicate.status_code == 409
    payload = duplicate.get_json()
    assert payload["error"] == "duplicate"
    assert payload["entry"]["id"] == created["id"]


def test_update_entry_success(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-20"},
    ).get_json()

    response = client.patch(
        f"/api/entries/{created['id']}",
        json={
            "type": "poo",
            "notes": "Changed",
            "amount_ml": 120.5,
            "expressed_ml": 80.25,
            "formula_ml": 60.75,
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["type"] == "poo"
    assert payload["notes"] == "Changed"
    assert payload["amount_ml"] == 120.5
    assert payload["expressed_ml"] == 80.25
    assert payload["formula_ml"] == 60.75


def test_update_entry_missing_returns_404(client):
    response = client.patch("/api/entries/9999", json={"type": "poo"})
    assert response.status_code == 404


def test_delete_entry_success(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-30"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404


def test_list_entries_rejects_invalid_since_filter(client):
    response = client.get("/api/entries?since=not-a-timestamp")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Invalid timestamp filter"


def test_list_entries_rejects_invalid_time_window(client):
    response = client.get(
        "/api/entries?since=2024-01-02T00:00:00+00:00&until=2024-01-01T00:00:00+00:00"
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Invalid time window"


def test_list_entries_accepts_plus_offset_in_query(client):
    response = client.get(
        "/api/entries?since=2024-01-01T00:00:00+00:00&until=2024-01-02T00:00:00+00:00"
    )
    assert response.status_code == 200


def test_import_csv_entries(client):
    csv_data = (
        "timestamp,type,duration,comment\n"
        "2024-01-01T01:00:00+00:00,feed,15.5,first feed\n"
        "2024-01-02T02:00:00+00:00,wee,,dry\n"
    )
    response = client.post(
        "/api/users/suz/entries/import",
        data={"file": (io.BytesIO(csv_data.encode("utf-8")), "entries.csv")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["created"] == 2

    feed_response = client.get("/api/entries?type=feed")
    assert feed_response.status_code == 200
    feed_entries = feed_response.get_json()
    assert feed_entries[0]["feed_duration_min"] == 15.5
    assert feed_entries[0]["notes"] == "first feed"


def test_import_csv_rejects_missing_headers(client):
    csv_data = "timestamp,type,comment\n2024-01-01T01:00:00+00:00,feed,hi\n"
    response = client.post(
        "/api/users/suz/entries/import",
        data={"file": (io.BytesIO(csv_data.encode("utf-8")), "entries.csv")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "CSV must have headings: timestamp, type, duration, comment"
