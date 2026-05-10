"""Shared LangGraph state models."""

from typing import TypedDict

from email_agent.models.summary import DailySummary
from email_agent.models.email import NormalizedEmail


class AgentState(TypedDict, total=False):
    """Mutable graph state passed between nodes."""

    provider: str
    emails: list[NormalizedEmail]
    filtered_emails: list[NormalizedEmail]
    summary: DailySummary
    run_date: str
