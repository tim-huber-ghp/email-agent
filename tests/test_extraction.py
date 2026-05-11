from datetime import datetime

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.services.extraction import extract_deadlines, extract_meetings


def _email(
    *,
    email_id: str,
    subject: str,
    snippet: str,
    body_preview: str,
    labels: list[str] | None = None,
) -> NormalizedEmail:
    return NormalizedEmail(
        id=email_id,
        source="mock",
        sender="sender@example.com",
        subject=subject,
        received_at=datetime.fromisoformat("2026-05-10T09:00:00"),
        snippet=snippet,
        body_preview=body_preview,
        labels=labels or [],
    )


def test_extract_deadlines_picks_up_day_and_time_hints() -> None:
    email = _email(
        email_id="msg-1",
        subject="Urgent: final budget today",
        snippet="Please reply before 4pm today.",
        body_preview="Need your confirmation before 4pm today.",
    )
    assessments = [
        EmailAssessment(
            email_id="msg-1",
            label="urgent",
            importance_score=90,
            reason="Contains urgent language or a time-sensitive deadline.",
            needs_action=True,
        )
    ]

    deadlines = extract_deadlines([email], assessments, "en")

    assert len(deadlines) == 1
    assert deadlines[0].source_email_id == "msg-1"
    assert deadlines[0].due_hint == "Today, Before 4pm"


def test_extract_meetings_picks_up_meeting_signal_and_zoom_location() -> None:
    email = _email(
        email_id="msg-2",
        subject="Team meeting invite for Monday",
        snippet="Zoom link and agenda attached.",
        body_preview="Please confirm attendance for the Monday sync.",
        labels=["calendar"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-2",
            label="meeting",
            importance_score=70,
            reason="Looks like a meeting or calendar-related email.",
            needs_action=True,
        )
    ]

    meetings = extract_meetings([email], assessments)

    assert len(meetings) == 1
    assert meetings[0].title == "Team meeting invite for Monday"
    assert meetings[0].when_hint == "Monday"
    assert meetings[0].location_hint == "Zoom"
    assert meetings[0].needs_response is True
