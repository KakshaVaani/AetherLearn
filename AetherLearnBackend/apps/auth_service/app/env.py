from __future__ import annotations

from functools import lru_cache

from shared_utils.env import BaseServiceSettings


class Settings(BaseServiceSettings):
    service_name: str = "auth-service"
    service_port: int = 8001
    database_name: str = "aetherlearn_auth"
    google_oauth_client_ids: str = ""

    @property
    def google_client_id_list(self) -> list[str]:
        return [item.strip() for item in self.google_oauth_client_ids.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
