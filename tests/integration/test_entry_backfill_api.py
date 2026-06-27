import json


def _draft(
    draft_id: str,
    entry_type: str,
    timestamp_utc: str,
    **overrides,
) -> dict:
    draft = {
        "draft_id": draft_id,
        "type": entry_type,
        "timestamp_utc": timestamp_utc,
        "notes": None,
        "amount_ml": None,
        "expressed_ml": None,
        "formula_ml": None,
        "feed_duration_min": None,
        "weight_kg": None,
        "warnings": [],
    }
    draft.update(overrides)
    return draft


def test_parse_backfill_returns_validated_drafts(client, monkeypatch):
    from src.app.services import entry_backfill

    monkeypatch.setenv("BABY_TRACKER_OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: json.dumps(
            {
                "drafts": [
                    _draft(
                        "feed-1",
                        "feed",
                        "2026-06-06T07:00:00+00:00",
                        formula_ml=120,
                    ),
                    _draft(
                        "sleep-1",
                        "sleep",
                        "2026-06-06T08:30:00+00:00",
                        feed_duration_min=90,
                    ),
                    _draft(
                        "wee-1",
                        "wee",
                        "2026-06-06T10:15:00+00:00",
                    ),
                ]
            }
        ),
    )

    response = client.post(
        "/api/users/suz/entries/backfill/parse",
        json={
            "text": "Yesterday feed 120ml at 8, slept 9:30-11, wee 11:15",
            "reference_time_utc": "2026-06-07T12:00:00+00:00",
            "timezone": "Europe/London",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["batch_id"]) == 32
    assert payload["count"] == 3
    assert payload["truncated"] is False
    assert all(draft["valid"] for draft in payload["drafts"])
    assert payload["drafts"][0]["formula_ml"] == 120.0
    assert payload["drafts"][1]["feed_duration_min"] == 90.0
    assert payload["timezone"] == "Europe/London"


def test_parse_backfill_flags_ambiguous_and_invalid_drafts(client, monkeypatch):
    from src.app.services import entry_backfill

    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: json.dumps(
            {
                "drafts": [
                    _draft(
                        "feed-1",
                        "feed",
                        "2026-06-06T07:00:00+00:00",
                        warnings=["Feed amount was not supplied."],
                    ),
                    _draft(
                        "unknown-1",
                        "invented",
                        "2026-06-06T08:00:00+00:00",
                    ),
                ]
            }
        ),
    )

    response = client.post(
        "/api/users/suz/entries/backfill/parse",
        json={
            "text": "Yesterday morning feed and something happened",
            "reference_time_utc": "2026-06-07T12:00:00+00:00",
        },
    )

    assert response.status_code == 200
    drafts = response.get_json()["drafts"]
    assert drafts[0]["valid"] is False
    assert "feed entries require an amount in ml" in drafts[0]["errors"]
    assert drafts[0]["warnings"] == ["Feed amount was not supplied."]
    assert drafts[1]["valid"] is False
    assert "type must be one of the allowed entry types" in drafts[1]["errors"]


def test_parse_backfill_supports_configured_custom_types_and_limits_to_ten(
    client, monkeypatch
):
    from src.app.services import entry_backfill

    client.patch("/api/settings", json={"custom_event_types": ["medicine"]})
    raw_drafts = [
        _draft(
            f"draft-{index}",
            "medicine",
            f"2026-06-06T{index:02d}:00:00+00:00",
        )
        for index in range(11)
    ]
    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: json.dumps({"drafts": raw_drafts}),
    )

    response = client.post(
        "/api/users/suz/entries/backfill/parse",
        json={
            "text": "Several medicine entries",
            "reference_time_utc": "2026-06-07T12:00:00+00:00",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["count"] == 10
    assert payload["truncated"] is True
    assert "medicine" in payload["allowed_types"]
    assert all(draft["type"] == "medicine" for draft in payload["drafts"])


def test_parse_backfill_rejects_malformed_openai_response(client, monkeypatch):
    from src.app.services import entry_backfill

    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: '{"not_drafts": []}',
    )

    response = client.post(
        "/api/users/suz/entries/backfill/parse",
        json={"text": "Yesterday feed 120ml"},
    )

    assert response.status_code == 502
    assert response.get_json()["error"] == "OpenAI returned invalid backfill drafts"


def test_shortcut_backfill_parses_and_commits_in_one_request(client, monkeypatch):
    from src.app.services import entry_backfill

    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: json.dumps(
            {
                "drafts": [
                    _draft(
                        "feed-1",
                        "feed",
                        "2026-06-06T07:00:00+00:00",
                        formula_ml=120,
                    ),
                    _draft(
                        "wee-1",
                        "wee",
                        "2026-06-06T08:00:00+00:00",
                    ),
                ]
            }
        ),
    )
    request_payload = {
        "text": "Yesterday at 8am 120ml formula, then a wee at 9am",
        "reference_time_utc": "2026-06-07T12:00:00+00:00",
        "timezone": "Europe/London",
        "request_id": "shortcut-run-123",
    }

    first = client.post(
        "/api/users/suz/entries/backfill",
        json=request_payload,
    )
    second = client.post(
        "/api/users/suz/entries/backfill",
        json=request_payload,
    )

    assert first.status_code == 201
    assert first.get_json()["created"] == 2
    assert first.get_json()["duplicates"] == 0
    assert first.get_json()["parsed"] == 2
    assert first.get_json()["request_id"] == "shortcut-run-123"
    assert second.status_code == 201
    assert second.get_json()["created"] == 0
    assert second.get_json()["duplicates"] == 2
    assert second.get_json()["batch_id"] == first.get_json()["batch_id"]
    entries = client.get("/api/entries").get_json()
    assert len(entries) == 2


