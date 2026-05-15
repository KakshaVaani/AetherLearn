from __future__ import annotations

import asyncio
from io import BytesIO

from minio import Minio
from minio.error import S3Error
from shared_utils.errors import NotFoundError, ServiceUnavailableError

from .base import StorageDriver


class MinioStorageDriver(StorageDriver):
    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ) -> None:
        self.bucket = bucket
        self.client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )

    async def _ensure_bucket(self) -> None:
        def ensure() -> None:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)

        await asyncio.to_thread(ensure)

    async def put(self, key: str, content: bytes, mime_type: str) -> None:
        await self._ensure_bucket()

        def put_object() -> None:
            self.client.put_object(
                self.bucket,
                key,
                BytesIO(content),
                length=len(content),
                content_type=mime_type,
            )

        try:
            await asyncio.to_thread(put_object)
        except S3Error as exc:
            raise ServiceUnavailableError("MinIO upload failed", {"code": exc.code}) from exc

    async def get(self, key: str) -> bytes:
        await self._ensure_bucket()

        def get_object() -> bytes:
            response = self.client.get_object(self.bucket, key)
            try:
                return response.read()
            finally:
                response.close()
                response.release_conn()

        try:
            return await asyncio.to_thread(get_object)
        except S3Error as exc:
            if exc.code in {"NoSuchKey", "NoSuchObject"}:
                raise NotFoundError("Object not found") from exc
            raise ServiceUnavailableError("MinIO download failed", {"code": exc.code}) from exc
