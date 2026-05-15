from pathlib import Path

from shared_utils.errors import NotFoundError, ValidationAppError

from .base import StorageDriver


class LocalStorageDriver(StorageDriver):
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path_for_key(self, key: str) -> Path:
        if not key or key.startswith(("/", "\\")):
            raise ValidationAppError("Invalid object key")
        path = (self.root / key).resolve()
        if path != self.root and self.root not in path.parents:
            raise ValidationAppError("Invalid object key")
        return path

    async def put(self, key: str, content: bytes, mime_type: str) -> None:
        path = self._path_for_key(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    async def get(self, key: str) -> bytes:
        path = self._path_for_key(key)
        if not path.exists() or not path.is_file():
            raise NotFoundError("Object not found")
        return path.read_bytes()
