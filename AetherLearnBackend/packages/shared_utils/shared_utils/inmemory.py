from __future__ import annotations

from copy import deepcopy
from typing import Any

from .dates import utc_now
from .object_id import new_id


class InMemoryRepository:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    async def insert(self, document: dict[str, Any]) -> dict[str, Any]:
        item = deepcopy(document)
        item.setdefault("id", new_id())
        item.setdefault("createdAt", utc_now().isoformat())
        item["updatedAt"] = utc_now().isoformat()
        self.items[item["id"]] = item
        return deepcopy(item)

    async def get(self, item_id: str) -> dict[str, Any] | None:
        item = self.items.get(item_id)
        return deepcopy(item) if item else None

    async def find_one(self, **filters: Any) -> dict[str, Any] | None:
        for item in self.items.values():
            if all(item.get(key) == value for key, value in filters.items()):
                return deepcopy(item)
        return None

    async def list(self, **filters: Any) -> list[dict[str, Any]]:
        items = []
        for item in self.items.values():
            if all(item.get(key) == value for key, value in filters.items() if value is not None):
                items.append(deepcopy(item))
        return items

    async def update(self, item_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        current = self.items.get(item_id)
        if not current:
            return None
        current.update(deepcopy(patch))
        current["updatedAt"] = utc_now().isoformat()
        return deepcopy(current)

    async def delete(self, item_id: str) -> bool:
        return self.items.pop(item_id, None) is not None
