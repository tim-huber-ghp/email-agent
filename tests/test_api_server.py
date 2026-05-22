from __future__ import annotations

import json
import threading
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pytest
from pydantic import ValidationError

import email_agent.api.server as api_server
from email_agent.config import Settings
from email_agent.api.server import (
    INTERNAL_ERROR_MESSAGE,
    EmailAgentAPIHandler,
    EmailAgentAPIServer,
)
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


def test_health_endpoint_returns_ok(tmp_path: Path) -> None:
    with ApiClient(tmp_path) as client:
        status, payload = client.request("GET", "/api/health")

    assert status == 200
    assert payload == {"ok": True}


def test_runs_endpoint_returns_saved_run_metadata(tmp_path: Path) -> None:
    _create_saved_run(tmp_path, "2026-05-10")

    with ApiClient(tmp_path) as client:
        status, payload = client.request("GET", "/api/runs")

    assert status == 200
    assert payload["runs"][0]["date"] == "2026-05-10"
    assert payload["runs"][0]["provider"] == "mock"


def test_post_runs_rejects_invalid_provider(tmp_path: Path) -> None:
    with ApiClient(tmp_path) as client:
        status, payload = client.request(
            "POST",
            "/api/runs",
            {"provider": "imap"},
            expected_status=400,
        )

    assert status == 400
    assert payload["error"] == "Provider must be one of: gmail, mock, webde."


def test_post_runs_hides_internal_errors(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(api_server, "run_workflow", _raise_runtime_error)

    with ApiClient(tmp_path) as client:
        status, payload = client.request(
            "POST",
            "/api/runs",
            {"provider": "mock", "run_date": "2026-05-10"},
            expected_status=500,
        )

    assert status == 500
    assert payload["error"] == INTERNAL_ERROR_MESSAGE


def test_patch_review_updates_saved_item(tmp_path: Path) -> None:
    _create_saved_run(tmp_path, "2026-05-10", include_extracted_items=True)

    with ApiClient(tmp_path) as client:
        status, payload = client.request(
            "PATCH",
            "/api/runs/2026-05-10/extracted-items/deadline%3Amsg-1%3A0",
            {
                "review_status": "confirmed",
                "reviewer_note": "Looks correct.",
            },
        )

    assert status == 200
    assert payload["item"]["review_status"] == "confirmed"
    assert payload["item"]["reviewer_note"] == "Looks correct."


class ApiClient:
    def __init__(self, data_dir: Path) -> None:
        self.settings = Settings(
            EMAIL_AGENT_ENV="test",
            EMAIL_AGENT_DATA_DIR=str(data_dir),
            EMAIL_AGENT_USE_LLM=False,
        )
        self.server: EmailAgentAPIServer | None = None
        self.thread: threading.Thread | None = None
        self.base_url = ""

    def __enter__(self) -> ApiClient:
        self.server = EmailAgentAPIServer(("127.0.0.1", 0), self.settings)
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        assert self.server is not None
        assert self.thread is not None
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(
        self,
        method: str,
        path: str,
        payload: dict[str, object] | None = None,
        *,
        expected_status: int = 200,
    ) -> tuple[int, dict[str, object]]:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"} if body is not None else {}
        request = Request(f"{self.base_url}{path}", data=body, method=method, headers=headers)

        try:
            with urlopen(request, timeout=5) as response:
                raw_body = response.read().decode("utf-8")
                parsed = json.loads(raw_body) if raw_body else {}
                return response.status, parsed
        except HTTPError as exc:
            raw_body = exc.read().decode("utf-8")
            parsed = json.loads(raw_body) if raw_body else {}
            if exc.code != expected_status:
                raise
            return exc.code, parsed


def _raise_runtime_error(*args, **kwargs):
    raise RuntimeError("sensitive backend detail")


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def _create_saved_run(data_dir: Path, run_date: str, *, include_extracted_items: bool = False) -> None:
    run_dir = data_dir / "runs" / run_date
    run_dir.mkdir(parents=True)

    _write_json(
        run_dir / "summary.json",
        {
            "headline": "Your day in emails.",
            "overview": "You received important emails today.",
            "important_email_ids": ["msg-1"],
            "action_items": [],
            "counts_by_label": {"urgent": 1},
            "language": "en",
        },
    )
    _write_json(
        run_dir / "assessments.json",
        [
            {
                "email_id": "msg-1",
                "label": "urgent",
                "importance_score": 90,
                "reason": "Time-sensitive email.",
                "needs_action": True,
                "confidence_score": 95,
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
                "sender": "alerts@example.com",
                "subject": "Action needed today",
                "received_at": "2026-05-10T09:00:00",
                "snippet": "Please respond today.",
                "labels": ["inbox"],
                "body_preview": "Please review the request today.",
                "body_html": "",
            }
        ],
    )
    _write_json(run_dir / "deadlines.json", [])
    _write_json(run_dir / "meetings.json", [])
    _write_json(run_dir / "subscriptions.json", [])
    _write_json(
        run_dir / "run_metadata.json",
        {
            "run_date": run_date,
            "run_started_at": "2026-05-10T09:00:00+00:00",
            "run_completed_at": "2026-05-10T09:00:01+00:00",
            "provider": "mock",
            "language": "en",
            "llm_enabled": False,
            "llm_provider": "unknown",
            "llm_classification_enabled": False,
            "llm_summary_enabled": False,
            "classification_mode": "heuristic",
            "summary_mode": "heuristic",
            "workflow_duration_ms": 1000,
            "step_durations_ms": {"load_emails": 5},
            "llm_input_tokens": 0,
            "llm_output_tokens": 0,
            "llm_total_tokens": 0,
            "estimated_cost_eur": 0.0,
            "llm_usage_by_operation": {},
            "email_count": 1,
            "filtered_email_count": 1,
            "important_email_count": 1,
            "uncertain_assessment_count": 0,
            "abstained_assessment_count": 0,
            "llm_fallback_count": 0,
            "extracted_item_count": 1 if include_extracted_items else 0,
        },
    )

    if include_extracted_items:
        _write_json(
            run_dir / "extracted_items.json",
            [
                {
                    "id": "deadline:msg-1:0",
                    "source_email_id": "msg-1",
                    "item_type": "deadline",
                    "title": "Review the request",
                    "description": "Review the request",
                    "item_data": {"due_hint": "Today"},
                    "fallback_reason": "Created for API tests.",
                    "review_status": "pending",
                    "reviewed_value": None,
                    "reviewed_at": "",
                    "reviewer_note": "",
                }
            ],
        )
