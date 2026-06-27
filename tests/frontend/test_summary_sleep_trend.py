from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_summary_sleep_trend_has_goal_band_and_split_legend():
    summary = (ROOT / "src/web/templates/summary.html").read_text(encoding="utf-8")

    assert "sleep-trend-goal-band" in summary
    assert "Goal 12–15h" in summary
    assert ">Day</span" in summary
    assert ">Night</span" in summary
    assert 'viewBox="0 0 320 112"' in summary


def test_summary_sleep_trend_uses_clipped_day_night_buckets():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")

    assert "const split = getSplitSleepMinutesForDay(entries, date);" in javascript
    assert "const goalMinMinutes = 12 * 60;" in javascript
    assert "const goalMaxMinutes = 15 * 60;" in javascript
    assert 'appendTrendPath(buildPoints("dayMinutes"), "sleep-trend-line-day");' in javascript
    assert 'appendTrendPath(buildPoints("nightMinutes"), "sleep-trend-line-night");' in javascript
    assert "showGoalBand: true," in javascript
    assert "showSplitSeries: true," in javascript
    assert "trendWindow.since.setDate(trendWindow.since.getDate() - 8);" in javascript
