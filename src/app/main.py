from pathlib import Path

from flask import Flask, render_template

from src.app.config import load_config
from src.app.routes.entries import entries_api
from src.app.storage.db import init_db
from src.lib.logging import configure_logging
from src.lib.validation import normalize_user_slug


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

    @app.get("/")
    def index():
        return render_template(
            "index.html",
            user_slug="",
            user_valid=False,
            user_message="Add /<name> to the URL (example: /suz).",
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
                ),
                400,
            )
        return render_template(
            "index.html",
            user_slug=normalized,
            user_valid=True,
            user_message=f"Logging as {normalized}",
        )

    return app


if __name__ == "__main__":
    cfg = load_config()
    application = create_app()
    application.run(host=cfg.host, port=cfg.port)
