"""Optional LLM-backed services for classification and summarization."""

from __future__ import annotations

from collections.abc import Mapping

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


class LLMUsage(BaseModel):
    """Normalized token usage captured from a model response."""

    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0

    def plus(self, other: LLMUsage) -> LLMUsage:
        return LLMUsage(
            input_tokens=self.input_tokens + other.input_tokens,
            output_tokens=self.output_tokens + other.output_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
        )


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
) -> tuple[list[EmailAssessment], LLMUsage]:
    """Classify emails with structured model output."""

    all_assessments: list[EmailAssessment] = []
    cumulative_usage = LLMUsage()

    for start in range(0, len(emails), settings.llm_max_emails):
        batch = emails[start : start + settings.llm_max_emails]
        prepared_batch = _prepare_emails_for_llm(batch, settings)
        assessments, usage = _classify_email_batch_with_llm(prepared_batch, settings)
        if len(assessments) != len(batch):
            raise ValueError(
                "Classification batch returned "
                f"{len(assessments)} assessments for {len(batch)} emails."
            )
        all_assessments.extend(assessments)
        cumulative_usage = cumulative_usage.plus(usage)

    return all_assessments, cumulative_usage


def generate_summary_with_llm(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    settings: Settings,
) -> tuple[SummaryNarrative, LLMUsage]:
    """Generate the final summary narrative with the model."""

    important_emails = _prepare_emails_for_llm(important_emails, settings)
    important_email_ids = {email.id for email in important_emails}
    assessments = [
        assessment for assessment in assessments if assessment.email_id in important_email_ids
    ]
    action_items = [item for item in action_items if item.source_email_id in important_email_ids][
        :4
    ]

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
    return parsed, _extract_openai_usage(response)


def _classify_emails_with_gemini(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> tuple[list[EmailAssessment], LLMUsage]:
    """Classify emails with Gemini via LangChain structured output."""

    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(ClassificationBatch, include_raw=True)
    result = structured_llm.invoke(classification_messages(emails))
    parsed = result["parsed"]
    return parsed.assessments, _extract_langchain_usage(result.get("raw"))


def _classify_email_batch_with_llm(
    emails: list[NormalizedEmail],
    settings: Settings,
) -> tuple[list[EmailAssessment], LLMUsage]:
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
    return parsed.assessments, _extract_openai_usage(response)


def _generate_summary_with_gemini(
    important_emails: list[NormalizedEmail],
    assessments: list[EmailAssessment],
    action_items: list[ActionItem],
    settings: Settings,
) -> tuple[SummaryNarrative, LLMUsage]:
    """Generate the final summary with Gemini via LangChain structured output."""

    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
    structured_llm = llm.with_structured_output(SummaryNarrative, include_raw=True)
    result = structured_llm.invoke(
        summary_messages(
            important_emails=important_emails,
            assessments=assessments,
            action_items=action_items,
            language=settings.language,
        )
    )
    parsed = result["parsed"]
    return parsed, _extract_langchain_usage(result.get("raw"))


def estimate_cost_eur(usage: LLMUsage, settings: Settings) -> float:
    """Estimate cost in EUR from configured per-1k token rates."""

    input_cost = (usage.input_tokens / 1000) * settings.llm_input_cost_per_1k_tokens
    output_cost = (usage.output_tokens / 1000) * settings.llm_output_cost_per_1k_tokens
    return round(input_cost + output_cost, 6)


def usage_to_dict(usage: LLMUsage) -> dict[str, int]:
    """Return a serializable usage payload."""

    return usage.model_dump()


def _extract_openai_usage(response: object) -> LLMUsage:
    usage = getattr(response, "usage", None)
    if usage is None:
        return LLMUsage()

    return LLMUsage(
        input_tokens=int(getattr(usage, "input_tokens", 0) or 0),
        output_tokens=int(getattr(usage, "output_tokens", 0) or 0),
        total_tokens=int(getattr(usage, "total_tokens", 0) or 0),
    )


def _extract_langchain_usage(message: object) -> LLMUsage:
    usage_metadata = getattr(message, "usage_metadata", None)
    if not isinstance(usage_metadata, Mapping):
        return LLMUsage()

    return LLMUsage(
        input_tokens=int(usage_metadata.get("input_tokens", 0) or 0),
        output_tokens=int(usage_metadata.get("output_tokens", 0) or 0),
        total_tokens=int(usage_metadata.get("total_tokens", 0) or 0),
    )


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
