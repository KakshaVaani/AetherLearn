from __future__ import annotations

from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "school-service"
    service_port: int = 8002
    database_name: str = "aetherlearn_school"


@lru_cache
def get_settings() -> Settings:
    return Settings()
