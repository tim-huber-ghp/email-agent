"""Email data models."""

from datetime import datetime

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
