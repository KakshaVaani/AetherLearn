from __future__ import annotations

import asyncio

from shared_utils.logger import configure_logging, get_logger

from .env import get_settings


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = get_logger(settings.service_name)
    logger.info("worker_started", service=settings.service_name)
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
