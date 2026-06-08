from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_log_page_contains_ai_backfill_controls(client):
    template = (ROOT / "src/web/templates/log.html").read_text(encoding="utf-8")
    response = client.get("/log")

    assert response.status_code == 200
    rendered = response.get_data(as_text=True)
    assert 'id="backfill-input"' in template
    assert 'id="backfill-parse"' in template
    assert 'id="backfill-drafts"' in template
    assert 'id="backfill-save"' in template
    assert "Import CSV" in template
    assert "Add previous entries with AI" in rendered
    assert 'id="backfill-input"' in rendered


def test_backfill_frontend_calls_parse_and_commit_endpoints():
    javascript = (ROOT / "src/web/static/app.js").read_text(encoding="utf-8")

    assert "/entries/backfill/parse" in javascript
    assert "/entries/backfill/commit" in javascript
    assert "reference_time_utc: new Date().toISOString()" in javascript
    assert "Intl.DateTimeFormat().resolvedOptions().timeZone" in javascript
    assert "Mark warnings reviewed" in javascript
