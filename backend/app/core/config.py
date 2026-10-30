import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field, Field, AliasChoices

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
    DEMO_TENANT_ID: str = "demo123456"
    DEMO_COMPANY_CODE: str = "DEMOLOGISTICS"
    DEMO_TENANT_NAME: str = "Demo Logistics Pvt Ltd"
    DEMO_ADMIN_EMAIL: str = "admin@demo.com"
    DEMO_ADMIN_PASSWORD: str = "PantherTMS@2026!"

    # Razorpay Payments & Subscriptions (Phase 6)
    RAZORPAY_KEY_ID: str = "rzp_test_panther_tms"
    RAZORPAY_KEY_SECRET: str = "rzp_secret_panther_tms_secure"
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_webhook_secret_panther_2026"
    RAZORPAY_GRACE_PERIOD_DAYS: int = 7

    # E-Way Bill / GSP (GST Suvidha Provider) Platform Credentials (loaded from project env / Dokploy)
    GSP_BASE_URL: str = "https://gsp.adaequare.com"
    GSP_CLIENT_ID: Optional[str] = None
    GSP_CLIENT_SECRET: Optional[str] = None

    # Freight Tiger SIM Tracking Integration (PRD §11 / FT Trip APIs)
    FREIGHT_TIGER_BASE_URL: str = Field(
        default="https://api.freighttiger.com/api/tether",
        validation_alias=AliasChoices(
            "FREIGHT_TIGER_BASE_URL",
            "FT_BASE_URL",
        ),
    )
    FREIGHT_TIGER_AUTH_TOKEN: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "FREIGHT_TIGER_AUTH_TOKEN",
            "FT_AUTH_TOKEN",
            "FREIGHT_TIGER_TOKEN",
            "FT_TOKEN",
            "FREIGHTTIGER_AUTH_TOKEN",
            "FREIGHTTIGER_TOKEN",
            "FREIGHT_TIGER_API_KEY",
            "FT_API_KEY",
        ),
    )

    # FASTag Tracking Integration (Loaded from project env / Dokploy)
    FASTAG_API_URL: str = "https://logitrack.webcorevision.com:5000/api/v1/fastag"
    FASTAG_API_KEY: Optional[str] = None
    GOOGLE_MAPS_API_KEY: Optional[str] = None

    # Panther AI Assistant (Google Gemini via OpenAI-Compatible Endpoint)
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "OPENAI_API_KEY",
            "GEMINI_API_KEY",
            "GOOGLE_API_KEY",
        ),
    )
    OPENAI_BASE_URL: str = Field(
        default="https://generativelanguage.googleapis.com/v1beta/openai/",
        validation_alias=AliasChoices(
            "OPENAI_BASE_URL",
            "GEMINI_BASE_URL",
        ),
    )
    OPENAI_MODEL: str = Field(
        default="gemini-2.5-flash",
        validation_alias=AliasChoices(
            "OPENAI_MODEL",
            "GEMINI_MODEL",
        ),
    )
    AI_SYSTEM_NAME: str = "Panther AI (Gemini 2.5 Flash)"
    AI_ENABLE_LR_CREATION: bool = Field(
        default=False,
        validation_alias=AliasChoices("AI_ENABLE_LR_CREATION"),
        description="Whether conversational LR creation write operations are enabled. Disabled by default in production for safety."
    )
    AI_ENABLE_JOB_CREATION: bool = Field(
        default=False,
        validation_alias=AliasChoices("AI_ENABLE_JOB_CREATION"),
        description="Whether conversational Job creation write operations are enabled. Disabled by default in production for safety."
    )
    AI_ENABLE_HC_CREATION: bool = Field(
        default=False,
        validation_alias=AliasChoices("AI_ENABLE_HC_CREATION"),
        description="Whether conversational Hire Challan creation write operations are enabled. Disabled by default in production for safety."
    ) 

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://demo.localhost:3000",
        "http://demo.panthertms.local:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env", "/app/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @computed_field
    def control_db_async_url(self) -> str:
        if self.CONTROL_DATABASE_URL:
            if self.POSTGRES_HOST != "localhost" and ("@localhost" in self.CONTROL_DATABASE_URL or "@127.0.0.1" in self.CONTROL_DATABASE_URL):
                return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"
            return self.CONTROL_DATABASE_URL
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"

    @computed_field
    def control_db_sync_url(self) -> str:
        if self.CONTROL_DATABASE_SYNC_URL:
            if self.POSTGRES_HOST != "localhost" and ("@localhost" in self.CONTROL_DATABASE_SYNC_URL or "@127.0.0.1" in self.CONTROL_DATABASE_SYNC_URL):
                return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"
            return self.CONTROL_DATABASE_SYNC_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.CONTROL_DB_NAME}"

    @computed_field
    def redis_connection_url(self) -> str:
        if self.REDIS_URL:
            if self.REDIS_HOST != "localhost" and ("@localhost" in self.REDIS_URL or "//localhost" in self.REDIS_URL or "//127.0.0.1" in self.REDIS_URL):
                return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    def get_tenant_db_async_url(self, db_name: str) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"

    def get_tenant_db_sync_url(self, db_name: str) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{db_name}"

settings = Settings()

def sanitize_ft_base_url(url: Optional[str] = None) -> str:
    cleaned = (url or settings.FREIGHT_TIGER_BASE_URL or "https://api.freighttiger.com/api/tether").strip().rstrip("/")
    if "integration.freighttiger.com" in cleaned or not cleaned:
        return "https://api.freighttiger.com/api/tether"
    return cleaned

def resolve_freight_tiger_token(explicit_token: Optional[str] = None) -> Optional[str]:
    """
    Resolves Freight Tiger Bearer JWT authentication token with robust fallback:
    1. Explicit caller / database company settings override
    2. Environment variables (.env / Dokploy)
    3. settings.FREIGHT_TIGER_AUTH_TOKEN
    """
    if explicit_token and explicit_token.strip():
        return explicit_token.strip()

    for key in (
        "FREIGHT_TIGER_AUTH_TOKEN",
        "FT_AUTH_TOKEN",
        "FREIGHT_TIGER_TOKEN",
        "FT_TOKEN",
        "FREIGHTTIGER_AUTH_TOKEN",
        "FREIGHTTIGER_TOKEN",
        "FREIGHT_TIGER_API_KEY",
        "FT_API_KEY",
    ):
        val = os.getenv(key)
        if val and val.strip():
            return val.strip()

    if settings.FREIGHT_TIGER_AUTH_TOKEN and settings.FREIGHT_TIGER_AUTH_TOKEN.strip():
        return settings.FREIGHT_TIGER_AUTH_TOKEN.strip()

    return None
