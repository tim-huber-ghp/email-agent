from datetime import datetime

from email_agent.services.importance import assess_email
from email_agent.models.email import NormalizedEmail


def _email(subject: str, snippet: str, body_preview: str, labels: list[str] | None = None) -> NormalizedEmail:
    return NormalizedEmail(
        id="test-email",
        source="evaluation",
        sender="sender@example.com",
        subject=subject,
        received_at=datetime.fromisoformat("2026-05-10T09:00:00"),
        snippet=snippet,
        body_preview=body_preview,
        labels=labels or [],
    )


def test_promotional_today_email_stays_low_priority() -> None:
    email = _email(
        "Today only: exclusive discount for premium members",
        "Big sale today. Unsubscribe any time.",
        "Limited-time promo for premium members. Unsubscribe any time.",
        ["promotions"],
    )

    assessment = assess_email(email)

    assert assessment.label == "low_priority"
    assert assessment.importance_score < 50


def test_negated_meeting_language_stays_info() -> None:
    email = _email(
        "No meeting needed, sharing notes async",
        "Please read the meeting notes when you have time.",
        "No calendar invite is needed. This is just an async update.",
        ["work"],
    )

    assessment = assess_email(email)

    assert assessment.label == "info"
    assert assessment.importance_score < 50


def test_subscription_renewal_is_classified_as_finance() -> None:
    email = _email(
        "Your plan renews tomorrow unless cancelled",
        "Annual plan renews tomorrow for $120.00.",
        "Cancel before tomorrow if you do not want to continue the annual subscription.",
        ["finance"],
    )

    assessment = assess_email(email)

    assert assessment.label == "finance"
    assert assessment.importance_score >= 50
