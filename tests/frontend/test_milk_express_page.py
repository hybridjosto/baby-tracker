from datetime import datetime, timedelta, timezone

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


def test_milk_express_page_renders_ledger_and_selection(
    client,
    live_server,
    browser_page,
):
    now = datetime.now(timezone.utc)
    entries = [
        ("evt-milk-ledger-1", now - timedelta(hours=1), 120),
        ("evt-milk-ledger-2", now - timedelta(hours=2), 50),
    ]
    for event_id, timestamp, amount in entries:
        response = client.post(
            "/api/users/josh/entries",
            json={
                "type": "milk express",
                "client_event_id": event_id,
                "timestamp_utc": timestamp.isoformat(),
                "expressed_ml": amount,
            },
        )
        assert response.status_code == 201

    browser_page.goto(f"{live_server}/milk-express")
    browser_page.wait_for_function(
        "() => document.querySelectorAll('#milk-express-ledger-body tr').length === 2"
    )

    assert browser_page.locator("#milk-express-ledger-total-all").text_content() == "Total: 170 ml"
    assert browser_page.locator("#milk-express-ledger-selection").is_visible()

    browser_page.locator("#milk-express-ledger-select-all").check()
    assert browser_page.locator("#milk-express-ledger-count").text_content() == "2 items"
    assert browser_page.locator("#milk-express-ledger-total").text_content() == "170 ml"

    browser_page.locator("#milk-express-ledger-clear").click()
    assert browser_page.locator("#milk-express-ledger-count").text_content() == "0 items"
    assert browser_page.locator("#milk-express-ledger-total").text_content() == "0 ml"
