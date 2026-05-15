from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "sync-service"
    service_port: int = 8008
    database_name: str = "aetherlearn_sync"


@lru_cache
def get_settings() -> Settings:
    return Settings()
