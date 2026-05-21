"""Summary output models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from email_agent.models.email import ImportanceLabel


class ActionItem(BaseModel):
    """A follow-up item extracted from important emails."""

    description: str
    source_email_id: str
    priority: ImportanceLabel = "info"


class ExtractedDeadline(BaseModel):
    """A structured deadline signal found in an email."""

    description: str
    source_email_id: str
    due_hint: str = ""


class ExtractedMeeting(BaseModel):
    """A structured meeting signal found in an email."""

    title: str
    source_email_id: str
    when_hint: str = ""
    location_hint: str = ""
    needs_response: bool = False


class ExtractedSubscription(BaseModel):
    """A recurring subscription or renewal signal found in an email."""

    service_name: str
    source_email_id: str
    renewal_hint: str = ""
    cancellation_hint: str = ""
    amount_hint: str = ""


ExtractedItemType = Literal[
    "action_item",
    "deadline",
    "meeting",
    "financial_obligation",
    "follow_up",
]
ReviewStatus = Literal["pending", "confirmed", "rejected", "corrected"]


class ExtractedItem(BaseModel):
    """Canonical extracted-item contract for reviewable workflow outputs."""

    id: str
    source_email_id: str
    item_type: ExtractedItemType
    title: str = ""
    description: str = ""
    normalized_datetime: str | None = None
    confidence_score: int = Field(default=100, ge=0, le=100)
    confidence_reason: str = ""
    evidence_text: str = ""
    evidence_fields: dict[str, str] = Field(default_factory=dict)
    review_status: ReviewStatus = "pending"
    reviewed_value: dict[str, Any] | None = None
    reviewed_at: str = ""
    reviewer_note: str = ""
    item_data: dict[str, Any] = Field(default_factory=dict)


class DailySummary(BaseModel):
    """Final end-of-day summary shown to the user."""

    overview: str
    important_email_ids: list[str] = Field(default_factory=list)
    action_items: list[ActionItem] = Field(default_factory=list)
    headline: str = ""
    counts_by_label: dict[str, int] = Field(default_factory=dict)
    language: str = "en"
