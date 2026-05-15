from __future__ import annotations

from typing import Any


class AppError(Exception):
    code = "INTERNAL_ERROR"
    status_code = 500

    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class RemoteAppError(AppError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 502,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details)
        self.code = code
        self.status_code = status_code


class ValidationAppError(AppError):
    code = "VALIDATION_ERROR"
    status_code = 422


class UnauthorizedError(AppError):
    code = "UNAUTHENTICATED"
    status_code = 401


class ForbiddenError(AppError):
    code = "FORBIDDEN"
    status_code = 403


class NotFoundError(AppError):
    code = "NOT_FOUND"
    status_code = 404


class RateLimitedError(AppError):
    code = "RATE_LIMITED"
    status_code = 429


class ServiceUnavailableError(AppError):
    code = "SERVICE_UNAVAILABLE"
    status_code = 503


class AiRuntimeUnavailableError(AppError):
    code = "AI_RUNTIME_UNAVAILABLE"
    status_code = 503


class AiSchemaInvalidError(AppError):
    code = "AI_SCHEMA_INVALID"
    status_code = 422


class ImageTooLargeError(AppError):
    code = "IMAGE_TOO_LARGE"
    status_code = 413


class UnsupportedImageTypeError(AppError):
    code = "UNSUPPORTED_IMAGE_TYPE"
    status_code = 415


class KvPackInvalidError(AppError):
    code = "KVPACK_INVALID"
    status_code = 422


class SyncConflictError(AppError):
    code = "SYNC_CONFLICT"
    status_code = 409


class CommonsReviewRequiredError(AppError):
    code = "COMMONS_REVIEW_REQUIRED"
    status_code = 409
