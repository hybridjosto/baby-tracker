from datetime import datetime, timedelta, timezone


def _post_feed(client, timestamp, amount_ml=0, expressed_ml=0, formula_ml=0):
    payload = {
        "user_slug": "josh",
        "type": "feed",
        "timestamp_utc": timestamp,
        "client_event_id": f"evt-{timestamp}",
    }
    if amount_ml:
        payload["amount_ml"] = amount_ml
    if expressed_ml:
        payload["expressed_ml"] = expressed_ml
    if formula_ml:
        payload["formula_ml"] = formula_ml
    return client.post("/api/entries", json=payload)


def test_feed_coach_suggests_next_amount_range(client):
    client.patch(
        "/api/settings",
        json={
            "feed_goal_min": 7,
            "feed_goal_max": 8,
            "overnight_gap_min_hours": 4,
            "overnight_gap_max_hours": 5,
            "behind_target_mode": "increase_next",
        },
    )
    client.post("/api/feeding-goals", json={"goal_ml": 700, "start_date": "2026-01-21"})

    now = datetime.now(timezone.utc)
    _post_feed(client, (now - timedelta(hours=1)).isoformat(), amount_ml=120)
    _post_feed(client, (now - timedelta(hours=2)).isoformat(), formula_ml=80)

    response = client.get("/api/feed-coach")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["total_ml"] == 200
    assert payload["feed_count"] == 2
    assert payload["remaining_ml"] == 500
    assert payload["feeds_remaining_min"] == 5
    assert payload["feeds_remaining_max"] == 6
    assert payload["suggested_next_min_ml"] == 84
    assert payload["suggested_next_max_ml"] == 100


def test_feed_coach_adds_extra_feed_when_behind_and_at_max(client):
    client.patch(
        "/api/settings",
        json={
            "feed_goal_min": 2,
            "feed_goal_max": 2,
            "behind_target_mode": "add_feed",
        },
    )
    client.post("/api/feeding-goals", json={"goal_ml": 400, "start_date": "2026-01-21"})

    now = datetime.now(timezone.utc)
    _post_feed(client, (now - timedelta(hours=1)).isoformat(), amount_ml=200)
    _post_feed(client, (now - timedelta(hours=2)).isoformat(), amount_ml=50)

    response = client.get("/api/feed-coach")
    payload = response.get_json()
    assert payload["remaining_ml"] == 150
    assert payload["feeds_remaining_max"] == 1
    assert payload["suggested_next_min_ml"] == 150
    assert payload["suggested_next_max_ml"] == 150
