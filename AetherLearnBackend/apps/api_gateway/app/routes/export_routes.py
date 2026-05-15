from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import LessonPack
from shared_utils.response import success_response

from ..dependencies import authenticated_context, clients, request_id

router = APIRouter(prefix="/api", tags=["export-import"])


@router.post("/export/markdown")
async def markdown(
    request: Request, payload: LessonPack, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["export"].request(
        "POST",
        "/internal/export/markdown",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/export/pdf")
async def pdf(
    request: Request, payload: LessonPack, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["export"].request(
        "POST",
        "/internal/export/pdf",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/export/kvpack")
async def kvpack(
    request: Request, payload: LessonPack, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["export"].request(
        "POST",
        "/internal/export/kvpack",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/import/kvpack/validate")
async def validate_kvpack(
    request: Request, payload: dict, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["export"].request(
        "POST",
        "/internal/import/kvpack/validate",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/import/kvpack")
async def import_kvpack(
    request: Request, payload: dict, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["export"].request(
        "POST",
        "/internal/import/kvpack",
        json=payload,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
