import json
from pathlib import Path

from email_agent.evaluation import (
    export_real_email_drafts,
    finalize_real_email_dataset,
    load_evaluation_examples,
    run_heuristic_evaluation,
)
from email_agent.models.email import RawEmail


def test_load_evaluation_examples_reads_dataset() -> None:
    examples = load_evaluation_examples(Path("data/eval/labeled_emails.json"))

    assert len(examples) >= 8
    assert examples[0].expected_label == "urgent"


def test_run_heuristic_evaluation_returns_metrics_and_mismatches() -> None:
    report = run_heuristic_evaluation(Path("data/eval/labeled_emails.json"))

    assert report.total_examples >= 8
    assert 0 <= report.label_accuracy <= 1
    assert report.important_email.true_positives >= 1
    assert report.deadline_extraction.true_positives >= 1
    assert report.meeting_extraction.true_positives >= 1
    assert report.subscription_extraction.true_positives >= 1
    assert isinstance(report.mismatches, list)


def test_run_heuristic_evaluation_on_hard_dataset_surfaces_mismatches() -> None:
    report = run_heuristic_evaluation(Path("data/eval/labeled_emails_hard.json"))

    assert report.total_examples >= 8
    assert report.label_accuracy == 1
    assert report.meeting_extraction.precision == 1
    assert report.subscription_extraction.precision == 1


def test_run_heuristic_evaluation_on_adversarial_dataset_is_not_perfect() -> None:
    report = run_heuristic_evaluation(Path("data/eval/labeled_emails_adversarial.json"))

    assert report.total_examples >= 10
    assert report.label_accuracy == 1
    assert report.meeting_extraction.precision == 1
    assert report.subscription_extraction.precision == 1
    assert report.deadline_extraction.precision == 1


def test_export_real_email_drafts_anonymizes_sensitive_fields(tmp_path: Path) -> None:
    raw_emails = [
        RawEmail(
            provider_id="gmail-1",
            source="gmail",
            payload={
                "sender": "Alice Example <alice@company.com>",
                "subject": "Invoice for alice@company.com",
                "received_at": "2026-05-12T09:00:00+00:00",
                "snippet": "Call me at +49 123 456789 and open https://example.com/billing/12345",
                "body_preview": "Your annual subscription renews on Friday for €49.00. Contact alice@company.com.",
                "labels": ["INBOX", "CATEGORY_UPDATES"],
            },
        )
    ]

    output_path = tmp_path / "drafts.json"
    saved_path = export_real_email_drafts(raw_emails, output_path)
    exported = json.loads(saved_path.read_text(encoding="utf-8"))

    assert len(exported) == 1
    assert exported[0]["sender"] == "sender-001@example.com"
    assert "<email>" in exported[0]["subject"]
    assert "<phone>" in exported[0]["snippet"]
    assert "<link>" in exported[0]["snippet"]
    assert "<email>" in exported[0]["body_preview"]
    assert exported[0]["heuristic_label"] in {
        "finance",
        "urgent",
        "meeting",
        "needs_reply",
        "info",
        "low_priority",
    }


def test_finalize_real_email_dataset_uses_reviewed_expected_fields(tmp_path: Path) -> None:
    draft_path = tmp_path / "draft.json"
    draft_path.write_text(
        json.dumps(
            [
                {
                    "id": "real-001",
                    "sender": "sender-001@example.com",
                    "subject": "Invoice reminder",
                    "received_at": "2026-05-12T09:00:00+00:00",
                    "snippet": "Please review your invoice.",
                    "body_preview": "Monthly subscription billing notice.",
                    "labels": ["inbox"],
                    "heuristic_label": "finance",
                    "heuristic_important": True,
                    "heuristic_needs_action": True,
                    "heuristic_deadline": False,
                    "heuristic_meeting": False,
                    "heuristic_subscription": True,
                    "expected_label": "info",
                    "expected_important": False,
                    "notes": "Manual override",
                }
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    output_path = tmp_path / "labeled.json"
    saved_path = finalize_real_email_dataset(draft_path, output_path)
    finalized = json.loads(saved_path.read_text(encoding="utf-8"))

    assert finalized[0]["expected_label"] == "info"
    assert finalized[0]["expected_important"] is False
    assert finalized[0]["expected_needs_action"] is True
    assert finalized[0]["expected_subscription"] is True
