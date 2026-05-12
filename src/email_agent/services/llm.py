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


def llm_classification_enabled(settings: Settings) -> bool:
    """Return whether this run should use an LLM for classification."""

    return llm_is_available(settings) and settings.use_llm_classification


def llm_summary_enabled(settings: Settings) -> bool:
    """Return whether this run should use an LLM for summary generation."""

    return llm_is_available(settings) and settings.use_llm_summary


def classify_emails_with_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[EmailAssessment]:
    """Classify emails with structured model output."""

    all_assessments: list[EmailAssessment] = []

    for start in range(0, len(emails), settings.llm_max_emails):
        batch = emails[start : start + settings.llm_max_emails]
        prepared_batch = _prepare_emails_for_llm(batch, settings)
        assessments = _classify_email_batch_with_llm(prepared_batch, settings)
        if len(assessments) != len(batch):
            raise ValueError(
                f"Classification batch returned {len(assessments)} assessments for {len(batch)} emails."
            )
        all_assessments.extend(assessments)

    return all_assessments


def generate_summary_with_llm(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    settings: Settings,
) -> SummaryNarrative:
    """Generate the final summary narrative with the model."""

    important_emails = _prepare_emails_for_llm(important_emails, settings)
    important_email_ids = {email.id for email in important_emails}
    assessments = [assessment for assessment in assessments if assessment.email_id in important_email_ids]
    action_items = [item for item in action_items if item.source_email_id in important_email_ids][:4]

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


def _classify_email_batch_with_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[EmailAssessment]:
    """Classify a single prepared batch with the configured provider."""

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


def _prepare_emails_for_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> list[NormalizedEmail]:
    """Trim email content before sending it to a model."""

    prepared: list[NormalizedEmail] = []

    for email in emails[: settings.llm_max_emails]:
        prepared.append(
            email.model_copy(
                update={
                    "snippet": _truncate(email.snippet, settings.llm_max_snippet_chars),
                    "body_preview": _truncate(email.body_preview, settings.llm_max_body_chars),
                }
            )
        )

    return prepared


def _truncate(value: str, max_chars: int) -> str:
    value = value.strip()
    if len(value) <= max_chars:
        return value
    return value[: max_chars - 1].rstrip() + "…"
