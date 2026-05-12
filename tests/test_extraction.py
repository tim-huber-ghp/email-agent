from datetime import datetime

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.services.extraction import extract_deadlines, extract_meetings, extract_subscriptions


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


def test_extract_meetings_skips_negated_meeting_language() -> None:
    email = _email(
        email_id="msg-2b",
        subject="No meeting needed, sharing notes async",
        snippet="Please read the meeting notes when you have time.",
        body_preview="No calendar invite is needed. This is just an async update.",
        labels=["work"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-2b",
            label="info",
            importance_score=45,
            reason="Useful informational update.",
            needs_action=False,
        )
    ]

    meetings = extract_meetings([email], assessments)

    assert meetings == []


def test_extract_subscriptions_picks_up_monthly_billing_signal() -> None:
    email = _email(
        email_id="msg-3",
        subject="Invoice for May subscription",
        snippet="Your monthly invoice is ready.",
        body_preview="Please review the billing statement for your $29.00 monthly plan. Cancel anytime.",
        labels=["finance"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-3",
            label="finance",
            importance_score=80,
            reason="Contains finance-related keywords.",
            needs_action=True,
        )
    ]

    subscriptions = extract_subscriptions([email], assessments)

    assert len(subscriptions) == 1
    assert subscriptions[0].service_name == "May Subscription"
    assert subscriptions[0].renewal_hint == "Monthly"
    assert subscriptions[0].cancellation_hint == "Cancel anytime"
    assert subscriptions[0].amount_hint == "$29.00"


def test_extract_subscriptions_skips_one_time_payments() -> None:
    email = _email(
        email_id="msg-3b",
        subject="Receipt for one-time conference ticket",
        snippet="Your receipt for the conference ticket is attached.",
        body_preview="This was a one-time payment. No recurring plan or subscription applies.",
        labels=["finance"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-3b",
            label="finance",
            importance_score=80,
            reason="Contains finance-related keywords.",
            needs_action=True,
        )
    ]

    subscriptions = extract_subscriptions([email], assessments)

    assert subscriptions == []


def test_extract_subscriptions_skips_cancelled_subscriptions() -> None:
    email = _email(
        email_id="msg-3c",
        subject="Your subscription has been cancelled",
        snippet="Your plan will not renew.",
        body_preview="Cancellation confirmed. No further billing is scheduled.",
        labels=["finance"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-3c",
            label="finance",
            importance_score=70,
            reason="Contains completed billing or cancellation information.",
            needs_action=False,
        )
    ]

    subscriptions = extract_subscriptions([email], assessments)

    assert subscriptions == []


def test_extract_subscriptions_skips_job_network_email_with_cancel_url() -> None:
    email = _email(
        email_id="msg-3d",
        subject="Tim: Kontaktvorschlag für dein persönliches Netzwerk",
        snippet="JobLeads hat eine passende Headhunter:in für deine Jobsuche gefunden.",
        body_preview=(
            "Ein Headhunter passt perfekt zu Ihrer Jobsuche. "
            "https://www.jobleads.com/login?jl_source=cancellation-confirmation-mail "
            "Verpasse nicht die Gelegenheit, dich zu vernetzen."
        ),
        labels=["CATEGORY_UPDATES", "INBOX"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-3d",
            label="info",
            importance_score=40,
            reason="Useful informational update.",
            needs_action=False,
        )
    ]

    subscriptions = extract_subscriptions([email], assessments)

    assert subscriptions == []


def test_extract_subscriptions_skips_job_alert_salary_range() -> None:
    email = _email(
        email_id="msg-3e",
        subject="Beliebter Job - schließ dich über 40 Bewerbern an",
        snippet="Senior AI Software Engineer (all genders)",
        body_preview=(
            "Basierend auf deiner letzten Suche glauben wir, dass er gut zu dir passt. "
            "59.000 - 86.000 €/Jahr (geschätzt für Vollzeit). "
            "Ich bin interessiert."
        ),
        labels=["CATEGORY_UPDATES", "INBOX"],
    )
    assessments = [
        EmailAssessment(
            email_id="msg-3e",
            label="info",
            importance_score=40,
            reason="Useful informational update.",
            needs_action=False,
        )
    ]

    subscriptions = extract_subscriptions([email], assessments)

    assert subscriptions == []
