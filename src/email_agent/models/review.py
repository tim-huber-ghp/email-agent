"""Review request models for extracted items."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, model_validator

from email_agent.models.summary import ReviewStatus


class ExtractedItemReviewUpdate(BaseModel):
    """Validated payload for extracted-item review mutations."""

    review_status: ReviewStatus
    reviewed_value: dict[str, Any] | None = None
    reviewer_note: str = ""

    @model_validator(mode="after")
    def validate_corrected_value(self) -> ExtractedItemReviewUpdate:
        if self.review_status == "corrected" and not self.reviewed_value:
            raise ValueError("Corrected review updates require a reviewed_value payload.")
        return self
