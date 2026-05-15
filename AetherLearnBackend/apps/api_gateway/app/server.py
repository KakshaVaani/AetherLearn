from __future__ import annotations

from fastapi import FastAPI
from shared_utils.service_app import create_service_app

from .env import get_settings
from .routes import (
    auth_routes,
    commons_routes,
    export_routes,
    review_routes,
    status_routes,
    student_routes,
    sync_routes,
    teacher_routes,
)


def create_app() -> FastAPI:
    settings = get_settings()

    def configure(app: FastAPI) -> None:
        app.include_router(status_routes.router)
        app.include_router(auth_routes.router)
        app.include_router(teacher_routes.router)
        app.include_router(student_routes.router)
        app.include_router(commons_routes.router)
        app.include_router(review_routes.router)
        app.include_router(sync_routes.router)
        app.include_router(export_routes.router)

        @app.get("/api/openapi.json")
        async def api_openapi():
            return app.openapi()

    return create_service_app(
        settings,
        title="AetherLearn API Gateway",
        configure=configure,
        expose_cors=True,
    )


app = create_app()
