from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel
from shared_schemas import ApiError, ApiErrorBody, ApiSuccess


def _dump(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json", by_alias=True)
    if isinstance(value, list):
        return [_dump(item) for item in value]
    if isinstance(value, dict):
        return {key: _dump(item) for key, item in value.items()}
    return value


def request_id_from(request: Request | None) -> str:
    if request is None:
        return "unknown"
    return str(getattr(request.state, "request_id", request.headers.get("X-Request-Id", "unknown")))


def success_response(
    data: Any, request: Request | None = None, status_code: int = 200
) -> ORJSONResponse:
    body = ApiSuccess[Any](data=_dump(data), request_id=request_id_from(request))
    return ORJSONResponse(body.model_dump(mode="json", by_alias=True), status_code=status_code)


def error_response(
    code: str,
    message: str,
    request: Request | None = None,
    status_code: int = 500,
    details: dict[str, Any] | None = None,
) -> ORJSONResponse:
    body = ApiError(
        error=ApiErrorBody(code=code, message=message, details=details or {}),
        request_id=request_id_from(request),
    )
    return ORJSONResponse(body.model_dump(mode="json", by_alias=True), status_code=status_code)
