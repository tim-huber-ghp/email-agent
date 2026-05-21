import json

import pytest

from email_agent.api.run_artifacts import read_run, update_extracted_item_review
from email_agent.models.review import ExtractedItemReviewUpdate


def test_read_run_hydrates_extracted_items_from_legacy_artifacts(tmp_path) -> None:
    _create_legacy_run(tmp_path)

    run = read_run(tmp_path, "2026-05-10")

    assert len(run["extractedItems"]) == 4
    assert run["extractedItems"][0]["review_status"] == "pending"
    assert run["extractedItems"][1]["item_type"] == "deadline"
    assert run["extractedItems"][2]["item_data"]["location_hint"] == "Zoom"
    assert run["extractedItems"][3]["item_type"] == "financial_obligation"
    assert run["runMetadata"]["extracted_item_count"] == 4


def test_update_extracted_item_review_persists_for_legacy_runs(tmp_path) -> None:
    _create_legacy_run(tmp_path)

    updated_item = update_extracted_item_review(
        tmp_path,
        "2026-05-10",
        "deadline:msg-1:0",
        ExtractedItemReviewUpdate(
            review_status="corrected",
            reviewed_value={"due_hint": "Tomorrow"},
            reviewer_note="Confirmed after checking the full thread.",
        ),
    )

    assert updated_item["review_status"] == "corrected"
    assert updated_item["reviewed_value"] == {"due_hint": "Tomorrow"}
    assert updated_item["reviewer_note"] == "Confirmed after checking the full thread."
    assert updated_item["reviewed_at"]

    run = read_run(tmp_path, "2026-05-10")
    deadline_item = next(item for item in run["extractedItems"] if item["id"] == "deadline:msg-1:0")
    assert deadline_item["review_status"] == "corrected"
    assert (tmp_path / "runs" / "2026-05-10" / "extracted_items.json").exists()


def test_update_extracted_item_review_rejects_unknown_item(tmp_path) -> None:
    _create_legacy_run(tmp_path)

    with pytest.raises(FileNotFoundError, match="Extracted item not found"):
        update_extracted_item_review(
            tmp_path,
            "2026-05-10",
            "missing-item",
            ExtractedItemReviewUpdate(review_status="confirmed"),
        )


def _write_json(path, payload) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def _create_legacy_run(tmp_path) -> None:
    run_dir = tmp_path / "runs" / "2026-05-10"
    run_dir.mkdir(parents=True)

    _write_json(
        run_dir / "summary.json",
        {
            "headline": "Your day in emails.",
            "overview": "You received important emails today.",
            "important_email_ids": ["msg-1"],
            "action_items": [
                {
                    "description": "Reply to the invoice email.",
                    "source_email_id": "msg-1",
                    "priority": "finance",
                }
            ],
            "counts_by_label": {"finance": 1},
            "language": "en",
        },
    )
    _write_json(
        run_dir / "assessments.json",
        [
            {
                "email_id": "msg-1",
                "label": "finance",
                "importance_score": 80,
                "reason": "Contains finance-related keywords.",
                "needs_action": True,
                "confidence_score": 84,
                "abstained": False,
                "uncertainty_note": "",
            }
        ],
    )
    _write_json(
        run_dir / "emails.json",
        [
            {
                "id": "msg-1",
                "source": "mock",
                "sender": "billing@example.com",
                "subject": "Invoice for May subscription",
                "received_at": "2026-05-10T09:00:00",
                "snippet": "Your monthly invoice is ready.",
                "labels": ["finance"],
                "body_preview": "Please review the billing statement for your $29.00 monthly plan.",
            }
        ],
    )
    _write_json(
        run_dir / "deadlines.json",
        [
            {
                "description": "Review the time-sensitive item in 'Invoice for May subscription'.",
                "source_email_id": "msg-1",
                "due_hint": "Today",
            }
        ],
    )
    _write_json(
        run_dir / "meetings.json",
        [
            {
                "title": "Budget sync",
                "source_email_id": "msg-1",
                "when_hint": "Monday",
                "location_hint": "Zoom",
                "needs_response": True,
            }
        ],
    )
    _write_json(
        run_dir / "subscriptions.json",
        [
            {
                "service_name": "May Subscription",
                "source_email_id": "msg-1",
                "renewal_hint": "Monthly",
                "cancellation_hint": "Cancel anytime",
                "amount_hint": "$29.00",
            }
        ],
    )
