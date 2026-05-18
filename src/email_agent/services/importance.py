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
INFO_KEYWORDS = {"policy", "review", "notes", "summary", "informational", "read later"}

URGENT_KEYWORDS = {"urgent", "asap", "today", "immediately", "deadline"}
DAY_DEADLINE_HINTS = {"monday", "tuesday", "wednesday", "thursday", "friday"}
REPLY_KEYWORDS = {"please reply", "can you", "let me know", "respond", "confirm"}
MEETING_KEYWORDS = {"meeting", "calendar", "invite", "schedule", "zoom"}
FINANCE_KEYWORDS = {
    "invoice",
    "payment",
    "receipt",
    "billing",
    "refund",
    "subscription",
    "renew",
    "renews",
    "renewal",
    "plan",
}
FINANCE_STRONG_KEYWORDS = {
    "invoice",
    "payment",
    "receipt",
    "billing",
    "refund",
    "subscription",
    "charge",
}
LOW_PRIORITY_HINTS = {
    "no rush",
    "optional",
    "when you get a chance",
    "whenever works",
    "unsubscribe",
    "promo",
}
JOB_ALERT_HINTS = {
    "beliebter job",
    "jobs perfekt auf dich abgestimmt",
    "top-fähigkeiten",
    "top-fahigkeiten",
    "diesen job melden",
    "weitere passende jobs anzeigen",
    "du passt auch gut zu diesen jobs",
    "andere bewerber interessierten sich auch",
    "weil du dir",
    "lebenslauf hochladen",
}
NETWORKING_HINTS = {
    "kontaktvorschlag",
    "headhunter",
    "jobsuche",
    "mit headhuntern vernetzen",
    "partner manager headhunter",
    "persönliches netzwerk",
    "personliches netzwerk",
}
NEGATED_MEETING_HINTS = {
    "no meeting needed",
    "no calendar invite",
    "meeting notes",
    "async update",
}
NEGATED_ACTION_HINTS = {
    "no response is needed",
    "no action needed",
    "optional",
    "no rush",
}


def filter_low_value_emails(emails: list[NormalizedEmail]) -> list[NormalizedEmail]:
    """Remove obvious marketing noise unless the sender looks important."""

    filtered: list[NormalizedEmail] = []
    for email in emails:
        haystack = _email_text(email)
        if (
            any(keyword in haystack for keyword in LOW_PRIORITY_KEYWORDS)
            and "important" not in haystack
        ):
            continue
        filtered.append(email)
    return filtered


def assess_email(email: NormalizedEmail) -> EmailAssessment:
    """Assign a simple category and score based on message content."""

    haystack = _email_text(email)
    low_priority_signal = any(keyword in haystack for keyword in LOW_PRIORITY_KEYWORDS)
    low_priority_hint = any(keyword in haystack for keyword in LOW_PRIORITY_HINTS)
    job_alert_signal = any(keyword in haystack for keyword in JOB_ALERT_HINTS)
    networking_signal = any(keyword in haystack for keyword in NETWORKING_HINTS)
    info_signal = any(keyword in haystack for keyword in INFO_KEYWORDS)
    finance_signal = any(keyword in haystack for keyword in FINANCE_KEYWORDS)
    finance_strong_signal = any(keyword in haystack for keyword in FINANCE_STRONG_KEYWORDS)
    urgent_signal = any(keyword in haystack for keyword in URGENT_KEYWORDS)
    deadline_day_signal = any(
        phrase in haystack
        for phrase in {
            *(f"by {day}" for day in DAY_DEADLINE_HINTS),
            *(f"before {day}" for day in DAY_DEADLINE_HINTS),
            *(f"deadline moved to {day}" for day in DAY_DEADLINE_HINTS),
        }
    )
    meeting_signal = any(keyword in haystack for keyword in MEETING_KEYWORDS)
    reply_signal = any(keyword in haystack for keyword in REPLY_KEYWORDS)
    cancellation_complete_signal = any(
        phrase in haystack
        for phrase in {
            "has been cancelled",
            "cancellation confirmed",
            "will not renew",
            "no further billing",
        }
    )
    promotions_label = "promotions" in haystack
    optional_reply_signal = (
        "no response required" in haystack or "no response is needed" in haystack
    )

    score = 20
    label = "info"
    reason = "General informational email."
    needs_action = False
    confidence_score = 60

    if job_alert_signal or networking_signal:
        score = 20
        label = "low_priority"
        reason = "Looks like a low-priority job alert or networking suggestion."
        needs_action = False
        confidence_score = 92
    elif (low_priority_signal or promotions_label) and not finance_strong_signal:
        score = 20
        label = "low_priority"
        reason = "Looks like promotional or low-value content."
        confidence_score = 95
    elif finance_signal and cancellation_complete_signal:
        score = 70
        label = "finance"
        reason = "Contains completed billing or cancellation information."
        needs_action = False
        confidence_score = 85
    elif finance_signal and (
        "subscription" in haystack or "renew" in haystack or "billing" in haystack
    ):
        score = 85
        label = "finance"
        reason = "Contains subscription or billing-related keywords."
        needs_action = True
        confidence_score = 90
    elif deadline_day_signal and (
        "send" in haystack or "need" in haystack or "deadline" in haystack
    ):
        score = 90
        label = "urgent"
        reason = "Contains a concrete deadline that still requires follow-up."
        needs_action = True
        confidence_score = 90
    elif (urgent_signal and "not urgent" not in haystack) and not low_priority_hint:
        score = 90
        label = "urgent"
        reason = "Contains urgent language or a time-sensitive deadline."
        needs_action = True
        confidence_score = 88
    elif finance_signal:
        score = 80
        label = "finance"
        reason = "Contains finance-related keywords."
        needs_action = True
        confidence_score = 80
    elif meeting_signal and not any(keyword in haystack for keyword in NEGATED_MEETING_HINTS):
        score = 70
        label = "meeting"
        reason = "Looks like a meeting or calendar-related email."
        needs_action = True
        confidence_score = 80
    elif reply_signal and not any(keyword in haystack for keyword in NEGATED_ACTION_HINTS):
        score = 65
        label = "needs_reply"
        reason = "Likely expects a response."
        needs_action = True
        confidence_score = 72
    elif optional_reply_signal or info_signal or "fyi" in haystack or "update" in haystack:
        score = 40
        label = "info"
        reason = "Looks like an informational message without urgent follow-up."
        confidence_score = 78
    elif low_priority_hint:
        score = 30
        label = "info"
        reason = "Looks optional or non-urgent."
        confidence_score = 70
    else:
        score = 25
        label = "low_priority"
        reason = "No strong signal of importance."
        confidence_score = 68

    return EmailAssessment(
        email_id=email.id,
        label=label,
        importance_score=score,
        reason=reason,
        needs_action=needs_action,
        confidence_score=confidence_score,
        abstained=False,
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
