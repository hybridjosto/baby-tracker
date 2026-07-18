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


def test_settings_only_offers_entry_confirmations(live_server, browser_page, tmp_path):
    expect = pytest.importorskip("playwright.sync_api").expect
    console_errors = []
    browser_page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    browser_page.add_init_script(
        "window.localStorage.setItem('baby-tracker-user', 'suz');"
    )

    browser_page.goto(f"{live_server}/settings")

    expect(browser_page).to_have_title("Baby Tracker Settings")
    confirmations_heading = browser_page.get_by_text(
        "Entry confirmations on this device", exact=True
    )
    expect(confirmations_heading).to_be_visible()
    expect(
        browser_page.get_by_text(
            "Feed-due reminders are no longer sent.", exact=False
        )
    ).to_be_visible()
    expect(
        browser_page.get_by_text("Feed reminders on this device", exact=True)
    ).to_have_count(0)
    expect(browser_page.locator("#test-feed-due-notification")).to_have_count(0)
    confirmations_heading.scroll_into_view_if_needed()
    browser_page.screenshot(path=str(tmp_path / "settings-entry-confirmations.png"))

    browser_page.set_viewport_size({"width": 390, "height": 844})
    confirmations_heading.scroll_into_view_if_needed()
    browser_page.screenshot(
        path=str(tmp_path / "settings-entry-confirmations-mobile.png")
    )

    browser_page.locator("#nav-menu-toggle").scroll_into_view_if_needed()
    browser_page.locator("#nav-menu-toggle").click()
    expect(browser_page.locator("#nav-menu-panel")).to_have_attribute(
        "aria-hidden", "false"
    )
    assert console_errors == []
