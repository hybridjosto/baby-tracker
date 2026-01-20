from src.app.storage.db import get_connection, init_db
from src.app.storage.feeding_goals import create_goal, list_goals


def test_create_and_list_goals_ordered(tmp_path):
    db_path = tmp_path / "goals.sqlite"
    init_db(str(db_path))
    with get_connection(str(db_path)) as conn:
        create_goal(
            conn,
            {
                "goal_ml": 500,
                "start_date": "2024-01-03",
                "created_at_utc": "2024-01-03T09:00:00+00:00",
            },
        )
        create_goal(
            conn,
            {
                "goal_ml": 700,
                "start_date": "2024-01-04",
                "created_at_utc": "2024-01-04T08:00:00+00:00",
            },
        )
        create_goal(
            conn,
            {
                "goal_ml": 650,
                "start_date": "2024-01-04",
                "created_at_utc": "2024-01-04T12:00:00+00:00",
            },
        )
        goals = list_goals(conn, limit=10)
    assert goals[0]["goal_ml"] == 650
    assert goals[0]["start_date"] == "2024-01-04"
    assert goals[1]["goal_ml"] == 700
    assert goals[2]["start_date"] == "2024-01-03"
