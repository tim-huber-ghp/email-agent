"""Heuristic email filtering and assessment for the MVP."""

from email_agent.models.email import EmailAssessment, NormalizedEmail

LOW_PRIORITY_KEYWORDS = {
    "newsletter",
    "sale",
    "discount",
    "promo",
    "marketing",
    "unsubscribe",
}

URGENT_KEYWORDS = {"urgent", "asap", "today", "immediately", "deadline"}
REPLY_KEYWORDS = {"please reply", "can you", "let me know", "respond", "confirm"}
MEETING_KEYWORDS = {"meeting", "calendar", "invite", "schedule", "zoom"}
FINANCE_KEYWORDS = {"invoice", "payment", "receipt", "billing", "refund"}


def filter_low_value_emails(emails: list[NormalizedEmail]) -> list[NormalizedEmail]:
    """Remove obvious marketing noise unless the sender looks important."""

    filtered: list[NormalizedEmail] = []
    for email in emails:
        haystack = _email_text(email)
        if any(keyword in haystack for keyword in LOW_PRIORITY_KEYWORDS) and "important" not in haystack:
            continue
        filtered.append(email)
    return filtered


def assess_email(email: NormalizedEmail) -> EmailAssessment:
    """Assign a simple category and score based on message content."""

    haystack = _email_text(email)
    score = 20
    label = "info"
    reason = "General informational email."
    needs_action = False

    if any(keyword in haystack for keyword in URGENT_KEYWORDS):
        score = 90
        label = "urgent"
        reason = "Contains urgent language or a time-sensitive deadline."
        needs_action = True
    elif any(keyword in haystack for keyword in FINANCE_KEYWORDS):
        score = 80
        label = "finance"
        reason = "Contains finance-related keywords."
        needs_action = True
    elif any(keyword in haystack for keyword in MEETING_KEYWORDS):
        score = 70
        label = "meeting"
        reason = "Looks like a meeting or calendar-related email."
        needs_action = True
    elif any(keyword in haystack for keyword in REPLY_KEYWORDS):
        score = 65
        label = "needs_reply"
        reason = "Likely expects a response."
        needs_action = True
    elif "fyi" in haystack or "update" in haystack:
        score = 45
        label = "info"
        reason = "Useful informational update."
    else:
        score = 25
        label = "low_priority"
        reason = "No strong signal of importance."

    return EmailAssessment(
        email_id=email.id,
        label=label,
        importance_score=score,
        reason=reason,
        needs_action=needs_action,
    )


def _email_text(email: NormalizedEmail) -> str:
    return " ".join(
        [
            email.sender.lower(),
            email.subject.lower(),
            email.snippet.lower(),
            email.body_preview.lower(),
            " ".join(label.lower() for label in email.labels),
        ]
    )
