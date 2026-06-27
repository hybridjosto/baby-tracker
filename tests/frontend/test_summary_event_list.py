from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_summary_has_selected_day_event_list_and_ai_summary_at_bottom():
    summary = (ROOT / "src/web/templates/summary.html").read_text(encoding="utf-8")

    assert 'id="summary-events-list"' in summary
    assert 'id="summary-events-empty"' in summary
    assert 'id="summary-events-count"' in summary
    assert summary.index('id="summary-events-panel"') < summary.index('id="ai-summary-panel"')
    assert summary.index('id="ai-chat-form"') < summary.index('id="ai-summary-panel"')


def test_summary_event_list_uses_selected_day_entries():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")

    assert "function renderSummaryEventList(entries)" in javascript
    assert "renderSummaryEventList(cachedEntries);" in javascript
    assert "renderSummaryEventList(entries);" in javascript
    assert 'summaryEventsCountEl.textContent = `${count} event${count === 1 ? "" : "s"} · selected day`;' in javascript
