from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_shared_styles_cover_phone_tablet_and_desktop_layouts():
    styles = (ROOT / "src/web/static/styles.css").read_text(encoding="utf-8")

    assert "overflow-x: hidden;" in styles
    assert "max-width: min(720px, 100%);" in styles
    assert "@media (min-width: 768px)" in styles
    assert "@media (max-width: 640px)" in styles
    assert "max-height: calc(100dvh - 84px);" in styles


def test_home_and_summary_expand_beyond_phone_width():
    home = (ROOT / "src/web/templates/index.html").read_text(encoding="utf-8")
    summary = (ROOT / "src/web/templates/summary.html").read_text(encoding="utf-8")

    assert "max-width: 960px;" in home
    assert "height: 100dvh;" in home
    assert "max-width: min(720px, 100%);" in home
    assert "max-width: 960px;" in summary
    assert 'class="home-trend-grid"' in home
    assert "grid-template-columns: repeat(2, minmax(0, 1fr));" in home


def test_chart_labels_use_svg_axis_coordinates():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")
    home = (ROOT / "src/web/templates/index.html").read_text(encoding="utf-8")
    summary = (ROOT / "src/web/templates/summary.html").read_text(encoding="utf-8")
    weight = (ROOT / "src/web/templates/weight.html").read_text(encoding="utf-8")

    assert "function appendChartAxisLabel(" in javascript
    assert "labelEl.style.left = `${(x / chartWidth) * 100}%`;" in javascript
    assert "x + barWidth / 2" in javascript
    assert "const width = 640;" in javascript
    assert "Age in weeks / months" in javascript
    assert "function formatCompletedWeeks(ageWeeks)" in javascript
    assert "Math.floor(ageWeeks)" in javascript
    assert "Math.round(latest.ageWeeks)" not in javascript
    assert "{ label: \"0.4th\", z: -2.6521, style: \"dashed\" }" in javascript
    assert "{ label: \"99.6th\", z: 2.6521, style: \"dashed\" }" in javascript
    assert "transform: translateX(-50%);" in home
    assert "transform: translateX(-50%);" in summary
    assert "transform: translateX(-50%);" in weight
    assert "width: min(100%, 320px);" in home
    assert "width: 640px;" in summary
    assert "width: 640px;" in weight
    assert "@media (max-width: 540px) and (orientation: landscape)" in summary
    assert "@media (max-width: 540px) and (orientation: landscape)" in weight


def test_home_refresh_keeps_vertical_position_and_timers_use_header():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")
    home = (ROOT / "src/web/templates/index.html").read_text(encoding="utf-8")

    assert "latestPanelEl.scrollIntoView" not in javascript
    assert "chartScrollEl.scrollLeft = chartScrollEl.scrollWidth;" in javascript
    assert "function syncHomeHeaderTimerState()" in javascript
    assert 'id="home-header-default"' in home
    assert 'id="home-header-timers"' in home
    assert home.index('id="home-header-timers"') < home.index('<main class="content">')
    assert home.count('{% include "active_timer_banners.html" %}') == 1


def test_background_network_work_is_throttled():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")
    service_worker = (ROOT / "src/web/templates/sw.js").read_text(encoding="utf-8")

    assert "const BACKGROUND_SYNC_INTERVAL_MS = 5 * 60 * 1000;" in javascript
    assert "const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;" in javascript
    assert 'document.visibilityState === "hidden"' in javascript
    assert "autoRefreshInFlight" in javascript
    assert "./summary" not in service_worker
    assert "./timeline" not in service_worker
    assert "./settings" not in service_worker
