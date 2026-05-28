import json


def test_llm_chat_returns_grounded_answer(client, monkeypatch):
    from src.app.services import llm_chat as llm_chat_module

    def fake_call_openai_chat(model, prompt, timeout_seconds):
        assert model == "gpt-4.1-mini"
        assert "How did last night's sleep go?" in prompt
        assert '"sleep"' in prompt
        return json.dumps(
            {
                "answer": "Last night had one tracked sleep stretch.",
                "grounded_facts": ["Sleep total was 3 hours."],
                "possible_explanations": [],
                "suggested_followups": ["How were feeds?"],
            }
        )

    monkeypatch.setattr(
        llm_chat_module,
        "_call_openai_chat",
        fake_call_openai_chat,
    )
    create_response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "sleep",
            "client_event_id": "chat-sleep-1",
            "timestamp_utc": "2026-05-13T22:00:00+00:00",
            "feed_duration_min": 180,
        },
    )
    assert create_response.status_code == 201

    response = client.post(
        "/api/entries/llm-chat",
        json={
            "question": "How did last night's sleep go?",
            "since_utc": "2026-05-13T18:00:00+00:00",
            "until_utc": "2026-05-14T08:00:00+00:00",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["event_count"] == 1
    assert payload["facts"]["sleep"]["total_hours"] == 3.0
    assert payload["answer"].startswith("Last night had one tracked sleep stretch.")
    assert "### From the tracker" in payload["answer"]
    assert "### What might explain it" not in payload["answer"]
    assert payload["suggested_followups"] == ["How were feeds?"]


def test_llm_chat_rejects_empty_question(client):
    response = client.post("/api/entries/llm-chat", json={"question": "   "})

    assert response.status_code == 400
    assert response.get_json()["error"] == "question is required"


def test_llm_chat_rejects_invalid_window(client):
    response = client.post(
        "/api/entries/llm-chat",
        json={
            "question": "How was sleep?",
            "since_utc": "2026-05-14T08:00:00+00:00",
            "until_utc": "2026-05-14T07:00:00+00:00",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "since_utc must be before until_utc"


def test_llm_chat_returns_empty_data_answer_without_openai(client, monkeypatch):
    from src.app.services import llm_chat as llm_chat_module

    called = {"count": 0}

    def fake_call_openai_chat(model, prompt, timeout_seconds):
        called["count"] += 1
        raise AssertionError("OpenAI should not be called with no events")

    monkeypatch.setattr(
        llm_chat_module,
        "_call_openai_chat",
        fake_call_openai_chat,
    )

    response = client.post(
        "/api/entries/llm-chat",
        json={
            "question": "How was sleep?",
            "since_utc": "2026-05-13T18:00:00+00:00",
            "until_utc": "2026-05-14T08:00:00+00:00",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["event_count"] == 0
    assert payload["skipped"] is True
    assert "could not find any tracked events" in payload["answer"]
    assert called["count"] == 0


def test_llm_chat_maps_upstream_error(client, monkeypatch):
    from src.app.services import llm_chat as llm_chat_module

    def fake_call_openai_chat(model, prompt, timeout_seconds):
        raise llm_chat_module.LlmChatError("OpenAI is unavailable", 503)

    monkeypatch.setattr(
        llm_chat_module,
        "_call_openai_chat",
        fake_call_openai_chat,
    )
    create_response = client.post(
        "/api/users/suz/entries",
        json={
            "type": "feed",
            "client_event_id": "chat-feed-1",
            "timestamp_utc": "2026-05-14T06:00:00+00:00",
            "formula_ml": 90,
        },
    )
    assert create_response.status_code == 201

    response = client.post(
        "/api/entries/llm-chat",
        json={
            "question": "How was feeding?",
            "since_utc": "2026-05-14T00:00:00+00:00",
            "until_utc": "2026-05-15T00:00:00+00:00",
        },
    )

    assert response.status_code == 503
    assert response.get_json()["error"] == "OpenAI is unavailable"
