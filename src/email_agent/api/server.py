"""Minimal HTTP API for triggering and reading email-agent runs."""

from __future__ import annotations

import json
import logging
import threading
from datetime import date
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import unquote, urlparse

from pydantic import ValidationError

from email_agent.api.run_artifacts import list_runs, read_run, update_extracted_item_review
from email_agent.config import Settings
from email_agent.graph.workflow import run_workflow
from email_agent.models.review import ExtractedItemReviewUpdate

SUPPORTED_PROVIDERS = {"mock", "gmail", "webde"}
INTERNAL_ERROR_MESSAGE = "The server could not complete that request."
_RUN_LOCK = threading.Lock()
logger = logging.getLogger(__name__)


class EmailAgentAPIServer(ThreadingHTTPServer):
    """HTTP server with app settings attached."""

    def __init__(self, server_address: tuple[str, int], settings: Settings) -> None:
        super().__init__(server_address, EmailAgentAPIHandler)
        self.settings = settings


class EmailAgentAPIHandler(BaseHTTPRequestHandler):
    """Serve a tiny JSON API for the dashboard."""

    server: EmailAgentAPIServer

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_status(HTTPStatus.NO_CONTENT)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/api/health":
                self._send_json({"ok": True})
                return

            if parsed.path == "/api/runs":
                self._send_json({"runs": list_runs(self.server.settings.data_dir)})
                return

            if parsed.path == "/api/runs/latest":
                runs = list_runs(self.server.settings.data_dir)
                if not runs:
                    self._send_json({"run": None})
                    return

                self._send_json({"run": read_run(self.server.settings.data_dir, str(runs[0]["date"]))})
                return

            prefix = "/api/runs/"
            if parsed.path.startswith(prefix):
                run_date = parsed.path[len(prefix) :]
                self._validate_run_date(run_date)
                self._send_json({"run": read_run(self.server.settings.data_dir, run_date)})
                return

            self._send_error(HTTPStatus.NOT_FOUND, "Route not found.")
        except FileNotFoundError:
            self._send_error(HTTPStatus.NOT_FOUND, "Run artifacts not found.")
        except ValueError as exc:
            self._send_error(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:  # pragma: no cover - defensive API boundary
            self._handle_internal_error("GET", parsed.path, exc)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/runs":
            self._send_error(HTTPStatus.NOT_FOUND, "Route not found.")
            return

        try:
            payload = self._read_json_body()
            provider = str(payload.get("provider", "mock"))
            if provider not in SUPPORTED_PROVIDERS:
                raise ValueError("Provider must be one of: gmail, mock, webde.")

            requested_date = payload.get("run_date")
            run_date = self._normalize_run_date(requested_date)

            if not _RUN_LOCK.acquire(blocking=False):
                self._send_error(
                    HTTPStatus.CONFLICT,
                    "A run is already in progress. Please wait for it to finish.",
                )
                return

            try:
                state = run_workflow(
                    {"provider": provider, "run_date": run_date},
                    self.server.settings,
                )
            finally:
                _RUN_LOCK.release()

            run_payload = read_run(self.server.settings.data_dir, run_date)
            self._send_json(
                {
                    "run": run_payload,
                    "provider": provider,
                    "persistedRunDir": state.get("persisted_run_dir", ""),
                },
                status=HTTPStatus.CREATED,
            )
        except ValueError as exc:
            self._send_error(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:  # pragma: no cover - defensive API boundary
            self._handle_internal_error("POST", parsed.path, exc)

    def do_PATCH(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        try:
            run_date, item_id = self._parse_review_update_path(parsed.path)
            payload = self._read_json_body()
            update = ExtractedItemReviewUpdate.model_validate(payload)
            updated_item = update_extracted_item_review(
                self.server.settings.data_dir,
                run_date,
                item_id,
                update,
            )
            self._send_json(
                {
                    "item": updated_item,
                    "run": read_run(self.server.settings.data_dir, run_date),
                }
            )
        except FileNotFoundError as exc:
            self._send_error(HTTPStatus.NOT_FOUND, str(exc))
        except (ValueError, ValidationError) as exc:
            self._send_error(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:  # pragma: no cover - defensive API boundary
            self._handle_internal_error("PATCH", parsed.path, exc)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length == 0:
            return {}

        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}

        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Request body must be valid JSON.") from exc

    def _normalize_run_date(self, requested_date: Any) -> str:
        if requested_date in (None, ""):
            return date.today().isoformat()

        return date.fromisoformat(str(requested_date)).isoformat()

    def _validate_run_date(self, run_date: str) -> None:
        date.fromisoformat(run_date)

    def _parse_review_update_path(self, path: str) -> tuple[str, str]:
        prefix = "/api/runs/"
        marker = "/extracted-items/"
        if not path.startswith(prefix) or marker not in path:
            raise ValueError("Route not found.")

        run_date, item_id = path[len(prefix) :].split(marker, maxsplit=1)
        self._validate_run_date(run_date)
        decoded_item_id = unquote(item_id)
        if not decoded_item_id:
            raise ValueError("Extracted item id is required.")
        return run_date, decoded_item_id

    def _send_status(self, status: HTTPStatus) -> None:
        self.send_response(status)
        self._send_common_headers()
        self.end_headers()

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._send_common_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_error(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"error": message}, status=status)

    def _send_common_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _handle_internal_error(self, method: str, path: str, exc: Exception) -> None:
        logger.exception("Unhandled API error during %s %s", method, path, exc_info=exc)
        self._send_error(HTTPStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE)


def serve_api(*, settings: Settings, host: str = "127.0.0.1", port: int = 8000) -> None:
    """Start the local API server."""

    server = EmailAgentAPIServer((host, port), settings)
    server.serve_forever()
