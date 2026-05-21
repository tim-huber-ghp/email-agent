import pytest
from pydantic import ValidationError

from email_agent.api.server import EmailAgentAPIHandler
from email_agent.models.review import ExtractedItemReviewUpdate


def test_parse_review_update_path_extracts_run_date_and_item_id() -> None:
    handler = EmailAgentAPIHandler.__new__(EmailAgentAPIHandler)

    run_date, item_id = handler._parse_review_update_path(
        "/api/runs/2026-05-10/extracted-items/deadline%3Amsg-1%3A0"
    )

    assert run_date == "2026-05-10"
    assert item_id == "deadline:msg-1:0"


def test_parse_review_update_path_rejects_invalid_route() -> None:
    handler = EmailAgentAPIHandler.__new__(EmailAgentAPIHandler)

    with pytest.raises(ValueError, match="Route not found"):
        handler._parse_review_update_path("/api/runs/2026-05-10")


def test_review_update_model_rejects_corrected_without_payload() -> None:
    with pytest.raises(ValidationError, match="reviewed_value"):
        ExtractedItemReviewUpdate(review_status="corrected")
