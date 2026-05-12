"""Heuristic structured extraction for deadlines, meetings, and subscriptions."""

from __future__ import annotations

import re

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.summary import ExtractedDeadline, ExtractedMeeting, ExtractedSubscription

DAY_HINT_PATTERN = re.compile(
    r"\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)
TIME_HINT_PATTERN = re.compile(
    r"\b(?:by|before|at)\s+\d{1,2}(?::\d{2})?\s?(?:am|pm)\b",
    re.IGNORECASE,
)
AMOUNT_PATTERN = re.compile(r"(?:\$|eur\s?|€)\s?\d+(?:[.,]\d{2})?", re.IGNORECASE)
SUBSCRIPTION_KEYWORDS = (
    "subscription",
    "monthly",
    "annual",
    "renewal",
    "renews",
    "auto-renew",
    "billing",
    "plan",
)
MEETING_STRONG_HINTS = ("invite", "calendar", "zoom", "teams", "google meet", "confirm attendance")
NEGATED_MEETING_HINTS = ("no meeting needed", "meeting notes", "no calendar invite", "async update")
NEGATED_SUBSCRIPTION_HINTS = (
    "one-time payment",
    "no recurring",
    "no subscription applies",
    "not a subscription",
    "will not renew",
    "no further billing",
    "cancellation confirmed",
    "has been cancelled",
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
        has_meeting_hint = any(keyword in haystack for keyword in ("meeting", "invite", "calendar", "zoom", "teams"))
        has_strong_meeting_hint = any(keyword in haystack for keyword in MEETING_STRONG_HINTS)
        has_negated_meeting_hint = any(keyword in haystack for keyword in NEGATED_MEETING_HINTS)

        if has_negated_meeting_hint:
            continue

        if assessment.label != "meeting" and not (has_meeting_hint and has_strong_meeting_hint):
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


def extract_subscriptions(
    emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
) -> list[ExtractedSubscription]:
    """Extract recurring subscription signals from finance-like emails."""

    emails_by_id = {email.id: email for email in emails}
    subscriptions: list[ExtractedSubscription] = []

    for assessment in assessments:
        email = emails_by_id.get(assessment.email_id)
        if email is None:
            continue

        haystack = _email_text(email)
        if assessment.label != "finance" and not any(keyword in haystack for keyword in SUBSCRIPTION_KEYWORDS):
            continue

        if not any(keyword in haystack for keyword in SUBSCRIPTION_KEYWORDS):
            continue

        if any(keyword in haystack for keyword in NEGATED_SUBSCRIPTION_HINTS):
            continue

        subscriptions.append(
            ExtractedSubscription(
                service_name=_extract_service_name(email),
                source_email_id=email.id,
                renewal_hint=_extract_subscription_renewal_hint(email),
                cancellation_hint=_extract_cancellation_hint(haystack),
                amount_hint=_extract_amount_hint(haystack),
            )
        )

    return subscriptions


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


def _extract_subscription_renewal_hint(email: NormalizedEmail) -> str:
    haystack = _email_text(email)
    day_match = DAY_HINT_PATTERN.search(haystack)
    if "monthly" in haystack:
        return "Monthly"
    if "annual" in haystack or "yearly" in haystack:
        return "Annual"
    if day_match:
        return _normalize_match(day_match.group(0))
    return ""


def _extract_cancellation_hint(haystack: str) -> str:
    if "cancel anytime" in haystack:
        return "Cancel anytime"
    if "unsubscribe" in haystack:
        return "Unsubscribe available"
    if "cancel" in haystack:
        return "Cancellation mentioned"
    return ""


def _extract_amount_hint(haystack: str) -> str:
    amount_match = AMOUNT_PATTERN.search(haystack)
    if amount_match:
        return " ".join(amount_match.group(0).split())
    return ""


def _extract_service_name(email: NormalizedEmail) -> str:
    subject = email.subject.strip()
    for separator in (" for ", " from ", " - ", ": "):
        if separator in subject.lower():
            parts = re.split(separator, subject, flags=re.IGNORECASE, maxsplit=1)
            return parts[-1].strip().title()
    return subject


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
