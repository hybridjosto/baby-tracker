import csv
import io
import json


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


def test_create_entry_sends_webhook_payload(client, monkeypatch):
    captured: dict = {}

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            return False

    def fake_urlopen(req, timeout=0):
        captured["url"] = req.full_url
        captured["data"] = req.data
        return DummyResponse()

    from src.app.services import webhooks as webhooks_module

    monkeypatch.setattr(webhooks_module.request, "urlopen", fake_urlopen)

    settings_response = client.patch(
        "/api/settings",
        json={"entry_webhook_url": "https://example.com/entry-hook"},
    )
    assert settings_response.status_code == 200

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-hook-1"},
    )
    assert response.status_code == 201
    entry = response.get_json()
    assert captured["url"] == "https://example.com/entry-hook"
    assert json.loads(captured["data"].decode("utf-8")) == entry


def test_create_entry_skips_webhook_without_url(client, monkeypatch):
    called = {"count": 0}

    def fake_urlopen(req, timeout=0):
        called["count"] += 1
        raise AssertionError("urlopen should not be called without webhook URL")

    from src.app.services import webhooks as webhooks_module

    monkeypatch.setattr(webhooks_module.request, "urlopen", fake_urlopen)

    response = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-hook-2"},
    )
    assert response.status_code == 201
    assert called["count"] == 0


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


def test_list_feed_amount_entries_output_filters_and_formats_date(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-output-1",
            "timestamp_utc": "2024-03-01T05:06:00+00:00",
            "expressed_ml": 0,
            "formula_ml": 20,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-output-2",
            "timestamp_utc": "2024-03-02T05:06:00+00:00",
            "expressed_ml": 10,
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "wee",
            "client_event_id": "evt-feed-output-3",
            "timestamp_utc": "2024-03-03T05:06:00+00:00",
            "expressed_ml": 5,
            "formula_ml": 5,
        },
    )

    response = client.get("/api/entries/feeds/output")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 1
    assert payload["entries"] == [
        {"date": "2024 0301", "expressed_ml": 0.0, "formula_ml": 20.0}
    ]


def test_entries_summary_returns_null_when_missing(client):
    response = client.get("/api/entries/summary")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "items": [
            {"title": "Last feed", "date_time": None},
            {"title": "Last wee", "date_time": None},
            {"title": "Last poo", "date_time": None},
            {"title": "Next feed", "date_time": None},
        ],
        "summary": "Last feed: -- · Last wee: -- · Last poo: -- · Next feed: --",
    }


def test_entries_summary_returns_latest_entries(client):
    client.patch("/api/settings", json={"feed_interval_min": 180})
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-last-feed-1",
            "timestamp_utc": "2024-01-01T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-last-feed-2",
            "timestamp_utc": "2024-01-02T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "wee",
            "client_event_id": "evt-last-wee-1",
            "timestamp_utc": "2024-01-03T00:00:00+00:00",
        },
    )
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "poo",
            "client_event_id": "evt-last-poo-1",
            "timestamp_utc": "2024-01-04T00:00:00+00:00",
        },
    )

    response = client.get("/api/entries/summary")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload == {
        "items": [
            {"title": "Last feed", "date_time": "2024-01-02 00:00"},
            {"title": "Last wee", "date_time": "2024-01-03 00:00"},
            {"title": "Last poo", "date_time": "2024-01-04 00:00"},
            {"title": "Next feed", "date_time": "2024-01-02 03:00"},
        ],
        "summary": (
            "Last feed: 2024-01-02 00:00 · Last wee: 2024-01-03 00:00 · "
            "Last poo: 2024-01-04 00:00 · Next feed: 2024-01-02 03:00"
        ),
    }


def test_list_feed_amount_entries_output_returns_all_users(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-user-1",
            "timestamp_utc": "2024-04-01T10:00:00+00:00",
            "expressed_ml": 30,
            "formula_ml": 15,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-feed-user-2",
            "timestamp_utc": "2024-04-02T10:00:00+00:00",
            "expressed_ml": 40,
            "formula_ml": 10,
        },
    )

    response = client.get("/api/entries/feeds/output")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 2
    assert payload["entries"] == [
        {"date": "2024 0402", "expressed_ml": 40.0, "formula_ml": 10.0},
        {"date": "2024 0401", "expressed_ml": 30.0, "formula_ml": 15.0},
    ]


def test_user_scoped_output_routes_removed(client):
    response = client.get("/api/users/suz/entries")
    assert response.status_code == 405

    response = client.get("/api/users/suz/entries/output")
    assert response.status_code == 404

    response = client.get("/api/users/suz/entries/feeds/output")
    assert response.status_code == 404

    response = client.get("/api/users/suz/entries/export")
    assert response.status_code == 404


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

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404


def test_delete_entry_soft_delete_idempotent(client):
    created = client.post(
        "/api/users/suz/entries",
        json={"type": "feed", "client_event_id": "evt-del-2"},
    ).get_json()

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 204

    response = client.delete(f"/api/entries/{created['id']}")
    assert response.status_code == 404

    entries = client.get("/api/entries").get_json()
    assert all(entry["id"] != created["id"] for entry in entries)


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


def test_export_entries_csv_includes_feed_amounts(client):
    client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-export-1",
            "timestamp_utc": "2024-02-01T08:30:00+00:00",
            "feed_duration_min": 12.5,
            "amount_ml": 80,
            "expressed_ml": 40,
            "formula_ml": 20,
        },
    )
    client.post(
        "/api/users/rob/entries",
        json={
            "type": "feed",
            "client_event_id": "evt-export-2",
            "timestamp_utc": "2024-02-02T08:30:00+00:00",
            "feed_duration_min": 10,
            "amount_ml": 60,
            "expressed_ml": 20,
            "formula_ml": 10,
        },
    )
    response = client.get("/api/entries/export")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"

    text = response.get_data(as_text=True)
    lines = [line for line in text.strip().splitlines() if line]
    reader = csv.reader(lines)
    header = next(reader)
    assert header == [
        "id",
        "user_slug",
        "type",
        "timestamp_utc",
        "client_event_id",
        "notes",
        "amount_ml",
        "feed_duration_min",
        "caregiver_id",
        "created_at_utc",
        "updated_at_utc",
        "expressed_ml",
        "formula_ml",
        "deleted_at_utc",
    ]
    rows = list(reader)
    assert len(rows) == 2
    rows_by_id = {
        row_map["client_event_id"]: row_map
        for row_map in (dict(zip(header, row, strict=True)) for row in rows)
    }
    assert set(rows_by_id.keys()) == {"evt-export-1", "evt-export-2"}
    assert rows_by_id["evt-export-1"]["user_slug"] == "suz"
    assert rows_by_id["evt-export-1"]["type"] == "feed"
    assert rows_by_id["evt-export-1"]["timestamp_utc"] == "2024-02-01T08:30:00+00:00"
    assert rows_by_id["evt-export-1"]["amount_ml"] == "80.0"
    assert rows_by_id["evt-export-1"]["feed_duration_min"] == "12.5"
    assert rows_by_id["evt-export-1"]["expressed_ml"] == "40.0"
    assert rows_by_id["evt-export-1"]["formula_ml"] == "20.0"
    assert rows_by_id["evt-export-1"]["deleted_at_utc"] == ""
    assert rows_by_id["evt-export-2"]["user_slug"] == "rob"
