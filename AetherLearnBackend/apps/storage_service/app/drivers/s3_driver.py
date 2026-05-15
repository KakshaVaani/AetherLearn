from __future__ import annotations

import asyncio

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from shared_utils.errors import NotFoundError, ServiceUnavailableError

from .base import StorageDriver


class S3StorageDriver(StorageDriver):
    def __init__(
        self,
        *,
        bucket: str,
        access_key_id: str,
        secret_access_key: str,
        endpoint_url: str | None = None,
    ) -> None:
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

    async def put(self, key: str, content: bytes, mime_type: str) -> None:
        def put_object() -> None:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=content,
                ContentType=mime_type,
            )

        try:
            await asyncio.to_thread(put_object)
        except (BotoCoreError, ClientError) as exc:
            raise ServiceUnavailableError("S3 upload failed") from exc

    async def get(self, key: str) -> bytes:
        def get_object() -> bytes:
            response = self.client.get_object(Bucket=self.bucket, Key=key)
            return response["Body"].read()

        try:
            return await asyncio.to_thread(get_object)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404"}:
                raise NotFoundError("Object not found") from exc
            raise ServiceUnavailableError("S3 download failed", {"code": str(code)}) from exc
        except BotoCoreError as exc:
            raise ServiceUnavailableError("S3 download failed") from exc
