from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "review-service"
    service_port: int = 8007
    database_name: str = "aetherlearn_review"


@lru_cache
def get_settings() -> Settings:
    return Settings()
