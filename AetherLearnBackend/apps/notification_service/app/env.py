from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "notification-service"
    service_port: int = 8010
    database_name: str = "aetherlearn_notifications"


@lru_cache
def get_settings() -> Settings:
    return Settings()
