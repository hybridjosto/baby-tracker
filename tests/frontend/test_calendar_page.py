import pytest


@pytest.fixture()
def browser_page():
    sync_api = pytest.importorskip("playwright.sync_api")
    try:
        with sync_api.sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(service_workers="block")
            page = context.new_page()
            try:
                yield page
            finally:
                context.close()
                browser.close()
    except Exception as exc:  # pragma: no cover - environment dependent
        pytest.skip(f"Playwright browser unavailable: {exc}")


def test_calendar_form_creates_and_edits_rendered_event(
    client,
    live_server,
    browser_page,
):
    browser_page.goto(f"{live_server}/calendar/add")
    event_date = browser_page.locator("#calendar-date").input_value()

    browser_page.locator("#calendar-title").fill("Morning playgroup")
    browser_page.locator("#calendar-category").select_option("group")
    browser_page.locator("#calendar-location").fill("Town Hall")
    browser_page.locator("#calendar-start-time").fill("09:30")
    browser_page.locator("#calendar-end-time").fill("10:45")
    browser_page.locator("#calendar-notes").fill("Bring socks")
    browser_page.get_by_role("button", name="Save event").click()

    browser_page.wait_for_url("**/calendar")
    browser_page.wait_for_function(
        "() => document.getElementById('calendar-days').textContent.includes('Morning playgroup')"
    )
    assert "Town Hall" in browser_page.locator("#calendar-days").text_content()

    response = client.get(f"/api/calendar/events?start={event_date}&end={event_date}")
    assert response.status_code == 200
    events = response.get_json()
    assert len(events) == 1

    browser_page.goto(f"{live_server}/calendar/edit/{events[0]['id']}")
    browser_page.wait_for_function(
        "() => document.getElementById('calendar-title').value === 'Morning playgroup'"
    )
    browser_page.locator("#calendar-title").fill("Updated playgroup")
    browser_page.get_by_role("button", name="Save event").click()

    browser_page.wait_for_url("**/calendar")
    browser_page.wait_for_function(
        "() => document.getElementById('calendar-days').textContent.includes('Updated playgroup')"
    )

    response = client.get(f"/api/calendar/events?start={event_date}&end={event_date}")
    assert response.status_code == 200
    events = response.get_json()
    assert events[0]["title"] == "Updated playgroup"
