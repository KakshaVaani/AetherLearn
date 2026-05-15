from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "commons-service"
    service_port: int = 8006
    database_name: str = "aetherlearn_commons"


@lru_cache
def get_settings() -> Settings:
    return Settings()
