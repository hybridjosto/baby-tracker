import os
from pathlib import Path

from flask import Flask, render_template, request, send_from_directory

from src.app.config import load_config
from src.app.routes.entries import entries_api
from src.app.routes.bottles import bottles_api
from src.app.routes.goals import goals_api
from src.app.routes.settings import settings_api
from src.app.routes.calendar import calendar_api
from src.app.routes.feed import feed_api
from src.app.routes.pushcut import pushcut_api
from src.app.routes.home_kpis import home_kpis_api
from src.app.storage.db import init_db
from src.app.services.feed_due import start_feed_due_scheduler
from src.app.services.home_kpis import start_home_kpis_scheduler
from src.lib.logging import configure_logging
from src.lib.validation import normalize_user_slug, validate_entry_type


def _should_start_schedulers(enable_schedulers: bool) -> bool:
    if not enable_schedulers:
        return False
    if os.getenv("PYTEST_CURRENT_TEST"):
        return False
    return True


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
        static_url_path=f"{config.base_path}/static",
    )
    app.config.update(
        DB_PATH=str(config.db_path),
        STORAGE_BACKEND=config.storage_backend,
        FIREBASE_PROJECT_ID=config.firebase_project_id,
        FIREBASE_CREDENTIALS_PATH=(
            str(config.firebase_credentials_path)
            if config.firebase_credentials_path
            else None
        ),
        APP_SHARED_SECRET=config.app_shared_secret,
        ALLOW_INSECURE_LOCAL=config.allow_insecure_local,
        BASE_PATH=config.base_path,
    )

    init_db(app.config["DB_PATH"])
    app.register_blueprint(entries_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(bottles_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(goals_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(settings_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(calendar_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(pushcut_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(feed_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(home_kpis_api, url_prefix=f"{config.base_path}/api")
    if _should_start_schedulers(config.enable_schedulers):
        start_feed_due_scheduler(app, config.feed_due_poll_seconds)
        start_home_kpis_scheduler(app, config.home_kpis_poll_seconds)

    @app.before_request
    def enforce_api_secret():
        if app.config.get("STORAGE_BACKEND") not in {"dual", "firestore"}:
            return None
        path = request.path or ""
        base_path = app.config.get("BASE_PATH") or ""
        api_prefix = f"{base_path}/api"
        if not path.startswith(api_prefix):
            return None
        if app.config.get("ALLOW_INSECURE_LOCAL") and request.remote_addr in {
            "127.0.0.1",
            "::1",
        }:
            return None
        expected = app.config.get("APP_SHARED_SECRET")
        provided = request.headers.get("X-App-Secret")
        if not expected or provided != expected:
            return ("", 401)
        return None

    @app.context_processor
    def inject_static_version():
        return {
            "static_version": config.static_version,
            "api_shared_secret": config.app_shared_secret or "",
        }

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
                base_path=config.base_path,
            ),
            status_code,
        )

    @app.get(f"{config.base_path}/")
    def index():
        return render_template(
            "index.html",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            page="home",
            base_path=config.base_path,
        )

    @app.get(f"{config.base_path}/log")
    def log_index():
        return render_log_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/log/<entry_type>")
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

    @app.get(f"{config.base_path}/settings")
    def settings():
        return render_template("settings.html", page="settings", base_path=config.base_path)

    @app.get(f"{config.base_path}/goals")
    def goals():
        return render_template("goals.html", page="goals", base_path=config.base_path)

    @app.get(f"{config.base_path}/sw.js")
    def service_worker():
        response = app.response_class(
            render_template("sw.js", static_version=config.static_version),
            content_type="application/javascript",
        )
        response.headers["Service-Worker-Allowed"] = f"{config.base_path}/"
        response.headers["Cache-Control"] = "no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        return response

    @app.get(f"{config.base_path}/apple-touch-icon.png")
    def apple_touch_icon():
        return send_from_directory(app_root, "apple-touch-icon.png")

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
                base_path=config.base_path,
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
                base_path=config.base_path,
            ),
            status_code,
        )

    def render_calendar_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        return (
            render_template(
                "calendar.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page="calendar",
                base_path=config.base_path,
            ),
            status_code,
        )

    def render_calendar_form_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        event_id: int | None = None,
        status_code: int = 200,
    ):
        return (
            render_template(
                "calendar_form.html",
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                event_id=event_id,
                page="calendar-form",
                base_path=config.base_path,
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
                base_path=config.base_path,
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
                base_path=config.base_path,
            ),
            status_code,
        )

    @app.get(f"{config.base_path}/summary")
    def summary():
        return render_summary_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/timeline")
    def timeline():
        return render_timeline_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/calendar")
    def calendar():
        return render_calendar_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/calendar/add")
    def calendar_add():
        return render_calendar_form_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/calendar/edit/<int:event_id>")
    def calendar_edit(event_id: int):
        return render_calendar_form_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            event_id=event_id,
        )

    @app.get(f"{config.base_path}/milk-express")
    def milk_express():
        return render_milk_express_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @app.get(f"{config.base_path}/bottles")
    def bottles():
        return render_bottles_page(
            user_slug="",
            user_valid=False,
            user_message="Shared bottle library",
        )

    @app.get(f"{config.base_path}/<user_slug>")
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
                    base_path=config.base_path,
                ),
                400,
            )
        return render_template(
            "index.html",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
            page="home",
            base_path=config.base_path,
        )

    @app.get(f"{config.base_path}/<user_slug>/summary")
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

    @app.get(f"{config.base_path}/<user_slug>/timeline")
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

    @app.get(f"{config.base_path}/<user_slug>/milk-express")
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

    @app.get(f"{config.base_path}/<user_slug>/bottles")
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

    @app.get(f"{config.base_path}/<user_slug>/log")
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

    @app.get(f"{config.base_path}/<user_slug>/log/<entry_type>")
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


application = create_app()


if __name__ == "__main__":
    cfg = load_config()
    ssl_context = None
    if cfg.tls_cert_path and cfg.tls_key_path:
        ssl_context = (str(cfg.tls_cert_path), str(cfg.tls_key_path))
    application.run(host=cfg.host, port=cfg.port, ssl_context=ssl_context)
