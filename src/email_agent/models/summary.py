"""Summary output models."""

from pydantic import BaseModel, Field

from email_agent.models.email import ImportanceLabel


class ActionItem(BaseModel):
    """A follow-up item extracted from important emails."""

    description: str
    source_email_id: str
    priority: ImportanceLabel = "info"


class DailySummary(BaseModel):
    """Final end-of-day summary shown to the user."""

    overview: str
    important_email_ids: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    headline: str = ""
    counts_by_label: dict[str, int] = Field(default_factory=dict)
    language: str = "en"
