"""Run metadata models for persisted workflow diagnostics."""

from pydantic import BaseModel, Field


class RunMetadata(BaseModel):
    """Saved metadata describing how a run was produced."""

    run_date: str
    provider: str
    language: str
    llm_enabled: bool
    llm_provider: str
    llm_classification_enabled: bool
    llm_summary_enabled: bool
    classification_mode: str
    summary_mode: str
    email_count: int = Field(default=0, ge=0)
    filtered_email_count: int = Field(default=0, ge=0)
    important_email_count: int = Field(default=0, ge=0)
    uncertain_assessment_count: int = Field(default=0, ge=0)
    abstained_assessment_count: int = Field(default=0, ge=0)
    llm_fallback_count: int = Field(default=0, ge=0)
