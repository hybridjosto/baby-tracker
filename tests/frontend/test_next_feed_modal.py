from __future__ import annotations

from datetime import datetime, timezone

import pytest


FROZEN_NOW_ISO = "2026-01-01T10:00:00Z"
FROZEN_NOW_UTC = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)


@pytest.fixture()
def browser_page():
    sync_api = pytest.importorskip("playwright.sync_api")
    try:
        with sync_api.sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(
                timezone_id="UTC",
                service_workers="block",
            )
            page = context.new_page()
            page.add_init_script(
                """
                (() => {
                  const fixedNow = new Date("2026-01-01T10:00:00Z").valueOf();
                  const RealDate = Date;
                  class MockDate extends RealDate {
                    constructor(...args) {
                      if (args.length === 0) {
                        super(fixedNow);
                        return;
                      }
                      super(...args);
                    }
                    static now() {
                      return fixedNow;
                    }
                  }
                  MockDate.UTC = RealDate.UTC;
                  MockDate.parse = RealDate.parse;
                  window.Date = MockDate;
                })();
                """
            )
            try:
                yield page
            finally:
                context.close()
                browser.close()
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"Playwright browser unavailable: {exc}")


def _create_feed_entry(
    client, client_event_id: str, timestamp_utc: str, amount_ml: float
) -> None:
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": client_event_id,
            "timestamp_utc": timestamp_utc,
            "amount_ml": amount_ml,
        },
    )
    assert response.status_code == 201


def _create_entry(
    client, client_event_id: str, timestamp_utc: str, entry_type: str, **extra
) -> None:
    response = client.post(
        "/api/users/suz/entries",
        json={
            "type": entry_type,
            "client_event_id": client_event_id,
            "timestamp_utc": timestamp_utc,
            **extra,
        },
    )
    assert response.status_code == 201


def _open_next_feed_modal(page, live_server: str) -> None:
    page.goto(f"{live_server}/suz")
    page.wait_for_function(
        """
        () => {
          const el = document.getElementById("next-feed");
          return Boolean(el && el.dataset.timestamp);
        }
        """
    )
    page.locator("#next-feed").click()
    page.get_by_text("Next feeds").wait_for()


def test_next_feed_modal_shows_small_suggestion_when_big_would_overflow_goal(
    client,
    live_server,
    browser_page,
):
    client.patch(
        "/api/settings",
        json={
            "feed_interval_min": 120,
            "feed_size_small_ml": 120,
            "feed_size_big_ml": 150,
        },
    )
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 680, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-small-1", "2026-01-01T01:00:00Z", 120)
    _create_feed_entry(client, "feed-small-2", "2026-01-01T05:00:00Z", 120)
    _create_feed_entry(client, "feed-small-3", "2026-01-01T09:00:00Z", 320)

    _open_next_feed_modal(browser_page, live_server)

    expect = pytest.importorskip("playwright.sync_api").expect
    expect(browser_page.get_by_text("Suggested: Small (120 ml)").first).to_be_visible()


def test_next_feed_modal_shows_big_suggestion_when_big_stays_under_goal(
    client,
    live_server,
    browser_page,
):
    client.patch(
        "/api/settings",
        json={
            "feed_interval_min": 120,
            "feed_size_small_ml": 120,
            "feed_size_big_ml": 150,
        },
    )
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 700, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-big-1", "2026-01-01T01:00:00Z", 120)
    _create_feed_entry(client, "feed-big-2", "2026-01-01T05:00:00Z", 120)
    _create_feed_entry(client, "feed-big-3", "2026-01-01T09:00:00Z", 220)

    _open_next_feed_modal(browser_page, live_server)

    expect = pytest.importorskip("playwright.sync_api").expect
    expect(browser_page.get_by_text("Suggested: Big (150 ml)").first).to_be_visible()


def test_next_feed_modal_hides_suggestions_when_next_sizes_would_overflow_goal(
    client,
    live_server,
    browser_page,
):
    client.patch(
        "/api/settings",
        json={
            "feed_interval_min": 120,
            "feed_size_small_ml": 120,
            "feed_size_big_ml": 150,
        },
    )
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 680, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-over-1", "2026-01-01T01:00:00Z", 120)
    _create_feed_entry(client, "feed-over-2", "2026-01-01T05:00:00Z", 120)
    _create_feed_entry(client, "feed-over-3", "2026-01-01T09:00:00Z", 340)

    _open_next_feed_modal(browser_page, live_server)

    assert browser_page.locator("text=Suggested:").count() == 0


