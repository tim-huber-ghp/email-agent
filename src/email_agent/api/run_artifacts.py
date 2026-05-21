"""Read persisted run artifacts for the frontend API."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from email_agent.models.review import ExtractedItemReviewUpdate


def list_runs(data_dir: Path) -> list[dict[str, object]]:
    """Return saved runs sorted newest-first."""

    runs_dir = data_dir / "runs"
    if not runs_dir.exists():
        return []

    run_dates = sorted(
        [
            entry.name
            for entry in runs_dir.iterdir()
            if entry.is_dir()
        ],
        reverse=True,
    )
    runs = [read_run_meta(data_dir, run_date) for run_date in run_dates]
    return sorted(runs, key=lambda run: str(run["date"]), reverse=True)


def read_run_meta(data_dir: Path, run_date: str) -> dict[str, object]:
    """Return lightweight metadata for a single saved run."""

    run_dir = data_dir / "runs" / run_date

    try:
        summary = _read_json(run_dir / "summary.json")
        emails = _read_json(run_dir / "emails.json")
        metadata = _read_optional_json(run_dir / "run_metadata.json")
        provider = emails[0].get("source", "unknown") if emails else "unknown"

        return {
            "date": run_date,
            "provider": metadata.get("provider", provider) if metadata else provider,
            "language": metadata.get("language", summary.get("language", "en"))
            if metadata
            else summary.get("language", "en"),
            "isMock": provider == "mock",
            "executionMode": metadata.get("summary_mode", "unknown") if metadata else "unknown",
        }
    except FileNotFoundError:
        return {
            "date": run_date,
            "provider": "unknown",
            "language": "en",
            "isMock": False,
            "executionMode": "unknown",
        }


def read_run(data_dir: Path, run_date: str) -> dict[str, object]:
    """Return the full payload for a saved run."""

    run_dir = data_dir / "runs" / run_date
    summary = _read_json(run_dir / "summary.json")
    assessments = _read_json(run_dir / "assessments.json")
    emails = _read_json(run_dir / "emails.json")
    metadata = _read_optional_json(run_dir / "run_metadata.json")
    deadlines = _read_optional_json(run_dir / "deadlines.json") or []
    meetings = _read_optional_json(run_dir / "meetings.json") or []
    subscriptions = _read_optional_json(run_dir / "subscriptions.json") or []
    extracted_items = _read_optional_json(run_dir / "extracted_items.json") or (
        _build_legacy_extracted_items(
            summary=summary,
            assessments=assessments,
            emails=emails,
            deadlines=deadlines,
            meetings=meetings,
            subscriptions=subscriptions,
        )
    )

    return {
        "date": run_date,
        "summary": summary,
        "assessments": assessments,
        "emails": emails,
        "extractedItems": extracted_items,
        "deadlines": deadlines,
        "meetings": meetings,
        "subscriptions": subscriptions,
        "runMetadata": metadata
        or build_fallback_run_metadata(
            run_date=run_date,
            summary=summary,
            assessments=assessments,
            emails=emails,
            extracted_items=extracted_items,
        ),
    }


def update_extracted_item_review(
    data_dir: Path,
    run_date: str,
    item_id: str,
    update: ExtractedItemReviewUpdate,
) -> dict[str, object]:
    """Persist a review update for one extracted item within a saved run."""

    run_dir = data_dir / "runs" / run_date
    extracted_items_path = run_dir / "extracted_items.json"
    run_payload = read_run(data_dir, run_date)
    extracted_items = list(run_payload["extractedItems"])

    updated_item: dict[str, object] | None = None
    reviewed_at = _utc_now_iso() if update.review_status != "pending" else ""

    for item in extracted_items:
        if not isinstance(item, dict):
            continue
        if str(item.get("id")) != item_id:
            continue

        item["review_status"] = update.review_status
        item["reviewed_value"] = update.reviewed_value
        item["reviewed_at"] = reviewed_at
        item["reviewer_note"] = update.reviewer_note
        updated_item = item
        break

    if updated_item is None:
        raise FileNotFoundError("Extracted item not found.")

    extracted_items_path.write_text(json.dumps(extracted_items, indent=2), encoding="utf-8")
    return updated_item


def build_fallback_run_metadata(
    *,
    run_date: str,
    summary: dict[str, object],
    assessments: list[dict[str, object]],
    emails: list[dict[str, object]],
    extracted_items: list[dict[str, object]],
) -> dict[str, object]:
    """Backfill metadata for runs created before diagnostics existed."""

    important_email_ids = summary.get("important_email_ids", [])
    important_count = (
        len(important_email_ids)
        if isinstance(important_email_ids, list)
        else sum((item.get("importance_score", 0) >= 50) for item in assessments)
    )
    provider = emails[0].get("source", "unknown") if emails else "unknown"

    return {
        "run_date": run_date,
        "run_started_at": "",
        "run_completed_at": "",
        "provider": provider,
        "language": summary.get("language", "en"),
        "llm_enabled": False,
        "llm_provider": "unknown",
        "llm_classification_enabled": False,
        "llm_summary_enabled": False,
        "classification_mode": "unknown",
        "summary_mode": "unknown",
        "workflow_duration_ms": 0,
        "step_durations_ms": {},
        "llm_input_tokens": 0,
        "llm_output_tokens": 0,
        "llm_total_tokens": 0,
        "estimated_cost_eur": 0.0,
        "llm_usage_by_operation": {},
        "email_count": len(emails),
        "filtered_email_count": len(assessments),
        "important_email_count": important_count,
        "uncertain_assessment_count": 0,
        "abstained_assessment_count": 0,
        "llm_fallback_count": 0,
        "extracted_item_count": len(extracted_items),
    }


def _build_legacy_extracted_items(
    *,
    summary: dict[str, object],
    assessments: list[dict[str, object]],
    emails: list[dict[str, object]],
    deadlines: list[dict[str, object]],
    meetings: list[dict[str, object]],
    subscriptions: list[dict[str, object]],
) -> list[dict[str, object]]:
    emails_by_id = {
        str(email.get("id")): email
        for email in emails
        if isinstance(email, dict) and email.get("id") is not None
    }
    assessments_by_id = {
        str(assessment.get("email_id")): assessment
        for assessment in assessments
        if isinstance(assessment, dict) and assessment.get("email_id") is not None
    }

    items: list[dict[str, object]] = []

    for index, action_item in enumerate(summary.get("action_items", [])):
        if not isinstance(action_item, dict):
            continue
        source_email_id = str(action_item.get("source_email_id", ""))
        email = emails_by_id.get(source_email_id)
        assessment = assessments_by_id.get(source_email_id)
        description = str(action_item.get("description", ""))
        items.append(
            _base_extracted_item(
                item_id=f"action_item:{source_email_id}:{index}",
                source_email_id=source_email_id,
                item_type="action_item",
                title=description,
                description=description,
                email=email,
                assessment=assessment,
                fallback_reason="Derived from a legacy action item.",
                item_data={"priority": action_item.get("priority", "info")},
            )
        )

    for index, deadline in enumerate(deadlines):
        if not isinstance(deadline, dict):
            continue
        source_email_id = str(deadline.get("source_email_id", ""))
        email = emails_by_id.get(source_email_id)
        assessment = assessments_by_id.get(source_email_id)
        description = str(deadline.get("description", ""))
        items.append(
            _base_extracted_item(
                item_id=f"deadline:{source_email_id}:{index}",
                source_email_id=source_email_id,
                item_type="deadline",
                title=description,
                description=description,
                email=email,
                assessment=assessment,
                fallback_reason="Hydrated from legacy deadline artifacts.",
                item_data={"due_hint": deadline.get("due_hint", "")},
            )
        )

    for index, meeting in enumerate(meetings):
        if not isinstance(meeting, dict):
            continue
        source_email_id = str(meeting.get("source_email_id", ""))
        email = emails_by_id.get(source_email_id)
        assessment = assessments_by_id.get(source_email_id)
        title = str(meeting.get("title", ""))
        items.append(
            _base_extracted_item(
                item_id=f"meeting:{source_email_id}:{index}",
                source_email_id=source_email_id,
                item_type="meeting",
                title=title,
                description=title,
                email=email,
                assessment=assessment,
                fallback_reason="Hydrated from legacy meeting artifacts.",
                item_data={
                    "when_hint": meeting.get("when_hint", ""),
                    "location_hint": meeting.get("location_hint", ""),
                    "needs_response": bool(meeting.get("needs_response", False)),
                },
            )
        )

    for index, subscription in enumerate(subscriptions):
        if not isinstance(subscription, dict):
            continue
        source_email_id = str(subscription.get("source_email_id", ""))
        email = emails_by_id.get(source_email_id)
        assessment = assessments_by_id.get(source_email_id)
        service_name = str(subscription.get("service_name", ""))
        items.append(
            _base_extracted_item(
                item_id=f"financial_obligation:{source_email_id}:{index}",
                source_email_id=source_email_id,
                item_type="financial_obligation",
                title=service_name,
                description=service_name,
                email=email,
                assessment=assessment,
                fallback_reason="Hydrated from legacy subscription artifacts.",
                item_data={
                    "renewal_hint": subscription.get("renewal_hint", ""),
                    "cancellation_hint": subscription.get("cancellation_hint", ""),
                    "amount_hint": subscription.get("amount_hint", ""),
                },
            )
        )

    return items


def _base_extracted_item(
    *,
    item_id: str,
    source_email_id: str,
    item_type: str,
    title: str,
    description: str,
    email: dict[str, Any] | None,
    assessment: dict[str, Any] | None,
    fallback_reason: str,
    item_data: dict[str, Any],
) -> dict[str, object]:
    return {
        "id": item_id,
        "source_email_id": source_email_id,
        "item_type": item_type,
        "title": title,
        "description": description,
        "normalized_datetime": None,
        "confidence_score": int(assessment.get("confidence_score", 70)) if assessment else 70,
        "confidence_reason": str(assessment.get("reason", fallback_reason))
        if assessment
        else fallback_reason,
        "evidence_text": _build_evidence_text(email),
        "evidence_fields": _build_evidence_fields(email),
        "review_status": "pending",
        "reviewed_value": None,
        "reviewed_at": "",
        "reviewer_note": "",
        "item_data": item_data,
    }


def _build_evidence_text(email: dict[str, Any] | None) -> str:
    if not email:
        return ""
    for key in ("snippet", "body_preview", "subject"):
        value = email.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def _build_evidence_fields(email: dict[str, Any] | None) -> dict[str, str]:
    if not email:
        return {}

    evidence_fields: dict[str, str] = {}
    for key in ("subject", "snippet", "body_preview"):
        value = email.get(key)
        if isinstance(value, str) and value:
            evidence_fields[key] = value
    return evidence_fields


def _read_json(path: Path) -> object:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _read_optional_json(path: Path) -> object | None:
    try:
        return _read_json(path)
    except FileNotFoundError:
        return None


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
