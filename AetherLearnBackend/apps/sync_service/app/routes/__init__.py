from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_schemas import SyncPullRequest, SyncPushRequest
from shared_utils.mongo_repository import repository_for

from ..env import get_settings
from ..repository.device_state_repository import DeviceStateRepository
from ..repository.sync_operation_repository import SyncOperationRepository
from ..service.hub_sync_service import hub_sync_status
from ..service.sync_service import SyncService

router = APIRouter(prefix="/internal/sync", tags=["internal-sync"])


async def require_service(request: Request) -> None:
    await verify_internal_request_from_headers(request, get_settings().internal_service_secret)


def ctx(request: Request):
    settings = get_settings()
    return verify_user_context_headers(
        settings.internal_service_secret,
        request.headers.get("X-User-Context"),
        request.headers.get("X-User-Context-Signature"),
    )


def svc(request: Request) -> SyncService:
    settings = get_settings()
    db = request.app.state.mongo
    return SyncService(
        SyncOperationRepository(repository_for(db, "sync_operations", settings.mongodb_uri)),
        DeviceStateRepository(repository_for(db, "device_states", settings.mongodb_uri)),
    )


@router.post("/pull")
async def pull(request: Request, payload: SyncPullRequest):
    await require_service(request)
    return await svc(request).pull(ctx(request).user_id, payload)


@router.post("/push")
async def push(request: Request, payload: SyncPushRequest):
    await require_service(request)
    return await svc(request).push(ctx(request).user_id, payload)


@router.post("/operation")
async def operation(request: Request, payload: dict):
    await require_service(request)
    return {"accepted": True, "operation": payload}


@router.get("/status")
async def status(request: Request):
    await require_service(request)
    return {"sync": "ok", **hub_sync_status()}


@router.post("/hub/push")
async def hub_push(request: Request, payload: dict):
    await require_service(request)
    return {"ok": True, "direction": "hub-push", "accepted": len(payload.get("operations", []))}


@router.post("/hub/pull")
async def hub_pull(request: Request):
    await require_service(request)
    return {"ok": True, "direction": "hub-pull", "changes": []}
