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
    llm_confidence_threshold: int = Field(default=70, alias="EMAIL_AGENT_LLM_CONFIDENCE_THRESHOLD")
    llm_abstain_threshold: int = Field(default=40, alias="EMAIL_AGENT_LLM_ABSTAIN_THRESHOLD")
    llm_max_emails: int = Field(default=6, alias="EMAIL_AGENT_LLM_MAX_EMAILS")
    llm_max_snippet_chars: int = Field(default=120, alias="EMAIL_AGENT_LLM_MAX_SNIPPET_CHARS")
    llm_max_body_chars: int = Field(default=180, alias="EMAIL_AGENT_LLM_MAX_BODY_CHARS")
    llm_input_cost_per_1k_tokens: float = Field(
        default=0.0,
        alias="EMAIL_AGENT_LLM_INPUT_COST_PER_1K_TOKENS",
    )
    llm_output_cost_per_1k_tokens: float = Field(
        default=0.0,
        alias="EMAIL_AGENT_LLM_OUTPUT_COST_PER_1K_TOKENS",
    )
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
    webde_email: str | None = Field(default=None, alias="WEBDE_EMAIL")
    webde_password: str | None = Field(default=None, alias="WEBDE_PASSWORD")
    webde_imap_host: str = Field(default="imap.web.de", alias="WEBDE_IMAP_HOST")
    webde_imap_port: int = Field(default=993, alias="WEBDE_IMAP_PORT")
    webde_imap_folders: str = Field(default="INBOX", alias="WEBDE_IMAP_FOLDERS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        case_sensitive=False,
        populate_by_name=True,
    )


def get_settings() -> Settings:
    """Return application settings."""

    return Settings()
