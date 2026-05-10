"""Mock provider for local development."""

import json
from datetime import date
from pathlib import Path

from email_agent.models.email import RawEmail


class MockEmailProvider:
    """Fixture-backed provider used before real integrations."""

    def __init__(self, fixture_path: Path) -> None:
        self.fixture_path = fixture_path

    def fetch_emails_for_day(self, target_date: date) -> list[RawEmail]:
        """Load raw emails from a local fixture file."""

        payload = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        raw_emails: list[RawEmail] = []

        for record in payload:
            received_at = record.get("received_at", "")
            if not received_at.startswith(target_date.isoformat()):
                continue

            raw_emails.append(
                RawEmail(
                    provider_id=record["id"],
                    source="mock",
                    payload=record,
                )
            )

        return raw_emails
