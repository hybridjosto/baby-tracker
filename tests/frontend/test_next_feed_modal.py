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


def _create_feed_entry(client, client_event_id: str, timestamp_utc: str, amount_ml: float) -> None:
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


def test_next_feed_modal_shows_small_suggestion_when_small_keeps_plan_viable(
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
        json={"goal_ml": 900, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-small-1", "2026-01-01T07:00:00Z", 120)
    _create_feed_entry(client, "feed-small-2", "2026-01-01T09:00:00Z", 120)

    _open_next_feed_modal(browser_page, live_server)

    expect = pytest.importorskip("playwright.sync_api").expect
    expect(browser_page.get_by_text("Suggested: Small (120 ml)").first).to_be_visible()


def test_next_feed_modal_shows_big_suggestion_when_small_would_leave_day_short(
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
        json={"goal_ml": 760, "start_date": "2026-01-01"},
    )
    assert goal_response.status_code == 201
    _create_feed_entry(client, "feed-big-1", "2026-01-01T01:00:00Z", 120)
    _create_feed_entry(client, "feed-big-2", "2026-01-01T05:00:00Z", 120)
    _create_feed_entry(client, "feed-big-3", "2026-01-01T09:00:00Z", 220)

    _open_next_feed_modal(browser_page, live_server)

    expect = pytest.importorskip("playwright.sync_api").expect
    expect(browser_page.get_by_text("Suggested: Big (150 ml)").first).to_be_visible()


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
