"""Email data models."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class RawEmail(BaseModel):
    """Provider-specific email content before normalization."""

    provider_id: str
    source: str
    payload: dict = Field(default_factory=dict)


class NormalizedEmail(BaseModel):
    """Shared email representation used by the workflow."""

    id: str
    source: str
    sender: str
    subject: str
    received_at: datetime
    snippet: str
    labels: list[str] = Field(default_factory=list)
    body_preview: str = ""


ImportanceLabel = Literal["urgent", "needs_reply", "meeting", "finance", "info", "low_priority"]


class EmailAssessment(BaseModel):
    """Simple importance classification for an email."""

    email_id: str
    label: ImportanceLabel
    importance_score: int = Field(ge=0, le=100)
    reason: str
    needs_action: bool = False
