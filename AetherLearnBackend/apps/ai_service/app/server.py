from __future__ import annotations

from fastapi import FastAPI
from shared_schemas import StatusResponse
from shared_utils.service_app import create_service_app

from .env import get_settings
from .routes.internal_routes import router
from .service.runtime_router import RuntimeRouter


def create_app() -> FastAPI:
    settings = get_settings()

    def configure(app: FastAPI) -> None:
        app.include_router(router)

        @app.get("/runtime-status")
        async def runtime_status():
            return await RuntimeRouter(settings).status()

        @app.get("/status", response_model=StatusResponse)
        async def ai_status_override():
            runtime = await RuntimeRouter(settings).status()
            return StatusResponse(
                service=settings.service_name,
                version=settings.app_version,
                env=settings.app_env,
                runtime=runtime,
                warnings=settings.validate_production_secrets(),
            )

    return create_service_app(settings, title="AetherLearn AI Service", configure=configure)


app = create_app()