def test_next_feed_modal_hides_suggestions_when_goal_already_met(
    client,
    live_server,
    browser_page,
):
    client.patch(
        "/api/settings",
        json={
            "feed_interval_min": 120,
            "feed_size_small_ml": 120,
            "feed_size_big_ml": 150,
        },
    )
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 300, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-met-1", "2026-01-01T07:00:00Z", 150)
    _create_feed_entry(client, "feed-met-2", "2026-01-01T09:00:00Z", 180)

    _open_next_feed_modal(browser_page, live_server)

    assert browser_page.locator("text=Suggested:").count() == 0


def test_next_feed_modal_plans_against_full_remaining_day_not_visible_rows(
    client,
    live_server,
    browser_page,
):
    client.patch(
        "/api/settings",
        json={
            "feed_interval_min": 90,
            "feed_size_small_ml": 120,
            "feed_size_big_ml": 150,
        },
    )
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 900, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-hidden-day-1", "2026-01-01T09:00:00Z", 120)

    _open_next_feed_modal(browser_page, live_server)

    expect = pytest.importorskip("playwright.sync_api").expect
    expect(browser_page.get_by_text("Suggested: Small (120 ml)").first).to_be_visible()
    assert browser_page.locator("text=Suggested: Big (150 ml)").count() == 0
    assert browser_page.locator("text=Suggested: Small (120 ml)").count() == 6
    assert browser_page.locator("text=Rolling total: 240 ml").count() == 1
    assert browser_page.locator("text=Rolling total: 840 ml").count() == 1


def test_homepage_stats_default_to_today_and_flip_to_24h(
    client,
    live_server,
    browser_page,
):
    goal_response = client.post(
        "/api/feeding-goals",
        json={"goal_ml": 200, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201

    _create_entry(client, "feed-prev-24h", "2025-12-31T12:00:00Z", "feed", amount_ml=30)
    _create_entry(client, "feed-today", "2026-01-01T07:00:00Z", "feed", amount_ml=120)
    _create_entry(client, "wee-prev-24h", "2025-12-31T20:00:00Z", "wee")
    _create_entry(client, "poo-today", "2026-01-01T08:00:00Z", "poo")

    browser_page.goto(f"{live_server}/suz")
    browser_page.wait_for_function(
        """
        () => {
          const feed = document.getElementById("stat-feed-ml-today");
          const goal = document.getElementById("stat-goal-progress-today");
          const feeds = document.getElementById("stat-feed-today");
          const nappies = document.getElementById("stat-nappy-today");
          return feed && feed.textContent === "120 ml"
            && goal && goal.textContent === "60%"
            && feeds && feeds.textContent === "1"
            && nappies && nappies.textContent === "1";
        }
        """
    )

    assert browser_page.locator("#stat-feed-ml-today").text_content() == "120 ml"
    assert browser_page.locator("#stat-goal-progress-today").text_content() == "60%"
    assert browser_page.locator("#stat-feed-today").text_content() == "1"
    assert browser_page.locator("#stat-nappy-today").text_content() == "1"

    feed_total_card = browser_page.locator('[data-home-stat-key="feed-total"]')
    goal_card = browser_page.locator('[data-home-stat-key="goal"]')
    feeds_card = browser_page.locator('[data-home-stat-key="feeds"]')
    nappies_card = browser_page.locator('[data-home-stat-key="nappies"]')

    assert "is-flipped" not in (feed_total_card.get_attribute("class") or "")
    assert "is-flipped" not in (goal_card.get_attribute("class") or "")
    assert "is-flipped" not in (feeds_card.get_attribute("class") or "")
    assert "is-flipped" not in (nappies_card.get_attribute("class") or "")

    feed_total_card.click()
    goal_card.click()
    feeds_card.click()
    nappies_card.click()

    assert browser_page.locator("#stat-feed-ml-24h").text_content() == "150 ml"
    assert browser_page.locator("#stat-goal-progress-24h").text_content() == "75%"
    assert browser_page.locator("#stat-feed-24h").text_content() == "2"
    assert browser_page.locator("#stat-nappy-24h").text_content() == "2"
    assert "is-flipped" in (feed_total_card.get_attribute("class") or "")
    assert "is-flipped" in (goal_card.get_attribute("class") or "")
    assert "is-flipped" in (feeds_card.get_attribute("class") or "")
    assert "is-flipped" in (nappies_card.get_attribute("class") or "")
