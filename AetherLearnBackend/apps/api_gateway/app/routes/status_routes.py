from __future__ import annotations

import httpx
from fastapi import APIRouter, Request
from shared_schemas import HealthResponse
from shared_utils.response import success_response

from ..env import get_settings

router = APIRouter(prefix="/api", tags=["status"])


@router.get("/health")
async def health(request: Request):
    settings = get_settings()
    return success_response(
        HealthResponse(service=settings.service_name, version=settings.app_version), request
    )


@router.get("/status")
async def status(request: Request):
    settings = get_settings()
    service_urls = {
        "auth": settings.auth_service_url,
        "school": settings.school_service_url,
        "lesson": settings.lesson_service_url,
        "ai": settings.ai_service_url,
        "assignment": settings.assignment_service_url,
        "commons": settings.commons_service_url,
        "review": settings.review_service_url,
        "sync": settings.sync_service_url,
        "export": settings.export_service_url,
        "notification": settings.notification_service_url,
        "storage": settings.storage_service_url,
    }
    statuses = {}
    async with httpx.AsyncClient(timeout=2.0) as client:
        for name, url in service_urls.items():
            try:
                response = await client.get(f"{url}/health")
                statuses[name] = response.json() if response.status_code < 500 else {"ok": False}
            except httpx.HTTPError:
                statuses[name] = {"ok": False, "warning": "unreachable"}
    data = {
        "gateway": {"service": settings.service_name, "version": settings.app_version},
        "services": statuses,
        "runtimeSummary": {
            "aiRuntime": settings.ai_runtime,
            "mockAllowed": settings.allow_runtime_fallback,
        },
        "schoolHubMode": settings.school_hub_mode,
        "configuredFlags": {
            "commonsEnabled": settings.commons_enabled,
            "commonsReviewRequired": settings.commons_review_required,
            "geminiConfigured": bool(settings.gemini_api_key),
            "secretsConfigured": settings.internal_service_secret != "change-me",
        },
        "warnings": settings.validate_production_secrets(),
    }
    return success_response(data, request)
