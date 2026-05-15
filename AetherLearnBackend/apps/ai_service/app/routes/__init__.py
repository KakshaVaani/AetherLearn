from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import verify_internal_request_from_headers
from shared_schemas import (
    AnalyzeImageInput,
    AskInput,
    GenerateFromTextInput,
    ImproveLessonInput,
    LessonPack,
    TranslateLessonInput,
)

from ..env import get_settings
from ..service.ai_service import AiService
from ..service.commons_auto_check_service import commons_auto_check
from ..service.runtime_router import RuntimeRouter

router = APIRouter(prefix="/internal/ai", tags=["internal-ai"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def service() -> AiService:
    return AiService(RuntimeRouter(get_settings()))


@router.post("/analyze-image")
async def analyze_image(request: Request, payload: AnalyzeImageInput):
    await require_service(request)
    return await service().analyze_image(payload)


@router.post("/ask")
async def ask(request: Request, payload: AskInput):
    await require_service(request)
    return await service().ask(payload)


@router.post("/generate-from-text")
async def generate_from_text(request: Request, payload: GenerateFromTextInput):
    await require_service(request)
    return await service().generate_from_text(payload)


@router.post("/improve-lesson")
async def improve_lesson(request: Request, payload: ImproveLessonInput):
    await require_service(request)
    return await service().improve_lesson(payload)


@router.post("/translate")
async def translate(request: Request, payload: TranslateLessonInput):
    await require_service(request)
    return await service().translate(payload)


@router.post("/commons-auto-check")
async def auto_check(request: Request, payload: LessonPack):
    await require_service(request)
    return commons_auto_check(payload)


@router.get("/generations/{generation_id}")
async def generation(request: Request, generation_id: str):
    await require_service(request)
    return {"generationId": generation_id, "status": "available-through-lesson-service"}


@router.get("/status")
async def status(request: Request):
    await require_service(request)
    return await RuntimeRouter(get_settings()).status()
