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
    use_llm_classification: bool = Field(
        default=False,
        alias="EMAIL_AGENT_USE_LLM_CLASSIFICATION",
    )
    use_llm_summary: bool = Field(
        default=True,
        alias="EMAIL_AGENT_USE_LLM_SUMMARY",
    )
    llm_max_emails: int = Field(default=6, alias="EMAIL_AGENT_LLM_MAX_EMAILS")
    llm_max_snippet_chars: int = Field(default=120, alias="EMAIL_AGENT_LLM_MAX_SNIPPET_CHARS")
    llm_max_body_chars: int = Field(default=180, alias="EMAIL_AGENT_LLM_MAX_BODY_CHARS")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    gmail_credentials_file: Path = Field(
        default=Path("./credentials.json"),
        alias="GMAIL_CREDENTIALS_FILE",
    )
    gmail_token_file: Path = Field(
        default=Path("./data/auth/gmail_token.json"),
        alias="GMAIL_TOKEN_FILE",
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
