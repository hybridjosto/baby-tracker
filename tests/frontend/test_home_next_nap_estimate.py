from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_home_sleep_card_has_next_nap_estimate():
    home = (ROOT / "src/web/templates/index.html").read_text(encoding="utf-8")

    assert 'id="home-next-nap-estimate"' in home
    assert 'id="home-next-nap-time"' in home
    assert 'id="home-next-nap-detail"' in home
    assert "Next nap estimate" in home
    assert "Checking the last 3 days" in home


def test_next_nap_estimate_uses_recent_median_wake_windows():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")

    assert "const NAP_ESTIMATE_LOOKBACK_DAYS = 3;" in javascript
    assert "const NAP_ESTIMATE_MIN_SAMPLES = 2;" in javascript
    assert "function buildNextNapEstimate(entries, now = new Date())" in javascript
    assert "const typicalWakeMinutes = getMedian(wakeWindows);" in javascript
    assert "latestCompleted.endMs + typicalWakeMinutes * 60000" in javascript
    assert 'time: "Asleep now"' in javascript
    assert 'time: "Learning pattern"' in javascript
    assert "renderNextNapEstimate(sleepEntries);" in javascript
