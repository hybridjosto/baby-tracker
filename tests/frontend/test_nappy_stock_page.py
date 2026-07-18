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


def test_nappy_stock_page_saves_threshold_and_adds_packs(
    client,
    live_server,
    browser_page,
):
    response = client.post(
        "/api/nappy-stock",
        json={
            "total_count": 10,
            "threshold_count": 3,
            "stock_added_at_utc": "2026-07-10T08:00:00+00:00",
        },
    )
    assert response.status_code == 201

    browser_page.goto(f"{live_server}/nappy-stock")
    browser_page.locator("#nappy-stock-remaining").wait_for()
    assert browser_page.locator("#nappy-stock-remaining").text_content() == "10"

    browser_page.locator("#nappy-stock-threshold").fill("5")
    browser_page.locator("#nappy-stock-threshold-save").click()
    browser_page.wait_for_function(
        "() => document.getElementById('nappy-stock-alert-detail')"
        ".textContent.includes('threshold 5')"
    )

    browser_page.get_by_text("Packs", exact=True).click()
    browser_page.locator("#nappy-stock-pack-count").fill("2")
    browser_page.locator("#nappy-stock-pack-size").fill("24")
    assert (
        browser_page.locator("#nappy-stock-pack-total").text_content()
        == "48 nappies will be added."
    )
    browser_page.locator("#nappy-stock-save").click()
    browser_page.wait_for_function(
        "() => document.getElementById('nappy-stock-remaining').textContent === '58'"
    )

    response = client.get("/api/nappy-stock")
    assert response.status_code == 200
    data = response.get_json()
    assert data["remaining_count"] == 58
    assert data["threshold_count"] == 5
