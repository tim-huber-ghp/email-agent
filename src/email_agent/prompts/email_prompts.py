"""Prompt builders for email classification and summarization."""

from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.summary import ActionItem


def classification_messages(emails: list[NormalizedEmail]) -> list[dict[str, str]]:
    """Build a structured classification prompt for a batch of emails."""

    email_lines = []
    for email in emails:
        email_lines.append(
            "\n".join(
                [
                    f"Email ID: {email.id}",
                    f"Sender: {email.sender}",
                    f"Subject: {email.subject}",
                    f"Labels: {', '.join(email.labels) if email.labels else 'none'}",
                    f"Snippet: {email.snippet}",
                    f"Body Preview: {email.body_preview or 'none'}",
                ]
            )
        )

    return [
        {
            "role": "system",
            "content": (
                "You classify personal and work emails for an end-of-day summary. "
                "For each email, return one assessment. "
                "Use only these labels: urgent, needs_reply, meeting, finance, info, low_priority. "
                "Score importance from 0 to 100. "
                "Mark needs_action true only when a follow-up is actually useful.\n\n"
                "Label guidance:\n"
                "- urgent: real time pressure, explicit deadline, or high-priority follow-up that should not wait.\n"
                "- needs_reply: a response is expected, but the main point is not scheduling and not finance.\n"
                "- meeting: the core purpose is a meeting, calendar hold, interview slot, invite, or scheduling coordination.\n"
                "- finance: the core purpose is billing, payment, receipt, renewal, refund, plan, subscription, or trial conversion.\n"
                "- info: legitimate informational updates that are not urgent and do not clearly need action.\n"
                "- low_priority: marketing, promos, newsletters, or low-value noise.\n\n"
                "Priority rules when signals conflict:\n"
                "- Choose meeting over needs_reply when calendar or scheduling is central.\n"
                "- Choose finance over urgent when billing, subscription, or renewal is the main topic.\n"
                "- Choose info over low_priority for real human or work communication, even when optional.\n"
                "- Choose low_priority for promotions even if they contain words like 'important', 'today', or 'renew'.\n"
                "- Do not mark an email urgent just because it asks for something; reserve urgent for actual time pressure.\n"
                "- Phrases like 'not urgent', 'no rush', 'when you get a chance', or 'optional' reduce urgency.\n"
                "- Cancellation confirmations or completed billing updates may be finance, but often do not need action.\n\n"
                "Examples:\n"
                "- 'Interview calendar hold for Monday' -> meeting\n"
                "- 'Your free trial ends tomorrow' -> finance\n"
                "- 'Not urgent, but please send the latest draft by Friday' -> urgent\n"
                "- 'When you get a chance, can you send the photo?' -> info\n"
                "- 'Important: your premium discount ends today' -> low_priority"
            ),
        },
        {
            "role": "user",
            "content": (
                "Classify these emails for an end-of-day summary.\n\n"
                + "\n\n---\n\n".join(email_lines)
            ),
        },
    ]


def summary_messages(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    language: str,
) -> list[dict[str, str]]:
    """Build the prompt for the final narrative summary."""

    assessment_lookup = {assessment.email_id: assessment for assessment in assessments}
    blocks = []
    for email in important_emails:
        assessment = assessment_lookup[email.id]
        blocks.append(
            "\n".join(
                [
                    f"Email ID: {email.id}",
                    f"Sender: {email.sender}",
                    f"Subject: {email.subject}",
                    f"Label: {assessment.label}",
                    f"Importance: {assessment.importance_score}",
                    f"Snippet: {email.snippet}",
                ]
            )
        )

    language_instruction = (
        "Write the output in German."
        if language == "de"
        else "Write the output in English."
    )
    no_action_text = "- Keine" if language == "de" else "- None"
    action_text = "\n".join(f"- {item.description}" for item in action_items[:4]) or no_action_text

    if language == "de":
        user_prompt = (
            "Schreibe eine Ueberschrift und eine kurze Zusammenfassung der wichtigen E-Mails "
            "von heute. Verwende als kurze, natuerliche Ueberschrift bevorzugt 'Dein Tag in E-Mails'.\n\n"
            "Wichtige E-Mails:\n\n"
            + "\n\n---\n\n".join(blocks)
            + "\n\nVorgeschlagene naechste Schritte:\n"
            + action_text
        )
    else:
        user_prompt = (
            "Write a headline and short overview for today's important emails.\n\n"
            "Important emails:\n\n"
            + "\n\n---\n\n".join(blocks)
            + "\n\nSuggested action items:\n"
            + action_text
        )

    return [
        {
            "role": "system",
            "content": (
                "You write a concise, practical end-of-day email summary. "
                "Keep it short, clear, and action-oriented. "
                "Do not invent details beyond the provided emails. "
                f"{language_instruction}"
            ),
        },
        {
            "role": "user",
            "content": user_prompt,
        },
    ]
