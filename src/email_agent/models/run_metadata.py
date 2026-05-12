"""Run metadata models for persisted workflow diagnostics."""

from pydantic import BaseModel, Field


class RunMetadata(BaseModel):
    """Saved metadata describing how a run was produced."""

    run_date: str
    run_started_at: str = ""
    run_completed_at: str = ""
    provider: str
    language: str
    llm_enabled: bool
    llm_provider: str
    llm_classification_enabled: bool
    llm_summary_enabled: bool
    classification_mode: str
    summary_mode: str
    workflow_duration_ms: int = Field(default=0, ge=0)
    step_durations_ms: dict[str, int] = Field(default_factory=dict)
    llm_input_tokens: int = Field(default=0, ge=0)
    llm_output_tokens: int = Field(default=0, ge=0)
    llm_total_tokens: int = Field(default=0, ge=0)
    estimated_cost_eur: float = Field(default=0.0, ge=0.0)
    llm_usage_by_operation: dict[str, dict[str, int]] = Field(default_factory=dict)
    email_count: int = Field(default=0, ge=0)
    filtered_email_count: int = Field(default=0, ge=0)
    important_email_count: int = Field(default=0, ge=0)
    uncertain_assessment_count: int = Field(default=0, ge=0)
    abstained_assessment_count: int = Field(default=0, ge=0)
    llm_fallback_count: int = Field(default=0, ge=0)
