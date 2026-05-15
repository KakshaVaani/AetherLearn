from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "storage-service"
    service_port: int = 8011
    database_name: str = "aetherlearn_storage"


@lru_cache
def get_settings() -> Settings:
    return Settings()
