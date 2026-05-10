"""Mock provider for local development."""

from datetime import date

from email_agent.models.email import RawEmail


class MockEmailProvider:
    """Temporary provider stub used before real integrations."""

    def fetch_emails_for_day(self, target_date: date) -> list[RawEmail]:
        """Return an empty list until fixture loading is implemented."""

        return []
