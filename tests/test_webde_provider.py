from email.message import EmailMessage

import pytest

from email_agent.config import Settings
from email_agent.providers.webde import (
    _configured_folder_names,
    _connect_imap,
    _decode_mime_header,
    _extract_message_body_text,
    _message_to_record,
)


def test_decode_mime_header_decodes_encoded_subject() -> None:
    assert _decode_mime_header("=?UTF-8?B?VGVzdCDDvGJlcnNpY2h0?=") == "Test übersicht"


def test_extract_message_body_text_prefers_plain_text_over_html() -> None:
    message = EmailMessage()
    message.set_content("Please confirm the meeting time.")
    message.add_alternative("<p>Please confirm the <b>meeting</b> time.</p>", subtype="html")

    assert _extract_message_body_text(message) == "Please confirm the meeting time."


def test_message_to_record_normalizes_sender_subject_and_body() -> None:
    message = EmailMessage()
    message["From"] = '"Alice Example" <alice@example.com>'
    message["Subject"] = "Budget Update"
    message["Date"] = "Tue, 19 May 2026 09:00:00 +0200"
    message.set_content("Please review the budget update today.\n\nThanks.")

    record = _message_to_record(message)

    assert record["sender"] == "Alice Example"
    assert record["subject"] == "Budget Update"
    assert record["body_preview"] == "Please review the budget update today.\n\nThanks."
    assert record["snippet"] == "Please review the budget update today.\n\nThanks."[:220]
    assert record["received_at"].endswith("+00:00")


def test_message_to_record_uses_utc_timestamps() -> None:
    message = EmailMessage()
    message["From"] = "sender@example.com"
    message["Subject"] = "Reminder"
    message["Date"] = "Tue, 19 May 2026 23:30:00 +0200"
    message.set_content("Body")

    record = _message_to_record(message)

    assert record["received_at"] == "2026-05-19T21:30:00+00:00"


def test_connect_imap_requires_credentials() -> None:
    settings = Settings(
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_DATA_DIR="./data",
        WEBDE_EMAIL="",
        WEBDE_PASSWORD="",
    )

    with pytest.raises(RuntimeError, match="WEB.DE credentials are missing"):
        _connect_imap(settings)


def test_configured_folder_names_supports_comma_separated_values() -> None:
    settings = Settings(
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_DATA_DIR="./data",
        WEBDE_IMAP_FOLDERS="INBOX, Unbekannt , Freunde & Bekannte",
    )

    assert _configured_folder_names(settings) == ["INBOX", "Unbekannt", "Freunde & Bekannte"]
