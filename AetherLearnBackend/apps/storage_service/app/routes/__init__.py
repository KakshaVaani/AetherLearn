from __future__ import annotations

from fastapi import APIRouter, Request
from service_auth.service_tokens import (
    verify_internal_request_from_headers,
    verify_user_context_headers,
)
from shared_utils.mongo_repository import repository_for

from ..drivers import LocalStorageDriver, MinioStorageDriver, S3StorageDriver
from ..env import get_settings
from ..repository.object_metadata_repository import ObjectMetadataRepository
from ..service.signed_url_service import signed_url_metadata
from ..service.storage_service import StorageService

router = APIRouter(prefix="/internal/storage", tags=["internal-storage"])


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


def driver():
    settings = get_settings()
    if settings.object_storage_driver == "s3":
        return S3StorageDriver(settings.local_storage_dir)
    if settings.object_storage_driver == "minio":
        return MinioStorageDriver(settings.local_storage_dir)
    return LocalStorageDriver(settings.local_storage_dir)


def svc(request: Request):
    settings = get_settings()
    metadata = ObjectMetadataRepository(
        repository_for(request.app.state.mongo, "object_metadata", settings.mongodb_uri)
    )
    return StorageService(driver(), metadata)


@router.post("/objects")
async def upload(request: Request, payload: dict):
    await require_service(request)
    user = ctx(request)
    return await svc(request).upload(
        owner_id=payload.get("ownerId") or (user.user_id if user else "system"),
        content_b64=payload["contentBase64"],
        mime_type=payload["mimeType"],
        purpose=payload["purpose"],
    )


@router.get("/objects/{object_key:path}")
async def download(request: Request, object_key: str):
    await require_service(request)
    return await svc(request).download(object_key)


@router.post("/signed-url")
async def signed_url(request: Request, payload: dict):
    await require_service(request)
    return signed_url_metadata(payload["objectKey"])
