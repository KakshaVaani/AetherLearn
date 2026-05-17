from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import Field, model_validator
from pydantic.fields import PydanticUndefined
from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    app_name: str = "AetherLearn"
    app_env: str = "development"
    app_version: str = "1.0.0"
    log_level: str = "info"
    service_name: str = "service"
    service_host: str = "0.0.0.0"
    service_port: int = 8000
    mongodb_uri: str = "mongodb://localhost:27017"
    redis_url: str = "redis://localhost:6379/0"
    nats_url: str = "nats://localhost:4222"
    internal_service_secret: str = "change-me"
    jwt_access_secret: str = "change-me"
    jwt_refresh_secret: str = "change-me"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    cors_origins: str = "http://localhost:8081,http://localhost:3000"
    school_hub_mode: bool = False
    commons_enabled: bool = True
    commons_review_required: bool = True
    max_image_mb: int = 8
    max_kvpack_mb: int = 25
    auth_demo_mode: bool = True
    seed_demo_data: bool = True
    use_mock: bool = False
    allow_runtime_fallback: bool = True
    ai_runtime: str = "auto"
    gemini_api_key: str = ""
    gemini_model: str = "gemma-4-26b-a4b-it"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4"
    object_storage_driver: str = "local"
    local_storage_dir: str = ".data/storage"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "aetherlearn"
    s3_endpoint: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket: str = ""
    school_hub_sync_enabled: bool = True
    school_hub_name: str = ""
    cloud_api_base_url: str = ""
    offline_sqlite_supported: bool = True
    offline_sqlite_schema_version: int = 1
    offline_sync_max_batch: int = 100
    offline_sync_pull_interval_seconds: int = 300
    offline_sync_slow_network_queue_writes: bool = True
    log_prompts: bool = False
    log_raw_images: bool = False
    database_name: str = Field(default="aetherlearn_service")

    @model_validator(mode="before")
    @classmethod
    def ignore_blank_values_for_defaulted_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        cleaned = dict(data)
        for field_name, value in data.items():
            if not isinstance(value, str) or value.strip() != "":
                continue

            field = cls.model_fields.get(field_name)
            if field is None:
                continue

            if field.default is not PydanticUndefined or field.default_factory is not None:
                cleaned.pop(field_name, None)

        return cleaned

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    def validate_production_secrets(self) -> list[str]:
        warnings: list[str] = []
        if self.is_production:
            for key, value in {
                "INTERNAL_SERVICE_SECRET": self.internal_service_secret,
                "JWT_ACCESS_SECRET": self.jwt_access_secret,
                "JWT_REFRESH_SECRET": self.jwt_refresh_secret,
            }.items():
                if not value or value == "change-me":
                    warnings.append(f"{key} must be configured in production")
                elif len(value.encode("utf-8")) < 32:
                    warnings.append(f"{key} should be at least 32 bytes for HS256/HMAC")
        return warnings

    def validate_production_config(self) -> list[str]:
        errors = self.validate_production_secrets()
        if not self.is_production:
            return errors
        if self.auth_demo_mode:
            errors.append("AUTH_DEMO_MODE must be false in production")
        if self.seed_demo_data:
            errors.append("SEED_DEMO_DATA must be false in production")
        if self.log_raw_images:
            errors.append("LOG_RAW_IMAGES must be false in production")
        if self.log_prompts:
            errors.append("LOG_PROMPTS must be false in production")
        if "*" in self.cors_origin_list:
            errors.append("CORS_ORIGINS must not include '*' in production")
        if self.ai_runtime == "mock" and not self.school_hub_mode:
            errors.append("AI_RUNTIME=mock is not allowed in production outside school hub mode")
        if self.ai_runtime == "gemini" and not self.gemini_api_key:
            errors.append("GEMINI_API_KEY is required when AI_RUNTIME=gemini")
        if self.object_storage_driver == "minio":
            for key, value in {
                "MINIO_ENDPOINT": self.minio_endpoint,
                "MINIO_ACCESS_KEY": self.minio_access_key,
                "MINIO_SECRET_KEY": self.minio_secret_key,
                "MINIO_BUCKET": self.minio_bucket,
            }.items():
                if not value:
                    errors.append(f"{key} is required when OBJECT_STORAGE_DRIVER=minio")
        if self.object_storage_driver == "s3":
            for key, value in {
                "S3_ACCESS_KEY_ID": self.s3_access_key_id,
                "S3_SECRET_ACCESS_KEY": self.s3_secret_access_key,
                "S3_BUCKET": self.s3_bucket,
            }.items():
                if not value:
                    errors.append(f"{key} is required when OBJECT_STORAGE_DRIVER=s3")
        return errors

    def assert_production_ready(self) -> None:
        errors = self.validate_production_config()
        if errors:
            joined = "; ".join(errors)
            raise RuntimeError(f"Production configuration is not safe: {joined}")


@lru_cache
def get_base_settings() -> BaseServiceSettings:
    return BaseServiceSettings()
