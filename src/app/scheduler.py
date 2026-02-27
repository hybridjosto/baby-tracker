import logging
import signal
import threading

from flask import Flask

from src.app.config import load_config
from src.app.services.feed_due import start_feed_due_scheduler
from src.app.services.home_kpis import start_home_kpis_scheduler
from src.app.storage.db import init_db
from src.lib.logging import configure_logging

logger = logging.getLogger(__name__)


def _create_scheduler_app(db_path: str) -> Flask:
    app = Flask(__name__)
    app.config.update(DB_PATH=db_path)
    return app


def main() -> None:
    configure_logging()
    config = load_config()
    init_db(str(config.db_path))

    app = _create_scheduler_app(str(config.db_path))
    start_feed_due_scheduler(app, config.feed_due_poll_seconds)
    start_home_kpis_scheduler(app, config.home_kpis_poll_seconds)
    logger.info(
        "Scheduler runtime started (feed_due_poll_seconds=%s, home_kpis_poll_seconds=%s)",
        config.feed_due_poll_seconds,
        config.home_kpis_poll_seconds,
    )

    stop_event = threading.Event()

    def _handle_shutdown(signum, _frame):
        logger.info("Scheduler runtime received signal %s, shutting down", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)
    stop_event.wait()


if __name__ == "__main__":
    main()
