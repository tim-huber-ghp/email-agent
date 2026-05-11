"""Heuristic structured extraction for deadlines and meetings."""

from __future__ import annotations

import re

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.summary import ExtractedDeadline, ExtractedMeeting

DAY_HINT_PATTERN = re.compile(
    r"\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)
TIME_HINT_PATTERN = re.compile(
    r"\b(?:by|before|at)\s+\d{1,2}(?::\d{2})?\s?(?:am|pm)\b",
    re.IGNORECASE,
)


def extract_deadlines(
    emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    language: str,
) -> list[ExtractedDeadline]:
    """Extract simple deadline signals from important emails."""

    emails_by_id = {email.id: email for email in emails}
    deadlines: list[ExtractedDeadline] = []

    for assessment in assessments:
        if assessment.label not in {"urgent", "needs_reply", "finance"}:
            continue

        email = emails_by_id.get(assessment.email_id)
        if email is None:
            continue

        due_hint = _extract_due_hint(email)
        if not due_hint and assessment.label != "urgent":
            continue

        if language == "de":
            description = f"Frist oder zeitkritische Nachricht in '{email.subject}' pruefen."
        else:
            description = f"Review the time-sensitive item in '{email.subject}'."

        deadlines.append(
            ExtractedDeadline(
                description=description,
                source_email_id=email.id,
                due_hint=due_hint,
            )
        )

    return deadlines


def extract_meetings(
    emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
) -> list[ExtractedMeeting]:
    """Extract simple meeting signals from important emails."""

    emails_by_id = {email.id: email for email in emails}
    meetings: list[ExtractedMeeting] = []

    for assessment in assessments:
        email = emails_by_id.get(assessment.email_id)
        if email is None:
            continue

        haystack = _email_text(email)
        if assessment.label != "meeting" and not any(
            keyword in haystack for keyword in ("meeting", "invite", "calendar", "zoom", "teams")
        ):
            continue

        meetings.append(
            ExtractedMeeting(
                title=email.subject,
                source_email_id=email.id,
                when_hint=_extract_meeting_when_hint(email),
                location_hint=_extract_location_hint(haystack),
                needs_response="confirm" in haystack or "invite" in haystack,
            )
        )

    return meetings


def _extract_due_hint(email: NormalizedEmail) -> str:
    haystack = _email_text(email)
    time_match = TIME_HINT_PATTERN.search(haystack)
    day_match = DAY_HINT_PATTERN.search(haystack)

    if time_match and day_match:
        return f"{_normalize_match(day_match.group(0))}, {_normalize_match(time_match.group(0))}"
    if time_match:
        return _normalize_match(time_match.group(0))
    if day_match:
        return _normalize_match(day_match.group(0))
    return ""


def _extract_meeting_when_hint(email: NormalizedEmail) -> str:
    haystack = _email_text(email)
    time_match = TIME_HINT_PATTERN.search(haystack)
    day_match = DAY_HINT_PATTERN.search(haystack)

    if day_match and time_match:
        return f"{_normalize_match(day_match.group(0))}, {_normalize_match(time_match.group(0))}"
    if day_match:
        return _normalize_match(day_match.group(0))
    if time_match:
        return _normalize_match(time_match.group(0))
    return ""


def _extract_location_hint(haystack: str) -> str:
    if "zoom" in haystack:
        return "Zoom"
    if "google meet" in haystack or "meet.google" in haystack:
        return "Google Meet"
    if "teams" in haystack:
        return "Microsoft Teams"
    return ""


def _normalize_match(value: str) -> str:
    return " ".join(value.split()).capitalize()


def _email_text(email: NormalizedEmail) -> str:
    return " ".join(
        [
            email.subject.lower(),
            email.snippet.lower(),
            email.body_preview.lower(),
            " ".join(label.lower() for label in email.labels),
        ]
    )
