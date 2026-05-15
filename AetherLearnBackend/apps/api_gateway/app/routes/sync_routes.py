from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_schemas import SyncPullRequest, SyncPushRequest
from shared_utils.response import success_response

from ..dependencies import authenticated_context, clients, request_id

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/pull")
async def pull(
    request: Request, payload: SyncPullRequest, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["sync"].request(
        "POST",
        "/internal/sync/pull",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.post("/push")
async def push(
    request: Request, payload: SyncPushRequest, ctx: UserContext = Depends(authenticated_context)
):
    data = await clients()["sync"].request(
        "POST",
        "/internal/sync/push",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)


@router.get("/status")
async def status(request: Request, ctx: UserContext = Depends(authenticated_context)):
    data = await clients()["sync"].request(
        "GET", "/internal/sync/status", request_id=request_id(request), user_context=ctx
    )
    return success_response(data, request)
