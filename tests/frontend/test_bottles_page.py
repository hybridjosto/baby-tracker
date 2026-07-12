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


def test_bottles_page_calculates_and_logs_milk_express(
    client,
    live_server,
    browser_page,
):
    response = client.post(
        "/api/bottles",
        json={"name": "Willow 5oz", "empty_weight_g": 38.5},
    )
    assert response.status_code == 201

    browser_page.goto(f"{live_server}/bottles")
    browser_page.evaluate("localStorage.setItem('baby-tracker-user', 'josh')")
    browser_page.reload()
    browser_page.locator("#bottle-select").select_option(label="Willow 5oz · 38.5 g")
    browser_page.locator("#bottle-total-weight").fill("88.5")
    browser_page.locator("#bottle-result-value").wait_for()

    assert browser_page.locator("#bottle-result-value").text_content() == "50 ml"
    assert browser_page.locator("#bottle-log-milk").is_enabled()

    browser_page.locator("#bottle-log-milk").click()
    browser_page.wait_for_function(
        "() => document.getElementById('bottle-total-weight').value === ''"
    )

    response = client.get("/api/entries?type=milk%20express")
    assert response.status_code == 200
    entries = response.get_json()
    assert len(entries) == 1
    assert entries[0]["user_slug"] == "josh"
    assert entries[0]["expressed_ml"] == 50
