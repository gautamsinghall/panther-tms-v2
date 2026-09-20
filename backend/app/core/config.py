import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "PantherTMS"
    API_V1_PREFIX: str = "/api/v1"
    BASE_DOMAIN: str = "localhost"  # e.g. localhost or panthertms.com

    # Security
    SECRET_KEY: str = "panther-tms-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    POSTGRES_USER: str = "panther"
    POSTGRES_PASSWORD: str = "panther_secret"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433
    CONTROL_DB_NAME: str = "panther_control"

    CONTROL_DATABASE_URL: Optional[str] = None
    CONTROL_DATABASE_SYNC_URL: Optional[str] = None

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: Optional[str] = None

    # Demo Tenant
    DEMO_TENANT_SUBDOMAIN: str = "demo"
    DEMO_TENANT_NAME: str = "Demo Logistics Pvt Ltd"
    DEMO_ADMIN_EMAIL: str = "admin@demo.com"
    DEMO_ADMIN_PASSWORD: str = "PantherTMS@2026!"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://demo.localhost:3000",
        "http://demo.panthertms.local:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @computed_field
    def control_db_async_url(self) -> str:
        if self.CONTROL_DATABASE_URL:
            return self.CONTROL_DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"

    @computed_field
    def control_db_sync_url(self) -> str:
        if self.CONTROL_DATABASE_SYNC_URL:
            return self.CONTROL_DATABASE_SYNC_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"

    def get_tenant_db_async_url(self, db_name: str) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"

    def get_tenant_db_sync_url(self, db_name: str) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"

settings = Settings()
