"""Shared LangGraph state models."""

from typing import TypedDict

from email_agent.models.email import EmailAssessment, NormalizedEmail, RawEmail
from email_agent.models.run_metadata import RunMetadata
from email_agent.models.summary import ActionItem, DailySummary, ExtractedDeadline, ExtractedMeeting


class AgentState(TypedDict, total=False):
    """Mutable graph state passed between nodes."""

    provider: str
    raw_emails: list[RawEmail]
    emails: list[NormalizedEmail]
    filtered_emails: list[NormalizedEmail]
    assessments: list[EmailAssessment]
    action_items: list[ActionItem]
    deadlines: list[ExtractedDeadline]
    meetings: list[ExtractedMeeting]
    summary: DailySummary
    run_date: str
    persisted_run_dir: str
    classification_mode: str
    classification_error: str
    summary_mode: str
    summary_error: str
    language: str
    has_emails: bool
    has_filtered_emails: bool
    llm_enabled_for_run: bool
    llm_classification_enabled_for_run: bool
    llm_summary_enabled_for_run: bool
    run_metadata: RunMetadata
