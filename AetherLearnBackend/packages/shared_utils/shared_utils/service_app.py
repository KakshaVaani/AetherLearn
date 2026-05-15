from __future__ import annotations

from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

try:
    from pymongo.asynchronous import AsyncMongoClient
except ImportError:  # PyMongo 4.17+ exposes the async client at top level.
    from pymongo import AsyncMongoClient
from shared_schemas import HealthResponse, StatusResponse

from .env import BaseServiceSettings
from .errors import AppError
from .logger import configure_logging
from .request_id import RequestIdMiddleware
from .response import error_response


def create_service_app(
    settings: BaseServiceSettings,
    *,
    title: str,
    configure: Callable[[FastAPI], None],
    expose_cors: bool = False,
) -> FastAPI:
    settings.assert_production_ready()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings
        app.state.mongo_client = AsyncMongoClient(settings.mongodb_uri)
        app.state.mongo = app.state.mongo_client[settings.database_name]
        yield
        await app.state.mongo_client.close()

    app = FastAPI(title=title, version=settings.app_version, lifespan=lifespan)
    app.add_middleware(RequestIdMiddleware)
    if expose_cors:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return error_response(
            exc.code,
            exc.message,
            request,
            status_code=exc.status_code,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return error_response(
            "VALIDATION_ERROR",
            "Request validation failed",
            request,
            status_code=422,
            details={"errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        return error_response(
            "INTERNAL_ERROR",
            "Unexpected server error",
            request,
            status_code=500,
            details={"type": exc.__class__.__name__},
        )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(service=settings.service_name, version=settings.app_version)

    @app.get("/status", response_model=StatusResponse)
    async def status() -> StatusResponse:
        mongo_connected: bool | None
        try:
            await app.state.mongo.command("ping")
            mongo_connected = True
        except Exception:
            mongo_connected = False
        return StatusResponse(
            service=settings.service_name,
            version=settings.app_version,
            env=settings.app_env,
            mongo_connected=mongo_connected,
            warnings=settings.validate_production_secrets(),
        )

    configure(app)
    return app


def public_status(settings: BaseServiceSettings, **extra: Any) -> dict[str, Any]:
    return {
        "service": settings.service_name,
        "version": settings.app_version,
        "env": settings.app_env,
        "flags": {
            "schoolHubMode": settings.school_hub_mode,
            "commonsEnabled": settings.commons_enabled,
            "commonsReviewRequired": settings.commons_review_required,
            **extra,
        },
        "warnings": settings.validate_production_secrets(),
    }
