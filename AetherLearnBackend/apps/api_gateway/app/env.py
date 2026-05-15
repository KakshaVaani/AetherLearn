from __future__ import annotations

from functools import lru_cache

from pydantic_settings import SettingsConfigDict
from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    service_name: str = "api-gateway"
    service_port: int = 8000
    database_name: str = "aetherlearn_gateway"
    auth_service_url: str = "http://localhost:8001"
    school_service_url: str = "http://localhost:8002"
    lesson_service_url: str = "http://localhost:8003"
    ai_service_url: str = "http://localhost:8004"
    assignment_service_url: str = "http://localhost:8005"
    commons_service_url: str = "http://localhost:8006"
    review_service_url: str = "http://localhost:8007"
    sync_service_url: str = "http://localhost:8008"
    export_service_url: str = "http://localhost:8009"
    notification_service_url: str = "http://localhost:8010"
    storage_service_url: str = "http://localhost:8011"


@lru_cache
def get_settings() -> Settings:
    return Settings()
