import pytest


@pytest.mark.parametrize(
    ("path", "marker"),
    [
        ("/", b"Baby Activity"),
        ("/log", b"Event Log"),
        ("/summary", b"Summary"),
        ("/timeline", b"Timeline"),
        ("/calendar", b"Calendar"),
        ("/calendar/add", b"Calendar"),
        ("/milk-express", b"Milk Express"),
        ("/bottles", b"Bottle library"),
        ("/weight", b"Weight"),
        ("/nappy-stock", b"Nappy Stock"),
        ("/settings", b"Settings"),
        ("/goals", b"Feeding goals"),
    ],
)
def test_shared_page_routes_render(client, path, marker):
    response = client.get(path)

    assert response.status_code == 200
    assert marker in response.data


@pytest.mark.parametrize(
    ("path", "marker"),
    [
        ("/josh", b"Logging as josh"),
        ("/josh/log", b"Logging as josh"),
        ("/josh/log/feed", b"Feed log"),
        ("/josh/summary", b"Logging as josh"),
        ("/josh/timeline", b"Logging as josh"),
        ("/josh/milk-express", b"Logging as josh"),
        ("/josh/bottles", b"Shared bottle library"),
        ("/josh/weight", b'data-user="josh"'),
        ("/josh/nappy-stock", b"Logging as josh"),
    ],
)
def test_user_page_routes_render(client, path, marker):
    response = client.get(path)

    assert response.status_code == 200
    assert marker in response.data


def test_invalid_user_page_route_returns_bad_request(client):
    response = client.get("/bad user/log")

    assert response.status_code == 400
    assert b"user_slug must be 1-24 chars" in response.data


def test_served_quick_feed_menu_has_three_formula_sizes(client):
    response = client.get("/josh")

    assert response.status_code == 200
    assert b'id="feed-toggle-expressed"' not in response.data
    assert b'data-quick-size="small"' in response.data
    assert b'data-quick-size="medium"' in response.data
    assert b'data-quick-size="big"' in response.data
    assert b'id="feed-manual-toggle"' in response.data


def test_invalid_log_type_returns_bad_request(client):
    response = client.get("/josh/log/!!!")

    assert response.status_code == 400
    assert b"type must use letters" in response.data


def test_service_worker_route_sets_expected_headers(client):
    response = client.get("/sw.js")

    assert response.status_code == 200
    assert response.content_type == "application/javascript"
    assert response.headers["Service-Worker-Allowed"] == "/"
    assert response.headers["Cache-Control"] == "no-store, must-revalidate"
