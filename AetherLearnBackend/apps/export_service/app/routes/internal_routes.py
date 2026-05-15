from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import LessonPack

from ..env import get_settings
from ..service.export_service import ExportService
from ..service.import_service import ImportService

router = APIRouter(prefix="/internal", tags=["internal-export"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def ctx(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
        required=False,
    )


@router.post("/export/markdown")
async def export_markdown(request: Request, payload: LessonPack):
    await require_service(request)
    return await ExportService().markdown(payload)


@router.post("/export/pdf")
async def export_pdf(request: Request, payload: LessonPack):
    await require_service(request)
    return await ExportService().pdf(payload)


@router.post("/export/homework-card")
async def homework_card(request: Request, payload: dict):
    await require_service(request)
    return await ExportService().homework_card(
        LessonPack.model_validate(payload["lessonPack"]), payload.get("code")
    )


@router.post("/export/kvpack")
async def export_kvpack(request: Request, payload: LessonPack):
    await require_service(request)
    user = ctx(request)
    return await ExportService().kvpack(payload, user.user_id if user else "system")


@router.post("/import/kvpack/validate")
async def validate_pack(request: Request, payload: dict):
    await require_service(request)
    return await ImportService(get_settings().max_kvpack_mb).validate(payload["contentBase64"])


@router.post("/import/kvpack")
async def import_pack(request: Request, payload: dict):
    await require_service(request)
    return await ImportService(get_settings().max_kvpack_mb).import_pack(payload["contentBase64"])
