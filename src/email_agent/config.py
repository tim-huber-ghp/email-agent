"""Application configuration."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings for the application."""

    env: str = Field(default="development", alias="EMAIL_AGENT_ENV")
    data_dir: Path = Field(default=Path("./data"), alias="EMAIL_AGENT_DATA_DIR")
    model_name: str = Field(default="gpt-4.1-mini", alias="EMAIL_AGENT_MODEL")
    use_llm: bool = Field(default=False, alias="EMAIL_AGENT_USE_LLM")
    llm_provider: str = Field(default="openai", alias="EMAIL_AGENT_LLM_PROVIDER")
    language: str = Field(default="en", alias="EMAIL_AGENT_LANGUAGE")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    gmail_client_id: str | None = Field(default=None, alias="GMAIL_CLIENT_ID")
    gmail_client_secret: str | None = Field(default=None, alias="GMAIL_CLIENT_SECRET")
    gmail_redirect_uri: str = Field(
        default="http://localhost:8000/oauth/callback",
        alias="GMAIL_REDIRECT_URI",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
    )


def get_settings() -> Settings:
    """Return application settings."""

    return Settings()
