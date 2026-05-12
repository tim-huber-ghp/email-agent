"""Evaluation helpers for classification and structured extraction quality."""

from __future__ import annotations

import json
from pathlib import Path
import re

from pydantic import BaseModel, Field

from email_agent.config import Settings
from email_agent.models.email import EmailAssessment, ImportanceLabel, NormalizedEmail, RawEmail
from email_agent.services.extraction import extract_deadlines, extract_meetings, extract_subscriptions
from email_agent.services.importance import assess_email
from email_agent.services.llm import classify_emails_with_llm, llm_classification_enabled


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

    strategy: str
    dataset_path: str
    total_examples: int
    label_accuracy: float
    important_email: BinaryMetric
    needs_action: BinaryMetric
    deadline_extraction: BinaryMetric
    meeting_extraction: BinaryMetric
    subscription_extraction: BinaryMetric
    mismatches: list[dict[str, object]] = Field(default_factory=list)


class EvaluationDraftExample(BaseModel):
    """An anonymized real-email draft ready for manual labeling."""

    id: str
    sender: str
    subject: str
    received_at: str
    snippet: str
    body_preview: str = ""
    labels: list[str] = Field(default_factory=list)
    heuristic_label: ImportanceLabel
    heuristic_important: bool
    heuristic_needs_action: bool
    heuristic_deadline: bool
    heuristic_meeting: bool
    heuristic_subscription: bool
    notes: str = ""


class ReviewedEvaluationDraft(EvaluationDraftExample):
    """A reviewed draft may override heuristic suggestions with final expected labels."""

    expected_label: ImportanceLabel | None = None
    expected_important: bool | None = None
    expected_needs_action: bool | None = None
    expected_deadline: bool | None = None
    expected_meeting: bool | None = None
    expected_subscription: bool | None = None


EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"\+?\d[\d\s()./-]{7,}\d")
LONG_NUMBER_PATTERN = re.compile(r"\b\d{5,}\b")


def load_evaluation_examples(dataset_path: Path) -> list[EvaluationExample]:
    """Load the labeled dataset from disk."""

    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    return [EvaluationExample.model_validate(item) for item in raw]


def run_heuristic_evaluation(dataset_path: Path) -> EvaluationReport:
    """Evaluate the current heuristic pipeline on a labeled dataset."""

    examples = load_evaluation_examples(dataset_path)
    emails = [_example_to_email(example) for example in examples]
    assessments = [assess_email(email) for email in emails]
    return _build_report(
        strategy="heuristic",
        dataset_path=dataset_path,
        examples=examples,
        emails=emails,
        assessments=assessments,
    )


def run_llm_evaluation(dataset_path: Path, settings: Settings) -> EvaluationReport:
    """Evaluate the LLM classification path on a labeled dataset."""

    if not llm_classification_enabled(settings):
        raise ValueError(
            "LLM classification is not enabled. Set EMAIL_AGENT_USE_LLM=true and "
            "EMAIL_AGENT_USE_LLM_CLASSIFICATION=true with a valid provider key."
        )

    examples = load_evaluation_examples(dataset_path)
    emails = [_example_to_email(example) for example in examples]
    assessments = classify_emails_with_llm(emails, settings)
    return _build_report(
        strategy="llm",
        dataset_path=dataset_path,
        examples=examples,
        emails=emails,
        assessments=assessments,
    )


def run_comparison_evaluation(dataset_path: Path, settings: Settings) -> list[EvaluationReport]:
    """Run heuristic evaluation and LLM evaluation when enabled."""

    reports = [run_heuristic_evaluation(dataset_path)]
    if llm_classification_enabled(settings):
        reports.append(run_llm_evaluation(dataset_path, settings))
    return reports


