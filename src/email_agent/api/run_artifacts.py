"""Read persisted run artifacts for the frontend API."""

from __future__ import annotations

import json
from pathlib import Path


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
    extracted_items = _read_optional_json(run_dir / "extracted_items.json") or []
    deadlines = _read_optional_json(run_dir / "deadlines.json") or []
    meetings = _read_optional_json(run_dir / "meetings.json") or []
    subscriptions = _read_optional_json(run_dir / "subscriptions.json") or []

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
        ),
    }


def build_fallback_run_metadata(
    *,
    run_date: str,
    summary: dict[str, object],
    assessments: list[dict[str, object]],
    emails: list[dict[str, object]],
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
    }


def _read_json(path: Path) -> object:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _read_optional_json(path: Path) -> object | None:
    try:
        return _read_json(path)
    except FileNotFoundError:
        return None
