from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "worker"
    service_port: int = 8090


@lru_cache
def get_settings() -> Settings:
    return Settings()
