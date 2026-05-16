from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from shared_schemas import LoginRequest, RefreshRequest, SignupRequest
from shared_utils.response import success_response

from ..dependencies import authenticated_context, clients, request_id

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
async def signup(request: Request, payload: SignupRequest):
    data = await clients()["auth"].signup(payload.model_dump(by_alias=True), request_id(request))
    return success_response(data, request, status_code=201)


@router.post("/login")
async def login(request: Request, payload: LoginRequest):
    data = await clients()["auth"].login(payload.model_dump(by_alias=True), request_id(request))
    return success_response(data, request)


@router.post("/google")
async def google_login(request: Request, payload: dict):
    data = await clients()["auth"].request(
        "POST",
        "/internal/auth/google",
        json=payload,
        request_id=request_id(request),
    )
    return success_response(data, request)


@router.post("/refresh")
async def refresh(request: Request, payload: RefreshRequest):
    data = await clients()["auth"].refresh(payload.model_dump(by_alias=True), request_id(request))
    return success_response(data, request)


@router.post("/logout")
async def logout(request: Request, payload: RefreshRequest):
    data = await clients()["auth"].request(
        "POST",
        "/internal/auth/logout",
        json=payload.model_dump(by_alias=True),
        request_id=request_id(request),
    )
    return success_response(data, request)


@router.post("/logout-all")
async def logout_all(request: Request, context=Depends(authenticated_context)):
    data = await clients()["auth"].request(
        "POST",
        "/internal/auth/logout-all",
        json={"userId": context.user_id},
        request_id=request_id(request),
    )
    return success_response(data, request)


@router.get("/me")
async def me(request: Request, context=Depends(authenticated_context)):
    data = await clients()["auth"].user(context.user_id, request_id(request))
    return success_response({"user": data}, request)


@router.post("/demo-login")
async def demo_login(request: Request, payload: dict | None = None):
    data = await clients()["auth"].request(
        "POST",
        "/internal/auth/demo-login",
        json=payload or {"role": "teacher"},
        request_id=request_id(request),
    )
    return success_response(data, request)
