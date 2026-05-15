from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "export-service"
    service_port: int = 8009
    database_name: str = "aetherlearn_exports"


@lru_cache
def get_settings() -> Settings:
    return Settings()
