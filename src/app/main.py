from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
from time import perf_counter

from flask import Flask, jsonify

from src.app.config import load_config
from src.app.routes.bottles import bottles_api
from src.app.routes.calendar import calendar_api
from src.app.routes.entries import entries_api
from src.app.routes.feed import feed_api
from src.app.routes.goals import goals_api
from src.app.routes.nappy_stock import nappy_stock_api
from src.app.routes.pages import create_pages_blueprint
from src.app.routes.pushcut import pushcut_api
from src.app.routes.settings import settings_api
from src.app.routes.home_kpis import home_kpis_api
from src.app.services.feed_due import start_feed_due_scheduler
from src.app.services.home_kpis import start_home_kpis_scheduler
from src.app.services.push_subscriptions import build_vapid_config
from src.app.storage.db import init_db
from src.lib.logging import configure_logging


def _should_start_schedulers(enable_schedulers: bool) -> bool:
    if not enable_schedulers:
        return False
    if os.getenv("PYTEST_CURRENT_TEST"):
        return False
    return True


def create_app() -> Flask:
    configure_logging()
    config = load_config()
    started_at = perf_counter()

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
        BASE_PATH=config.base_path,
        STATIC_VERSION=config.static_version,
        VAPID_CONFIG=build_vapid_config(
            config.vapid_public_key,
            config.vapid_private_key,
            config.vapid_subject,
        ),
    )

    init_db(app.config["DB_PATH"])
    app.register_blueprint(entries_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(bottles_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(goals_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(settings_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(calendar_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(nappy_stock_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(pushcut_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(feed_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(home_kpis_api, url_prefix=f"{config.base_path}/api")
    app.register_blueprint(
        create_pages_blueprint(app_root), url_prefix=config.base_path
    )
    if _should_start_schedulers(config.enable_schedulers):
        start_feed_due_scheduler(app, config.feed_due_poll_seconds)
        start_home_kpis_scheduler(app, config.home_kpis_poll_seconds)

    @app.context_processor
    def inject_static_version():
        return {
            "static_version": config.static_version,
        }

    @app.get(f"{config.base_path}/healthz")
    def healthz():
        db_started_at = perf_counter()
        try:
            conn = sqlite3.connect(app.config["DB_PATH"])
            try:
                conn.execute("SELECT 1").fetchone()
            finally:
                conn.close()
        except sqlite3.Error as exc:
            db_ms = round((perf_counter() - db_started_at) * 1000, 2)
            return (
                jsonify(
                    {
                        "ok": False,
                        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                        "uptime_seconds": round(perf_counter() - started_at, 2),
                        "db": {
                            "ok": False,
                            "latency_ms": db_ms,
                            "error": str(exc),
                        },
                    }
                ),
                503,
            )

        return jsonify(
            {
                "ok": True,
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "uptime_seconds": round(perf_counter() - started_at, 2),
                "db": {
                    "ok": True,
                    "latency_ms": round((perf_counter() - db_started_at) * 1000, 2),
                },
            }
        )

    return app


application = create_app()


if __name__ == "__main__":
    cfg = load_config()
    ssl_context = None
    if cfg.tls_cert_path and cfg.tls_key_path:
        ssl_context = (str(cfg.tls_cert_path), str(cfg.tls_key_path))
    application.run(host=cfg.host, port=cfg.port, ssl_context=ssl_context)
