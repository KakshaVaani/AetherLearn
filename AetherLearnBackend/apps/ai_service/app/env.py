from __future__ import annotations

from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "ai-service"
    service_port: int = 8004
    database_name: str = "aetherlearn_ai"
    enforce_gemma_model: bool = True
    required_gemma_model: str = "gemma4:e4b"


@lru_cache
def get_settings() -> Settings:
    return Settings()
