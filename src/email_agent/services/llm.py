"""Optional LLM-backed services for classification and summarization."""

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

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:  # pragma: no cover - dependency may not be installed yet
    ChatGoogleGenerativeAI = None


class ClassificationBatch(BaseModel):
    """Structured output schema for a batch of email assessments."""

    assessments: list[EmailAssessment] = Field(default_factory=list)


class SummaryNarrative(BaseModel):
    """Structured output schema for the human-facing summary text."""

    headline: str
    overview: str


def llm_is_available(settings: Settings) -> bool:
    """Return whether LLM features should be attempted."""

    if not settings.use_llm:
        return False

    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key and OpenAI is not None)

    if settings.llm_provider == "gemini":
        return bool(settings.google_api_key and ChatGoogleGenerativeAI is not None)

    return False


def classify_emails_with_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[EmailAssessment]:
    """Classify emails with structured model output."""

    if settings.llm_provider == "gemini":
        return _classify_emails_with_gemini(emails, settings)

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

    if settings.llm_provider == "gemini":
        return _generate_summary_with_gemini(
            important_emails=important_emails,
            assessments=assessments,
            action_items=action_items,
            settings=settings,
        )

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.parse(
        model=settings.model_name,
        input=summary_messages(important_emails, assessments, action_items, settings.language),
        text_format=SummaryNarrative,
    )
    parsed = response.output_parsed
    if parsed is None:
        raise ValueError("The model did not return a structured summary payload.")
    return parsed


def _classify_emails_with_gemini(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[EmailAssessment]:
    """Classify emails with Gemini via LangChain structured output."""

    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(ClassificationBatch)
    parsed = structured_llm.invoke(classification_messages(emails))
    return parsed.assessments


def _generate_summary_with_gemini(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    settings: Settings,
) -> SummaryNarrative:
    """Generate the final summary with Gemini via LangChain structured output."""

    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(SummaryNarrative)
    parsed = structured_llm.invoke(
        summary_messages(
            important_emails=important_emails,
            assessments=assessments,
            action_items=action_items,
            language=settings.language,
        )
    )
    return parsed
