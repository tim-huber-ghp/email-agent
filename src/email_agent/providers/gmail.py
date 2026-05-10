"""Gmail provider using the Gmail API and desktop OAuth."""

from __future__ import annotations

import base64
from datetime import UTC, date, datetime, timedelta
from email.utils import parseaddr
import html
from pathlib import Path
import re

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import Resource, build
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import InstalledAppFlow

from email_agent.config import Settings
from email_agent.models.email import RawEmail

GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
SCOPES = [GMAIL_READONLY_SCOPE]


class GmailProvider:
    """Read-only Gmail provider for daily email summaries."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def authenticate(self) -> Path:
        """Run the desktop OAuth flow and store a reusable token."""

        creds = _load_or_create_credentials(self.settings, interactive=True)
        token_path = self.settings.gmail_token_file
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json(), encoding="utf-8")
        return token_path

    def fetch_emails_for_day(self, target_date: date) -> list[RawEmail]:
        """Fetch emails for the requested day and normalize the raw payload."""

        service = _build_gmail_service(self.settings)
        query = _gmail_date_query(target_date)
        raw_emails: list[RawEmail] = []

        try:
            response = (
                service.users()
                .messages()
                .list(userId="me", q=query, includeSpamTrash=False, maxResults=100)
                .execute()
            )
        except HttpError as exc:  # pragma: no cover - live API call
            raise RuntimeError(f"Failed to list Gmail messages: {exc}") from exc

        for message_ref in response.get("messages", []):
            message = (
                service.users()
                .messages()
                .get(userId="me", id=message_ref["id"], format="full")
                .execute()
            )
            raw_emails.append(
                RawEmail(
                    provider_id=message["id"],
                    source="gmail",
                    payload=_gmail_payload_to_record(message),
                )
            )

        return raw_emails


def _build_gmail_service(settings: Settings) -> Resource:
    creds = _load_or_create_credentials(settings, interactive=True)
    return build("gmail", "v1", credentials=creds)


def _load_or_create_credentials(settings: Settings, interactive: bool) -> Credentials:
    creds: Credentials | None = None
    token_path = settings.gmail_token_file

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.parent.mkdir(parents=True, exist_ok=True)
        token_path.write_text(creds.to_json(), encoding="utf-8")
        return creds

    if not interactive:
        raise RuntimeError("No valid Gmail token found.")

    credentials_file = settings.gmail_credentials_file
    if not credentials_file.exists():
        raise FileNotFoundError(
            "Gmail credentials file not found. Download the desktop OAuth JSON "
            f"and save it to {credentials_file}."
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(credentials_file), SCOPES)
    creds = flow.run_local_server(port=0)
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json(), encoding="utf-8")
    return creds


def _gmail_date_query(target_date: date) -> str:
    next_day = target_date + timedelta(days=1)
    return f"after:{target_date.strftime('%Y/%m/%d')} before:{next_day.strftime('%Y/%m/%d')}"


def _gmail_payload_to_record(message: dict) -> dict:
    headers = _headers_to_map(message.get("payload", {}).get("headers", []))
    body_preview = _extract_body_text(message.get("payload", {}))
    received_at = datetime.fromtimestamp(int(message["internalDate"]) / 1000, tz=UTC)

    return {
        "sender": _format_sender(headers.get("from", "Unknown sender")),
        "subject": headers.get("subject", "(No subject)"),
        "received_at": received_at.isoformat(),
        "snippet": _normalize_whitespace(message.get("snippet", "")),
        "labels": message.get("labelIds", []),
        "body_preview": body_preview,
    }


def _headers_to_map(headers: list[dict]) -> dict[str, str]:
    return {
        header["name"].lower(): header["value"]
        for header in headers
        if "name" in header and "value" in header
    }


def _extract_body_text(payload: dict) -> str:
    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data")

    if mime_type == "text/plain" and body_data:
        return _normalize_whitespace(_decode_base64_text(body_data))

    if mime_type == "text/html" and body_data:
        return _html_to_text(_decode_base64_text(body_data))

    plain_parts: list[str] = []
    html_parts: list[str] = []

    for part in payload.get("parts", []):
        text = _extract_body_text(part)
        if not text:
            continue

        if part.get("mimeType") == "text/html":
            html_parts.append(text)
        else:
            plain_parts.append(text)

    if plain_parts:
        return _normalize_whitespace("\n".join(plain_parts))

    if html_parts:
        return _normalize_whitespace("\n".join(html_parts))

    if body_data:
        return _normalize_whitespace(_decode_base64_text(body_data))

    return ""


def _decode_base64_text(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    decoded = base64.urlsafe_b64decode(value + padding)
    return decoded.decode("utf-8", errors="ignore").strip()


def _format_sender(raw_sender: str) -> str:
    """Prefer a readable name, otherwise fall back to the email address."""

    name, address = parseaddr(raw_sender)
    if name:
        return _normalize_whitespace(name.strip('" '))
    if address:
        return address
    return raw_sender


def _html_to_text(value: str) -> str:
    """Convert simple HTML email content into readable plain text."""

    no_scripts = re.sub(r"<(script|style).*?>.*?</\\1>", " ", value, flags=re.IGNORECASE | re.DOTALL)
    with_breaks = re.sub(r"<br\\s*/?>", "\n", no_scripts, flags=re.IGNORECASE)
    with_blocks = re.sub(r"</(p|div|li|tr|h[1-6])>", "\n", with_breaks, flags=re.IGNORECASE)
    no_tags = re.sub(r"<[^>]+>", " ", with_blocks)
    unescaped = html.unescape(no_tags)
    return _normalize_whitespace(unescaped)


def _normalize_whitespace(value: str) -> str:
    value = value.replace("\r", "\n")
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]+", " ", value)
    return value.strip()
