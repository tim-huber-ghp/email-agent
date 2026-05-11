"""Evaluation helpers for classification and structured extraction quality."""

from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field

from email_agent.models.email import ImportanceLabel, NormalizedEmail
from email_agent.services.extraction import extract_deadlines, extract_meetings, extract_subscriptions
from email_agent.services.importance import assess_email


class EvaluationExample(BaseModel):
    """One labeled email example used for offline evaluation."""

    id: str
    sender: str
    subject: str
    received_at: str
    snippet: str
    body_preview: str = ""
    labels: list[str] = Field(default_factory=list)
    expected_label: ImportanceLabel
    expected_important: bool
    expected_needs_action: bool
    expected_deadline: bool
    expected_meeting: bool
    expected_subscription: bool


class BinaryMetric(BaseModel):
    """Precision and recall for a binary signal."""

    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float


class EvaluationReport(BaseModel):
    """Serializable evaluation output."""

    dataset_path: str
    total_examples: int
    label_accuracy: float
    important_email: BinaryMetric
    needs_action: BinaryMetric
    deadline_extraction: BinaryMetric
    meeting_extraction: BinaryMetric
    subscription_extraction: BinaryMetric
    mismatches: list[dict[str, object]] = Field(default_factory=list)


def load_evaluation_examples(dataset_path: Path) -> list[EvaluationExample]:
    """Load the labeled dataset from disk."""

    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    return [EvaluationExample.model_validate(item) for item in raw]


def run_heuristic_evaluation(dataset_path: Path) -> EvaluationReport:
    """Evaluate the current heuristic pipeline on a labeled dataset."""

    examples = load_evaluation_examples(dataset_path)
    emails = [_example_to_email(example) for example in examples]
    assessments = [assess_email(email) for email in emails]
    deadlines = extract_deadlines(emails, assessments, language="en")
    meetings = extract_meetings(emails, assessments)
    subscriptions = extract_subscriptions(emails, assessments)

    deadline_ids = {item.source_email_id for item in deadlines}
    meeting_ids = {item.source_email_id for item in meetings}
    subscription_ids = {item.source_email_id for item in subscriptions}

    label_matches = 0
    mismatches: list[dict[str, object]] = []

    important_expected: list[bool] = []
    important_predicted: list[bool] = []
    action_expected: list[bool] = []
    action_predicted: list[bool] = []
    deadline_expected: list[bool] = []
    deadline_predicted: list[bool] = []
    meeting_expected: list[bool] = []
    meeting_predicted: list[bool] = []
    subscription_expected: list[bool] = []
    subscription_predicted: list[bool] = []

    for example, assessment in zip(examples, assessments, strict=True):
        predicted_important = assessment.importance_score >= 50
        predicted_deadline = example.id in deadline_ids
        predicted_meeting = example.id in meeting_ids
        predicted_subscription = example.id in subscription_ids

        if assessment.label == example.expected_label:
            label_matches += 1
        else:
            mismatches.append(
                {
                    "email_id": example.id,
                    "subject": example.subject,
                    "expected_label": example.expected_label,
                    "predicted_label": assessment.label,
                    "expected_important": example.expected_important,
                    "predicted_important": predicted_important,
                }
            )

        important_expected.append(example.expected_important)
        important_predicted.append(predicted_important)
        action_expected.append(example.expected_needs_action)
        action_predicted.append(assessment.needs_action)
        deadline_expected.append(example.expected_deadline)
        deadline_predicted.append(predicted_deadline)
        meeting_expected.append(example.expected_meeting)
        meeting_predicted.append(predicted_meeting)
        subscription_expected.append(example.expected_subscription)
        subscription_predicted.append(predicted_subscription)

    return EvaluationReport(
        dataset_path=str(dataset_path),
        total_examples=len(examples),
        label_accuracy=_safe_divide(label_matches, len(examples)),
        important_email=_binary_metric(important_expected, important_predicted),
        needs_action=_binary_metric(action_expected, action_predicted),
        deadline_extraction=_binary_metric(deadline_expected, deadline_predicted),
        meeting_extraction=_binary_metric(meeting_expected, meeting_predicted),
        subscription_extraction=_binary_metric(subscription_expected, subscription_predicted),
        mismatches=mismatches,
    )


def save_evaluation_report(report: EvaluationReport, output_path: Path) -> Path:
    """Persist the evaluation report as JSON."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report.model_dump(mode="json"), indent=2),
        encoding="utf-8",
    )
    return output_path


def _example_to_email(example: EvaluationExample) -> NormalizedEmail:
    return NormalizedEmail.model_validate(
        {
            "id": example.id,
            "source": "evaluation",
            "sender": example.sender,
            "subject": example.subject,
            "received_at": example.received_at,
            "snippet": example.snippet,
            "labels": example.labels,
            "body_preview": example.body_preview,
        }
    )


def _binary_metric(expected: list[bool], predicted: list[bool]) -> BinaryMetric:
    tp = sum(1 for exp, pred in zip(expected, predicted, strict=True) if exp and pred)
    fp = sum(1 for exp, pred in zip(expected, predicted, strict=True) if not exp and pred)
    fn = sum(1 for exp, pred in zip(expected, predicted, strict=True) if exp and not pred)
    precision = _safe_divide(tp, tp + fp)
    recall = _safe_divide(tp, tp + fn)
    return BinaryMetric(
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=precision,
        recall=recall,
    )


def _safe_divide(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 3)
