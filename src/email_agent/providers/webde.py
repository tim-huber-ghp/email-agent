"""WEB.DE provider using IMAP."""

from __future__ import annotations

import email
import email.utils
import html
import imaplib
import re
from datetime import UTC, date, datetime, timedelta
from email.header import decode_header, make_header
from email.message import Message

from email_agent.config import Settings
from email_agent.models.email import RawEmail


class WebDeProvider:
    """Read-only WEB.DE provider backed by IMAP."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def fetch_emails_for_day(self, target_date: date) -> list[RawEmail]:
        """Fetch emails for the requested day and normalize raw payloads."""

        mailbox = _connect_imap(self.settings)
        raw_emails: list[RawEmail] = []
        seen_provider_ids: set[str] = set()

        try:
            for folder_name in _configured_folder_names(self.settings):
                _select_folder(mailbox, folder_name)
                message_ids = _search_message_ids(mailbox, target_date)

                for message_id in message_ids:
                    provider_id = f"{folder_name}:{message_id}"
                    if provider_id in seen_provider_ids:
                        continue

                    email_message = _fetch_message(mailbox, message_id)
                    record = _message_to_record(email_message)
                    received_at = datetime.fromisoformat(record["received_at"]).astimezone(UTC).date()
                    if received_at != target_date:
                        continue

                    seen_provider_ids.add(provider_id)
                    raw_emails.append(
                        RawEmail(
                            provider_id=provider_id,
                            source="webde",
                            payload=record,
                        )
                    )
        finally:
            try:
                mailbox.logout()
            except imaplib.IMAP4.error:
                pass

        return raw_emails

    def list_folders(self) -> list[str]:
        """List available IMAP folders for the configured WEB.DE account."""

        mailbox = _connect_imap(self.settings)
        try:
            return _list_folder_names(mailbox)
        finally:
            try:
                mailbox.logout()
            except imaplib.IMAP4.error:
                pass


def _connect_imap(settings: Settings) -> imaplib.IMAP4_SSL:
    if not settings.webde_email or not settings.webde_password:
        raise RuntimeError(
            "WEB.DE credentials are missing. Set WEBDE_EMAIL and WEBDE_PASSWORD in your .env."
        )

    try:
        mailbox = imaplib.IMAP4_SSL(settings.webde_imap_host, settings.webde_imap_port)
        mailbox.login(settings.webde_email, settings.webde_password)
        return mailbox
    except imaplib.IMAP4.error as exc:
        raise RuntimeError(
            "Failed to log in to WEB.DE via IMAP. Check WEBDE_EMAIL and WEBDE_PASSWORD. "
            "If you use 2FA, use an app-specific password. "
            f"Server said: {exc}"
        ) from exc


def _configured_folder_names(settings: Settings) -> list[str]:
    configured = [item.strip() for item in settings.webde_imap_folders.split(",")]
    folder_names = [item for item in configured if item]
    return folder_names or ["INBOX"]


def _list_folder_names(mailbox: imaplib.IMAP4_SSL) -> list[str]:
    status, payload = mailbox.list()
    if status != "OK":
        raise RuntimeError("Failed to list WEB.DE IMAP folders.")

    folder_names: list[str] = []
    for item in payload or []:
        if not item:
            continue
        decoded = item.decode("utf-8", errors="ignore")
        match = re.search(r' "([^"]+)"$', decoded)
        if match:
            folder_names.append(match.group(1))
            continue
        folder_names.append(decoded)

    return folder_names


def _select_folder(mailbox: imaplib.IMAP4_SSL, folder_name: str) -> None:
    status, _ = mailbox.select(f'"{folder_name}"', readonly=True)
    if status != "OK":
        raise RuntimeError(f"Failed to open the WEB.DE IMAP folder: {folder_name}.")


def _search_message_ids(mailbox: imaplib.IMAP4_SSL, target_date: date) -> list[str]:
    next_day = target_date + timedelta(days=1)
    criteria = f'(SINCE "{target_date.strftime("%d-%b-%Y")}" BEFORE "{next_day.strftime("%d-%b-%Y")}")'
    status, payload = mailbox.search(None, criteria)
    if status != "OK":
        raise RuntimeError("Failed to search WEB.DE messages via IMAP.")

    ids_raw = payload[0].decode("utf-8").strip() if payload and payload[0] else ""
    return [message_id for message_id in ids_raw.split() if message_id]


def _fetch_message(mailbox: imaplib.IMAP4_SSL, message_id: str) -> Message:
    status, payload = mailbox.fetch(message_id, "(RFC822)")
    if status != "OK" or not payload or payload[0] is None:
        raise RuntimeError(f"Failed to fetch WEB.DE message {message_id}.")

    if isinstance(payload[0], tuple):
        raw_bytes = payload[0][1]
    else:
        raw_bytes = b""

    return email.message_from_bytes(raw_bytes)


def _message_to_record(message: Message) -> dict[str, object]:
    sender = _format_sender(_decode_mime_header(message.get("From", "Unknown sender")))
    subject = _decode_mime_header(message.get("Subject", "(No subject)")) or "(No subject)"
    received_at = _parse_message_date(message.get("Date"))
    body_preview, body_html = _extract_message_body_content(message)
    snippet_source = body_preview or subject

    return {
        "sender": sender,
        "subject": subject,
        "received_at": received_at.isoformat(),
        "snippet": _normalize_whitespace(snippet_source)[:220],
        "labels": [],
        "body_preview": body_preview,
        "body_html": body_html,
    }


def _parse_message_date(value: str | None) -> datetime:
    parsed = email.utils.parsedate_to_datetime(value) if value else None
    if parsed is None:
        return datetime.now(UTC)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _extract_message_body_text(message: Message) -> str:
    return _extract_message_body_content(message)[0]


def _extract_message_body_content(message: Message) -> tuple[str, str]:
    if message.is_multipart():
        plain_parts: list[str] = []
        html_text_parts: list[str] = []
        html_raw_parts: list[str] = []

        for part in message.walk():
            if part.is_multipart():
                continue
            disposition = part.get_content_disposition()
            if disposition == "attachment":
                continue

            content_type = part.get_content_type()
            decoded = _decode_message_part(part)
            if not decoded:
                continue

            if content_type == "text/plain":
                plain_parts.append(decoded)
            elif content_type == "text/html":
                html_text_parts.append(_html_to_text(decoded))
                html_raw_parts.append(decoded)

        if plain_parts:
            return _normalize_whitespace("\n".join(plain_parts)), "\n".join(html_raw_parts)
        if html_text_parts:
            return _normalize_whitespace("\n".join(html_text_parts)), "\n".join(html_raw_parts)
        return "", ""

    content_type = message.get_content_type()
    decoded = _decode_message_part(message)
    if content_type == "text/html":
        return _html_to_text(decoded), decoded
    return _normalize_whitespace(decoded), ""


def _decode_message_part(part: Message) -> str:
    payload = part.get_payload(decode=True)
    if payload is None:
        raw_payload = part.get_payload()
        return raw_payload if isinstance(raw_payload, str) else ""

    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="ignore").strip()
    except LookupError:
        return payload.decode("utf-8", errors="ignore").strip()


def _decode_mime_header(value: str) -> str:
    return str(make_header(decode_header(value))).strip()


def _format_sender(raw_sender: str) -> str:
    """Prefer a readable name, otherwise fall back to the email address."""

    name, address = email.utils.parseaddr(raw_sender)
    if name:
        return _normalize_whitespace(name.strip('" '))
    if address:
        return address
    return raw_sender


def _html_to_text(value: str) -> str:
    """Convert simple HTML email content into readable plain text."""

    no_scripts = re.sub(
        r"<(script|style).*?>.*?</\\1>", " ", value, flags=re.IGNORECASE | re.DOTALL
    )
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
