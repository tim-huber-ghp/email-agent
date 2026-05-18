"""JSON persistence helpers for local development."""

from __future__ import annotations

import json
from pathlib import Path

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.run_metadata import RunMetadata
from email_agent.models.summary import (
    DailySummary,
    ExtractedDeadline,
    ExtractedMeeting,
    ExtractedSubscription,
)


def persist_run(
    data_dir: Path,
    run_date: str,
    emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    deadlines: list[ExtractedDeadline],
    meetings: list[ExtractedMeeting],
    subscriptions: list[ExtractedSubscription],
    summary: DailySummary,
    run_metadata: RunMetadata,
) -> Path:
    """Save workflow artifacts to a date-based run directory."""

    run_dir = data_dir / "runs" / run_date
    run_dir.mkdir(parents=True, exist_ok=True)

    _write_json(run_dir / "emails.json", [email.model_dump(mode="json") for email in emails])
    _write_json(
        run_dir / "assessments.json",
        [assessment.model_dump(mode="json") for assessment in assessments],
    )
    _write_json(
        run_dir / "deadlines.json", [deadline.model_dump(mode="json") for deadline in deadlines]
    )
    _write_json(
        run_dir / "meetings.json", [meeting.model_dump(mode="json") for meeting in meetings]
    )
    _write_json(
        run_dir / "subscriptions.json",
        [subscription.model_dump(mode="json") for subscription in subscriptions],
    )
    _write_json(run_dir / "summary.json", summary.model_dump(mode="json"))
    _write_json(run_dir / "run_metadata.json", run_metadata.model_dump(mode="json"))
    _write_text(
        run_dir / "summary.txt",
        _render_summary_text(summary, assessments, deadlines, meetings, subscriptions),
    )
    return run_dir


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def _render_summary_text(
    summary: DailySummary,
    assessments: list[EmailAssessment],
    deadlines: list[ExtractedDeadline],
    meetings: list[ExtractedMeeting],
    subscriptions: list[ExtractedSubscription],
) -> str:
    is_german = summary.language == "de"
    lines = [summary.headline, "", summary.overview, ""]

    if summary.action_items:
        lines.append("Naechste Schritte:" if is_german else "Action items:")
        for item in summary.action_items:
            lines.append(f"- {item.description}")
        lines.append("")

    if deadlines:
        lines.append("Fristen:" if is_german else "Deadlines:")
        for item in deadlines:
            detail = f" ({item.due_hint})" if item.due_hint else ""
            lines.append(f"- {item.description}{detail}")
        lines.append("")

    if meetings:
        lines.append("Besprechungen:" if is_german else "Meetings:")
        for item in meetings:
            detail_parts = [part for part in (item.when_hint, item.location_hint) if part]
            detail = f" ({', '.join(detail_parts)})" if detail_parts else ""
            lines.append(f"- {item.title}{detail}")
        lines.append("")

    if subscriptions:
        lines.append("Abos:" if is_german else "Subscriptions:")
        for item in subscriptions:
            detail_parts = [
                part
                for part in (item.renewal_hint, item.amount_hint, item.cancellation_hint)
                if part
            ]
            detail = f" ({', '.join(detail_parts)})" if detail_parts else ""
            lines.append(f"- {item.service_name}{detail}")
        lines.append("")

    if assessments:
        lines.append("Bewertungen:" if is_german else "Assessments:")
        for assessment in assessments:
            lines.append(
                f"- {assessment.email_id}: {assessment.label} "
                f"({assessment.importance_score}) - {assessment.reason}"
            )

    return "\n".join(lines).strip() + "\n"
