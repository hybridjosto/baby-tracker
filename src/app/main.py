from pathlib import Path

from flask import Flask, render_template, send_from_directory

from src.app.config import load_config
from src.app.routes.entries import entries_api
from src.app.routes.bottles import bottles_api
from src.app.routes.goals import goals_api
from src.app.routes.settings import settings_api
from src.app.storage.db import init_db
from src.lib.logging import configure_logging
from src.lib.validation import normalize_user_slug, validate_entry_type


def create_app() -> Flask:
    configure_logging()
    config = load_config()

    app_root = Path(__file__).resolve().parents[2]
    template_dir = app_root / "src" / "web" / "templates"
    static_dir = app_root / "src" / "web" / "static"

    app = Flask(
        __name__,
        template_folder=str(template_dir),
        static_folder=str(static_dir),
        static_url_path="/static",
    )
    app.config.update(DB_PATH=str(config.db_path))

    init_db(app.config["DB_PATH"])
    app.register_blueprint(entries_api)
    app.register_blueprint(bottles_api)
    app.register_blueprint(goals_api)
    app.register_blueprint(settings_api)

    def render_log_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        entry_type: str | None = None,
        status_code: int = 200,
    ):
        log_title = "Event Log"
        log_subtitle = "Recent entries"
        log_window_hours = ""
        if entry_type:
            label = entry_type.capitalize()
            log_title = f"{label} log"
            log_subtitle = "Last 24 hours"
            log_window_hours = 24
        return (
            render_template(
                "log.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="log",
                log_title=log_title,
                log_subtitle=log_subtitle,
                log_type=entry_type or "",
                log_window_hours=log_window_hours,
            ),
            status_code,
        )

    @app.get("/")
    def index():
        return render_template(
            "index.html",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            page="home",
        )

    @app.get("/log")
    def log_index():
        return render_log_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get("/log/<entry_type>")
    def log_type_index(entry_type: str):
        try:
            validate_entry_type(entry_type)
        except ValueError as exc:
            return render_log_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_log_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            entry_type=entry_type,
        )

    @app.get("/settings")
    def settings():
        return render_template("settings.html", page="settings")

    @app.get("/goals")
    def goals():
        return render_template("goals.html", page="goals")

    @app.get("/sw.js")
    def service_worker():
        response = send_from_directory(app.static_folder, "sw.js")
        response.headers["Service-Worker-Allowed"] = "/"
        return response

    def render_summary_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        return (
            render_template(
                "summary.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="summary",
            ),
            status_code,
        )

    def render_timeline_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        return (
            render_template(
                "timeline.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="timeline",
            ),
            status_code,
        )

    def render_milk_express_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        return (
            render_template(
                "milk_express.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="milk-express",
            ),
            status_code,
        )

    def render_bottles_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        return (
            render_template(
                "bottles.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="bottles",
            ),
            status_code,
        )

    @app.get("/summary")
    def summary():
        return render_summary_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get("/timeline")
    def timeline():
        return render_timeline_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get("/milk-express")
    def milk_express():
        return render_milk_express_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get("/bottles")
    def bottles():
        return render_bottles_page(
            user_slug="",
            user_valid=False,
            user_message="Shared bottle library",
        )

    @app.get("/<user_slug>")
    def user_home(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return (
                render_template(
                    "index.html",
                    user_slug="",
                    user_valid=False,
                    user_message=str(exc),
                    page="home",
                ),
                400,
            )
        return render_template(
            "index.html",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
            page="home",
        )

    @app.get("/<user_slug>/summary")
    def user_summary(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_summary_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_summary_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @app.get("/<user_slug>/timeline")
    def user_timeline(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_timeline_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_timeline_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @app.get("/<user_slug>/milk-express")
    def user_milk_express(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_milk_express_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_milk_express_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @app.get("/<user_slug>/bottles")
    def user_bottles(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_bottles_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_bottles_page(
            user_slug=normalized,
            user_valid=False,
            user_message="Shared bottle library",
        )

    @app.get("/<user_slug>/log")
    def user_log(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_log_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_log_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @app.get("/<user_slug>/log/<entry_type>")
    def user_log_type(user_slug: str, entry_type: str):
        try:
            normalized = normalize_user_slug(user_slug)
            validate_entry_type(entry_type)
        except ValueError as exc:
            return render_log_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_log_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
            entry_type=entry_type,
        )

    return app


if __name__ == "__main__":
    cfg = load_config()
    application = create_app()
    application.run(host=cfg.host, port=cfg.port)
