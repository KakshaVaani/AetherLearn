from __future__ import annotations

from bson import ObjectId

from .errors import ValidationAppError


def validate_object_id(value: str) -> str:
    if not ObjectId.is_valid(value):
        raise ValidationAppError("Invalid id", {"id": value})
    return value


def new_id() -> str:
    return str(ObjectId())


def mongo_id_filter(value: str) -> dict[str, ObjectId]:
    validate_object_id(value)
    return {"_id": ObjectId(value)}


def stringify_id(document: dict) -> dict:
    if "_id" in document:
        document["id"] = str(document.pop("_id"))
    return document
