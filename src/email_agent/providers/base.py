"""Provider interface definitions."""

from datetime import date
from typing import Protocol

from email_agent.models.email import RawEmail


class EmailProvider(Protocol):
    """Common interface for email providers."""

    def fetch_emails_for_day(self, target_date: date) -> list[RawEmail]:
        """Fetch emails for a single day."""
