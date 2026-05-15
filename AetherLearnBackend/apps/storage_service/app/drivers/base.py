from abc import ABC, abstractmethod


class StorageDriver(ABC):
    @abstractmethod
    async def put(self, key: str, content: bytes, mime_type: str) -> None: ...

    @abstractmethod
    async def get(self, key: str) -> bytes: ...
