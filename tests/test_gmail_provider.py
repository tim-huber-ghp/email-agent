from email_agent.providers.gmail import (
    _extract_body_text,
    _format_sender,
    _gmail_payload_to_record,
)


def _b64(value: str) -> str:
    import base64

    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("utf-8").rstrip("=")


def test_format_sender_prefers_display_name() -> None:
    assert _format_sender('"Alice Example" <alice@example.com>') == "Alice Example"


def test_format_sender_falls_back_to_email_address() -> None:
    assert _format_sender("bob@example.com") == "bob@example.com"


def test_extract_body_text_prefers_plain_text_part() -> None:
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {"mimeType": "text/html", "body": {"data": _b64("<p>Hello <b>world</b></p>")}},
            {"mimeType": "text/plain", "body": {"data": _b64("Hello world")}},
        ],
    }

    assert _extract_body_text(payload) == "Hello world"


def test_extract_body_text_falls_back_to_html_when_plain_text_missing() -> None:
    payload = {
        "mimeType": "multipart/alternative",
        "parts": [
            {
                "mimeType": "text/html",
                "body": {"data": _b64("<div>Meeting at <b>3 PM</b><br>Bring notes</div>")},
            },
        ],
    }

    assert _extract_body_text(payload) == "Meeting at 3 PM Bring notes"


def test_gmail_payload_to_record_normalizes_sender_and_text() -> None:
    message = {
        "id": "gmail-123",
        "internalDate": "1746871200000",
        "snippet": "Budget update   needed today",
        "labelIds": ["INBOX", "IMPORTANT"],
        "payload": {
            "headers": [
                {"name": "From", "value": '"Alice Example" <alice@example.com>'},
                {"name": "Subject", "value": "Budget Update"},
            ],
            "mimeType": "text/plain",
            "body": {"data": _b64("Please review the budget today.\n\nThanks.")},
        },
    }

    record = _gmail_payload_to_record(message)

    assert record["sender"] == "Alice Example"
    assert record["subject"] == "Budget Update"
    assert record["snippet"] == "Budget update needed today"
    assert record["body_preview"] == "Please review the budget today.\n\nThanks."
    assert record["body_html"] == ""


def test_gmail_payload_to_record_preserves_html_body_when_available() -> None:
    message = {
        "id": "gmail-456",
        "internalDate": "1746871200000",
        "snippet": "Meeting invite",
        "labelIds": ["INBOX"],
        "payload": {
            "headers": [
                {"name": "From", "value": '"Alice Example" <alice@example.com>'},
                {"name": "Subject", "value": "Meeting invite"},
            ],
            "mimeType": "text/html",
            "body": {"data": _b64("<div><p>Hello <b>team</b></p><p>See agenda below.</p></div>")},
        },
    }

    record = _gmail_payload_to_record(message)

    assert "Hello team" in record["body_preview"]
    assert "See agenda below." in record["body_preview"]
    assert "<b>team</b>" in record["body_html"]
