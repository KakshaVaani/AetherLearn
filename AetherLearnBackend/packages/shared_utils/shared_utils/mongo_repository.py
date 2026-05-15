from __future__ import annotations

from copy import deepcopy
from typing import Any

from pymongo import ASCENDING

from .dates import utc_now
from .inmemory import InMemoryRepository
from .object_id import new_id


class MongoRepository:
    def __init__(self, collection: Any) -> None:
        self.collection = collection

    async def insert(self, document: dict[str, Any]) -> dict[str, Any]:
        item = deepcopy(document)
        item.setdefault("id", new_id())
        item.setdefault("createdAt", utc_now())
        item["updatedAt"] = utc_now()
        await self.collection.insert_one(item)
        return self._public(item)

    async def get(self, item_id: str) -> dict[str, Any] | None:
        item = await self.collection.find_one({"id": item_id})
        return self._public(item) if item else None

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        item = await self.collection.find_one({k: v for k, v in filters.items() if v is not None})
        return self._public(item) if item else None

    async def list(self, **filters: Any) -> list[dict[str, Any]]:
        cursor = self.collection.find({k: v for k, v in filters.items() if v is not None})
        return [self._public(item) async for item in cursor]

    async def update(self, item_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        update = deepcopy(patch)
        update["updatedAt"] = utc_now()
        await self.collection.update_one({"id": item_id}, {"$set": update})
        return await self.get(item_id)

    async def delete(self, item_id: str) -> bool:
        result = await self.collection.delete_one({"id": item_id})
        return result.deleted_count > 0

    async def ensure_unique(self, field: str) -> None:
        await self.collection.create_index([(field, ASCENDING)], unique=True)

    def _public(self, item: dict[str, Any]) -> dict[str, Any]:
        item = deepcopy(item)
        item.pop("_id", None)
        return item


def repository_for(
    db: Any, collection_name: str, mongodb_uri: str
) -> MongoRepository | InMemoryRepository:
    if mongodb_uri.startswith("memory://"):
        return InMemoryRepository()
    return MongoRepository(db[collection_name])
