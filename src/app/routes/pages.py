from pathlib import Path

from flask import Blueprint, current_app, render_template, send_from_directory

from src.lib.validation import normalize_user_slug, validate_entry_type


def create_pages_blueprint(app_root: Path) -> Blueprint:
    pages = Blueprint("pages", __name__)

    def _base_path() -> str:
        return current_app.config["BASE_PATH"]

    def render_home_page(
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
    ):
        response = render_template(
            "index.html",
            user_slug=user_slug,
            user_valid=user_valid,
            user_message=user_message,
            page="home",
            base_path=_base_path(),
        )
        return (response, status_code) if status_code != 200 else response

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
                base_path=_base_path(),
            ),
            status_code,
        )

    def render_user_page(
        template_name: str,
        page: str,
        user_slug: str,
        user_valid: bool,
        user_message: str,
        status_code: int = 200,
        **template_context,
    ):
        return (
            render_template(
                template_name,
                user_slug=user_slug,
                user_valid=user_valid,
                user_message=user_message,
                page=page,
                base_path=_base_path(),
                **template_context,
            ),
            status_code,
        )

    @pages.get("/")
    def index():
        return render_home_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/log")
    def log_index():
        return render_log_page(
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/log/<entry_type>")
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

    @pages.get("/settings")
    def settings():
        return render_template(
            "settings.html", page="settings", base_path=_base_path()
        )

    @pages.get("/goals")
    def goals():
        return render_template("goals.html", page="goals", base_path=_base_path())

    @pages.get("/sw.js")
    def service_worker():
        response = current_app.response_class(
            render_template("sw.js", static_version=current_app.config["STATIC_VERSION"]),
            content_type="application/javascript",
        )
        response.headers["Service-Worker-Allowed"] = f"{_base_path()}/"
        response.headers["Cache-Control"] = "no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        return response

    @pages.get("/apple-touch-icon.png")
    def apple_touch_icon():
        return send_from_directory(app_root, "apple-touch-icon.png")

    @pages.get("/summary")
    def summary():
        return render_user_page(
            "summary.html",
            "summary",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/timeline")
    def timeline():
        return render_user_page(
            "timeline.html",
            "timeline",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/calendar")
    def calendar():
        return render_user_page(
            "calendar.html",
            "calendar",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/calendar/add")
    def calendar_add():
        return render_user_page(
            "calendar_form.html",
            "calendar-form",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            event_id=None,
        )

    @pages.get("/calendar/edit/<int:event_id>")
    def calendar_edit(event_id: int):
        return render_user_page(
            "calendar_form.html",
            "calendar-form",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
            event_id=event_id,
        )

    @pages.get("/milk-express")
    def milk_express():
        return render_user_page(
            "milk_express.html",
            "milk-express",
            user_slug="",
            user_valid=False,
            user_message="Choose a user below (example: josh).",
        )

    @pages.get("/bottles")
    def bottles():
        return render_user_page(
            "bottles.html",
            "bottles",
            user_slug="",
            user_valid=False,
            user_message="Shared bottle library",
        )

    @pages.get("/weight")
    def weight():
        return render_user_page(
            "weight.html",
            "weight",
            user_slug="",
            user_valid=False,
            user_message="Track baby's weight and get feeding goal suggestions.",
        )

    @pages.get("/nappy-stock")
    def nappy_stock():
        return render_user_page(
            "nappy_stock.html",
            "nappy-stock",
            user_slug="",
            user_valid=False,
            user_message="Track nappy stock and run-out risk.",
        )

    @pages.get("/<user_slug>")
    def user_home(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_home_page(
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_home_page(
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/summary")
    def user_summary(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "summary.html",
                "summary",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "summary.html",
            "summary",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/timeline")
    def user_timeline(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "timeline.html",
                "timeline",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "timeline.html",
            "timeline",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/milk-express")
    def user_milk_express(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "milk_express.html",
                "milk-express",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "milk_express.html",
            "milk-express",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/bottles")
    def user_bottles(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "bottles.html",
                "bottles",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "bottles.html",
            "bottles",
            user_slug=normalized,
            user_valid=False,
            user_message="Shared bottle library",
        )

    @pages.get("/<user_slug>/weight")
    def user_weight(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "weight.html",
                "weight",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "weight.html",
            "weight",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/nappy-stock")
    def user_nappy_stock(user_slug: str):
        try:
            normalized = normalize_user_slug(user_slug)
        except ValueError as exc:
            return render_user_page(
                "nappy_stock.html",
                "nappy-stock",
                user_slug="",
                user_valid=False,
                user_message=str(exc),
                status_code=400,
            )
        return render_user_page(
            "nappy_stock.html",
            "nappy-stock",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    @pages.get("/<user_slug>/log")
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

    @pages.get("/<user_slug>/log/<entry_type>")
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

    return pages
