from __future__ import annotations

from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "auth-service"
    service_port: int = 8001
    database_name: str = "aetherlearn_auth"


@lru_cache
def get_settings() -> Settings:
    return Settings()
