from __future__ import annotations

from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "lesson-service"
    service_port: int = 8003
    database_name: str = "aetherlearn_lessons"


@lru_cache
def get_settings() -> Settings:
    return Settings()
