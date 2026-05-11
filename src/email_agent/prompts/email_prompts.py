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
                "Mark needs_action true only when a follow-up is actually useful."
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
