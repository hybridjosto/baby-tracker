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


def test_goals_page_saves_and_renders_goal(client, live_server, browser_page):
    browser_page.goto(f"{live_server}/goals")
    browser_page.locator("#goal-amount").fill("720")
    browser_page.locator("#goal-start-date").fill("2026-01-01")
    browser_page.get_by_role("button", name="Save goal").click()
    browser_page.wait_for_function(
        "() => document.getElementById('goal-history').textContent.includes('720 ml')"
    )

    history_text = browser_page.locator("#goal-history").text_content()
    assert "Active" in history_text
    assert "720 ml" in history_text

    response = client.get("/api/feeding-goals")
    assert response.status_code == 200
    goals = response.get_json()
    assert len(goals) == 1
    assert goals[0]["goal_ml"] == 720
    assert goals[0]["start_date"] == "2026-01-01"
