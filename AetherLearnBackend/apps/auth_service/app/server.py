from __future__ import annotations

from fastapi import FastAPI
from shared_utils.service_app import create_service_app

from .env import get_settings
from .routes.internal_routes import router as internal_router


def create_app() -> FastAPI:
    settings = get_settings()

    def configure(app: FastAPI) -> None:
        app.include_router(internal_router)

    return create_service_app(settings, title="AetherLearn Auth Service", configure=configure)


app = create_app()
