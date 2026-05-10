"""Optional OpenAI-backed services for classification and summarization."""

from __future__ import annotations

from pydantic import BaseModel, Field

from email_agent.config import Settings
from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.summary import ActionItem
from email_agent.prompts.email_prompts import classification_messages, summary_messages

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - dependency may not be installed yet
    OpenAI = None


class ClassificationBatch(BaseModel):
    """Structured output schema for a batch of email assessments."""

    assessments: list[EmailAssessment] = Field(default_factory=list)


class SummaryNarrative(BaseModel):
    """Structured output schema for the human-facing summary text."""

    headline: str
    overview: str


def llm_is_available(settings: Settings) -> bool:
    """Return whether LLM features should be attempted."""

    return bool(settings.use_llm and settings.openai_api_key and OpenAI is not None)


def classify_emails_with_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[EmailAssessment]:
    """Classify emails with structured model output."""

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.parse(
        model=settings.model_name,
        input=classification_messages(emails),
        text_format=ClassificationBatch,
    )
    parsed = response.output_parsed
    if parsed is None:
        raise ValueError("The model did not return a structured classification payload.")
    return parsed.assessments


def generate_summary_with_llm(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    settings: Settings,
) -> SummaryNarrative:
    """Generate the final summary narrative with the model."""

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.parse(
        model=settings.model_name,
        input=summary_messages(important_emails, assessments, action_items),
        text_format=SummaryNarrative,
    )
    parsed = response.output_parsed
    if parsed is None:
        raise ValueError("The model did not return a structured summary payload.")
    return parsed