def save_evaluation_report(report: EvaluationReport, output_path: Path) -> Path:
    """Persist one evaluation report as JSON."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report.model_dump(mode="json"), indent=2),
        encoding="utf-8",
    )
    return output_path


def save_evaluation_reports(reports: list[EvaluationReport], output_dir: Path) -> list[Path]:
    """Persist multiple evaluation reports and return their paths."""

    output_dir.mkdir(parents=True, exist_ok=True)
    saved_paths: list[Path] = []
    for report in reports:
        saved_paths.append(save_evaluation_report(report, output_dir / f"{report.strategy}_report.json"))
    return saved_paths


def export_real_email_drafts(
    raw_emails: list[RawEmail],
    output_path: Path,
) -> Path:
    """Write anonymized Gmail examples with heuristic suggestions for manual labeling."""

    normalized_emails = [_raw_email_to_email(raw_email, index) for index, raw_email in enumerate(raw_emails, start=1)]
    assessments = [assess_email(email) for email in normalized_emails]
    deadlines = extract_deadlines(normalized_emails, assessments, language="en")
    meetings = extract_meetings(normalized_emails, assessments)
    subscriptions = extract_subscriptions(normalized_emails, assessments)

    deadline_ids = {item.source_email_id for item in deadlines}
    meeting_ids = {item.source_email_id for item in meetings}
    subscription_ids = {item.source_email_id for item in subscriptions}

    drafts: list[EvaluationDraftExample] = []
    for email, assessment in zip(normalized_emails, assessments, strict=True):
        drafts.append(
            EvaluationDraftExample(
                id=email.id,
                sender=email.sender,
                subject=email.subject,
                received_at=email.received_at.isoformat(),
                snippet=email.snippet,
                body_preview=email.body_preview,
                labels=email.labels,
                heuristic_label=assessment.label,
                heuristic_important=assessment.importance_score >= 50,
                heuristic_needs_action=assessment.needs_action,
                heuristic_deadline=email.id in deadline_ids,
                heuristic_meeting=email.id in meeting_ids,
                heuristic_subscription=email.id in subscription_ids,
            )
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps([draft.model_dump(mode="json") for draft in drafts], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return output_path


def finalize_real_email_dataset(
    draft_path: Path,
    output_path: Path,
) -> Path:
    """Convert reviewed draft examples into the final labeled eval schema."""

    raw = json.loads(draft_path.read_text(encoding="utf-8"))
    drafts = [ReviewedEvaluationDraft.model_validate(item) for item in raw]
    examples: list[EvaluationExample] = []

    for draft in drafts:
        examples.append(
            EvaluationExample(
                id=draft.id,
                sender=draft.sender,
                subject=draft.subject,
                received_at=draft.received_at,
                snippet=draft.snippet,
                body_preview=draft.body_preview,
                labels=draft.labels,
                expected_label=draft.expected_label or draft.heuristic_label,
                expected_important=(
                    draft.expected_important
                    if draft.expected_important is not None
                    else draft.heuristic_important
                ),
                expected_needs_action=(
                    draft.expected_needs_action
                    if draft.expected_needs_action is not None
                    else draft.heuristic_needs_action
                ),
                expected_deadline=(
                    draft.expected_deadline
                    if draft.expected_deadline is not None
                    else draft.heuristic_deadline
                ),
                expected_meeting=(
                    draft.expected_meeting
                    if draft.expected_meeting is not None
                    else draft.heuristic_meeting
                ),
                expected_subscription=(
                    draft.expected_subscription
                    if draft.expected_subscription is not None
                    else draft.heuristic_subscription
                ),
            )
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps([example.model_dump(mode="json") for example in examples], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return output_path


def _build_report(
    *,
    strategy: str,
    dataset_path: Path,
    examples: list[EvaluationExample],
    emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
) -> EvaluationReport:
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
        strategy=strategy,
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


def _raw_email_to_email(raw_email: RawEmail, index: int) -> NormalizedEmail:
    payload = raw_email.payload
    source_id = raw_email.provider_id or f"gmail-{index:03d}"
    anonymized_id = f"real-{index:03d}"
    sender_alias = f"sender-{index:03d}@example.com"

    return NormalizedEmail(
        id=anonymized_id,
        source=raw_email.source,
        sender=sender_alias,
        subject=_anonymize_text(str(payload.get("subject", ""))),
        received_at=NormalizedEmail.model_validate(
            {
                "id": source_id,
                "source": raw_email.source,
                "sender": sender_alias,
                "subject": "",
                "received_at": payload.get("received_at"),
                "snippet": "",
                "body_preview": "",
                "labels": [],
            }
        ).received_at,
        snippet=_anonymize_text(str(payload.get("snippet", ""))),
        body_preview=_anonymize_text(str(payload.get("body_preview", ""))),
        labels=[str(label).lower() for label in payload.get("labels", [])],
    )


def _anonymize_text(value: str) -> str:
    value = EMAIL_PATTERN.sub("<email>", value)
    value = URL_PATTERN.sub("<link>", value)
    value = PHONE_PATTERN.sub("<phone>", value)
    value = LONG_NUMBER_PATTERN.sub("<number>", value)
    return value.strip()
