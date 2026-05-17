from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from service_auth import UserContext
from shared_utils.response import success_response

from ..dependencies import authenticated_context, clients, request_id

router = APIRouter(prefix="/api/schools", tags=["schools"])


@router.get("")
async def schools(
    request: Request,
    query: str | None = None,
    ctx: UserContext = Depends(authenticated_context),
):
    data = await clients()["school"].request(
        "GET",
        "/internal/schools",
        params={"query": query} if query else None,
        request_id=request_id(request),
        user_context=ctx,
    )
    return success_response(data, request)