def test_shortcut_backfill_does_not_save_ambiguous_drafts(client, monkeypatch):
    from src.app.services import entry_backfill

    monkeypatch.setattr(
        entry_backfill,
        "_call_openai",
        lambda **kwargs: json.dumps(
            {
                "drafts": [
                    _draft(
                        "feed-1",
                        "feed",
                        "2026-06-06T07:00:00+00:00",
                        warnings=["Feed amount was not supplied."],
                    )
                ]
            }
        ),
    )

    response = client.post(
        "/api/users/suz/entries/backfill",
        json={
            "text": "Yesterday morning there was a feed",
            "reference_time_utc": "2026-06-07T12:00:00+00:00",
        },
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Backfill entries require correction"
    assert payload["drafts"][0]["warnings"] == ["Feed amount was not supplied."]
    assert client.get("/api/entries").get_json() == []


def test_commit_backfill_is_atomic_and_rejects_unresolved_warnings(client):
    response = client.post(
        "/api/users/suz/entries/backfill/commit",
        json={
            "batch_id": "a" * 32,
            "entries": [
                _draft(
                    "feed-1",
                    "feed",
                    "2026-06-06T07:00:00+00:00",
                    formula_ml=120,
                ),
                _draft(
                    "sleep-1",
                    "sleep",
                    "2026-06-06T08:30:00+00:00",
                    feed_duration_min=90,
                    warnings=["Confirm the sleep end time."],
                ),
            ],
        },
    )

    assert response.status_code == 400
    assert response.get_json()["details"][0]["draft_id"] == "sleep-1"
    entries = client.get("/api/entries").get_json()
    assert entries == []


def test_commit_backfill_is_retry_safe_and_does_not_stop_active_sleep(client):
    active_sleep = client.post(
        "/api/users/suz/entries",
        json={
            "type": "sleep",
            "client_event_id": "active-sleep-before-backfill",
            "timestamp_utc": "2026-06-07T10:00:00+00:00",
        },
    ).get_json()
    request_payload = {
        "batch_id": "b" * 32,
        "entries": [
            _draft(
                "feed-1",
                "feed",
                "2026-06-06T07:00:00+00:00",
                amount_ml=100,
            ),
            _draft(
                "weight-1",
                "weight",
                "2026-06-06T12:00:00+00:00",
                weight_kg=6.25,
            ),
        ],
    }

    first = client.post(
        "/api/users/suz/entries/backfill/commit",
        json=request_payload,
    )
    second = client.post(
        "/api/users/suz/entries/backfill/commit",
        json=request_payload,
    )

    assert first.status_code == 201
    assert first.get_json()["created"] == 2
    assert first.get_json()["duplicates"] == 0
    assert second.status_code == 201
    assert second.get_json()["created"] == 0
    assert second.get_json()["duplicates"] == 2
    sleeps = client.get("/api/entries?type=sleep").get_json()
    assert sleeps[0]["id"] == active_sleep["id"]
    assert sleeps[0]["feed_duration_min"] is None


def test_backfill_idempotency_is_scoped_to_user(client):
    payload = {
        "batch_id": "d" * 32,
        "entries": [
            _draft(
                "wee-1",
                "wee",
                "2026-06-06T07:00:00+00:00",
            )
        ],
    }

    suz = client.post("/api/users/suz/entries/backfill/commit", json=payload)
    rob = client.post("/api/users/rob/entries/backfill/commit", json=payload)

    assert suz.status_code == 201
    assert suz.get_json()["created"] == 1
    assert rob.status_code == 201
    assert rob.get_json()["created"] == 1
    entries = client.get("/api/entries").get_json()
    assert {entry["user_slug"] for entry in entries} == {"suz", "rob"}


def test_commit_backfill_rejects_future_timestamp(client):
    response = client.post(
        "/api/users/suz/entries/backfill/commit",
        json={
            "batch_id": "c" * 32,
            "entries": [
                _draft(
                    "wee-1",
                    "wee",
                    "2999-06-06T07:00:00+00:00",
                )
            ],
        },
    )

    assert response.status_code == 400
    assert "timestamp_utc cannot be in the future" in response.get_json()["details"][0][
        "errors"
    ]
