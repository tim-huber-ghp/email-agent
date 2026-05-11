"""Workflow entrypoints."""

from __future__ import annotations

from collections import Counter
from datetime import date

from langgraph.graph import END, START, StateGraph

from email_agent.config import Settings
from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.run_metadata import RunMetadata
from email_agent.models.summary import ActionItem, DailySummary
from email_agent.providers.gmail import GmailProvider
from email_agent.providers.mock import MockEmailProvider
from email_agent.services.importance import assess_email, filter_low_value_emails
from email_agent.services.llm import (
    classify_emails_with_llm,
    generate_summary_with_llm,
    llm_classification_enabled,
    llm_is_available,
    llm_summary_enabled,
)
from email_agent.state import AgentState
from email_agent.storage.json_store import persist_run


def load_emails(state: AgentState, settings: Settings) -> AgentState:
    """Fetch raw emails from the selected provider."""

    target_date = date.fromisoformat(state["run_date"])
    provider_name = state.get("provider", "mock")

    if provider_name == "gmail":
        provider = GmailProvider(settings)
    elif provider_name == "mock":
        provider = MockEmailProvider(settings.data_dir / "fixtures" / "mock_emails.json")
    else:
        raise ValueError(f"Unsupported provider: {provider_name}")

    return {
        **state,
        "raw_emails": provider.fetch_emails_for_day(target_date),
    }


def normalize_emails(state: AgentState) -> AgentState:
    """Convert provider payloads into a shared email model."""

    normalized: list[NormalizedEmail] = []
    raw_emails = state.get("raw_emails", [])

    for raw_email in raw_emails:
        payload = raw_email.payload
        normalized.append(
            NormalizedEmail.model_validate(
                {
                    "id": raw_email.provider_id,
                    "source": raw_email.source,
                    "sender": payload["sender"],
                    "subject": payload["subject"],
                    "received_at": payload["received_at"],
                    "snippet": payload["snippet"],
                    "labels": payload.get("labels", []),
                    "body_preview": payload.get("body_preview", ""),
                }
            )
        )

    return {
        **state,
        "emails": normalized,
        "has_emails": bool(normalized),
    }


def filter_emails(state: AgentState) -> AgentState:
    """Drop obviously low-value emails before assessment."""

    emails = state.get("emails", [])
    filtered = filter_low_value_emails(emails)
    return {
        **state,
        "filtered_emails": filtered,
        "has_filtered_emails": bool(filtered),
    }


def classify_emails_with_llm_node(state: AgentState, settings: Settings) -> AgentState:
    """Try LLM-based email classification."""

    filtered_emails = state.get("filtered_emails", [])
    try:
        assessments = classify_emails_with_llm(filtered_emails, settings)
        return {
            **state,
            "assessments": assessments,
            "classification_mode": "llm",
            "classification_error": "",
        }
    except Exception as exc:
        return {
            **state,
            "assessments": [],
            "classification_mode": "llm_failed",
            "classification_error": str(exc),
        }


def classify_emails_with_heuristics_node(state: AgentState) -> AgentState:
    """Use heuristic classification as the primary or fallback path."""

    filtered_emails = state.get("filtered_emails", [])
    assessments = [assess_email(email) for email in filtered_emails]
    previous_error = state.get("classification_error", "")
    previous_mode = state.get("classification_mode", "")

    return {
        **state,
        "assessments": assessments,
        "classification_mode": "heuristic_fallback" if previous_mode == "llm_failed" else "heuristic",
        "classification_error": previous_error,
    }


def extract_action_items(state: AgentState, settings: Settings) -> AgentState:
    """Create a simple action list from important emails."""

    emails_by_id = {email.id: email for email in state.get("filtered_emails", [])}
    action_items: list[ActionItem] = []

    for assessment in state.get("assessments", []):
        if not assessment.needs_action:
            continue

        email = emails_by_id[assessment.email_id]
        description = _build_action_description(email, assessment, settings.language)
        action_items.append(
            ActionItem(
                description=description,
                source_email_id=assessment.email_id,
                priority=assessment.label,
            )
        )

    return {
        **state,
        "action_items": action_items,
    }


def generate_summary_with_llm_node(state: AgentState, settings: Settings) -> AgentState:
    """Try LLM-based summary generation for important emails."""

    assessments = state.get("assessments", [])
    important_assessments = [item for item in assessments if item.importance_score >= 50]
    filtered_emails = state.get("filtered_emails", [])
    important_email_ids = [item.email_id for item in important_assessments]
    important_emails = [email for email in filtered_emails if email.id in important_email_ids]
    if not important_emails:
        return {
            **state,
            "summary_mode": "heuristic",
            "summary_error": "",
        }

    try:
        llm_summary = generate_summary_with_llm(
            important_emails=important_emails,
            assessments=important_assessments,
            action_items=state.get("action_items", []),
            settings=settings,
        )
        counts = Counter(item.label for item in important_assessments)
        summary = DailySummary(
            headline=llm_summary.headline,
            overview=llm_summary.overview,
            important_email_ids=important_email_ids,
            action_items=state.get("action_items", []),
            counts_by_label=dict(counts),
            language=settings.language,
        )
        return {
            **state,
            "summary": summary,
            "summary_mode": "llm",
            "summary_error": "",
        }
    except Exception as exc:
        return {
            **state,
            "summary_mode": "llm_failed",
            "summary_error": str(exc),
        }


def generate_summary_with_heuristics_node(state: AgentState, settings: Settings) -> AgentState:
    """Build a readable summary without relying on a model call."""

    assessments = state.get("assessments", [])
    important_assessments = [item for item in assessments if item.importance_score >= 50]
    counts = Counter(item.label for item in important_assessments)
    important_email_ids = [item.email_id for item in important_assessments]

    if important_assessments:
        top_labels = ", ".join(
            _format_label_count(label, count, settings.language)
            for label, count in counts.most_common()
        )
        if settings.language == "de":
            overview = (
                f"Du hast heute {len(important_assessments)} wichtige E-Mails erhalten. "
                f"Wichtigste Kategorien: {top_labels}."
            )
            headline = "Dein Tag in E-Mails."
        else:
            overview = (
                f"You received {len(important_assessments)} important emails today. "
                f"Main categories: {top_labels}."
            )
            headline = "Your day in emails."
    else:
        if settings.language == "de":
            overview = "Dein Posteingang war heute ruhig. Es wurden keine wichtigen E-Mails erkannt."
            headline = "Heute war dein Posteingang ruhig."
        else:
            overview = "Your inbox was quiet today. No important emails were detected."
            headline = "Your inbox was quiet today."

    previous_error = state.get("summary_error", "")
    previous_mode = state.get("summary_mode", "")
    summary = DailySummary(
        headline=headline,
        overview=overview,
        important_email_ids=important_email_ids,
        action_items=state.get("action_items", []),
        counts_by_label=dict(counts),
        language=settings.language,
    )

    return {
        **state,
        "summary": summary,
        "summary_mode": "heuristic_fallback" if previous_mode == "llm_failed" else "heuristic",
        "summary_error": previous_error,
    }


def generate_quiet_summary(state: AgentState, settings: Settings) -> AgentState:
    """Create a short summary when there are no emails or no useful emails."""

    if settings.language == "de":
        overview = "Dein Posteingang war heute ruhig. Es wurden keine wichtigen E-Mails erkannt."
        headline = "Heute war dein Posteingang ruhig."
    else:
        overview = "Your inbox was quiet today. No important emails were detected."
        headline = "Your inbox was quiet today."

    summary = DailySummary(
        headline=headline,
        overview=overview,
        important_email_ids=[],
        action_items=[],
        counts_by_label={},
        language=settings.language,
    )

    return {
        **state,
        "assessments": [],
        "action_items": [],
        "summary": summary,
        "classification_mode": state.get("classification_mode", "heuristic"),
        "summary_mode": "heuristic",
        "summary_error": "",
    }


def save_run(state: AgentState, settings: Settings) -> AgentState:
    """Persist the run output for inspection and future UI work."""

    run_metadata = RunMetadata(
        run_date=state["run_date"],
        provider=state.get("provider", "unknown"),
        language=settings.language,
        llm_enabled=state.get("llm_enabled_for_run", False),
        llm_provider=settings.llm_provider,
        llm_classification_enabled=state.get("llm_classification_enabled_for_run", False),
        llm_summary_enabled=state.get("llm_summary_enabled_for_run", False),
        classification_mode=state.get("classification_mode", "unknown"),
        summary_mode=state.get("summary_mode", "unknown"),
        email_count=len(state.get("emails", [])),
        filtered_email_count=len(state.get("filtered_emails", [])),
        important_email_count=len(state.get("summary", DailySummary(overview="", headline="")).important_email_ids),
    )

    run_dir = persist_run(
        data_dir=settings.data_dir,
        run_date=state["run_date"],
        emails=state.get("emails", []),
        assessments=state.get("assessments", []),
        summary=state["summary"],
        run_metadata=run_metadata,
    )
    return {
        **state,
        "persisted_run_dir": str(run_dir),
        "run_metadata": run_metadata,
    }


def build_workflow(settings: Settings):
    """Compile the LangGraph workflow for the MVP."""

    graph = StateGraph(AgentState)
    graph.add_node("load_emails", lambda state: load_emails(state, settings))
    graph.add_node("normalize_emails", normalize_emails)
    graph.add_node("filter_emails", filter_emails)
    graph.add_node(
        "classify_emails_with_llm",
        lambda state: classify_emails_with_llm_node(state, settings),
    )
    graph.add_node("classify_emails_with_heuristics", classify_emails_with_heuristics_node)
    graph.add_node("extract_action_items", lambda state: extract_action_items(state, settings))
    graph.add_node(
        "generate_summary_with_llm",
        lambda state: generate_summary_with_llm_node(state, settings),
    )
    graph.add_node(
        "generate_summary_with_heuristics",
        lambda state: generate_summary_with_heuristics_node(state, settings),
    )
    graph.add_node("generate_quiet_summary", lambda state: generate_quiet_summary(state, settings))
    graph.add_node("save_run", lambda state: save_run(state, settings))

    graph.add_edge(START, "load_emails")
    graph.add_edge("load_emails", "normalize_emails")
    graph.add_conditional_edges(
        "normalize_emails",
        route_after_normalization,
        {
            "filter_emails": "filter_emails",
            "quiet_summary": "generate_quiet_summary",
        },
    )
    graph.add_conditional_edges(
        "filter_emails",
        route_after_filtering,
        {
            "classify_with_llm": "classify_emails_with_llm",
            "classify_with_heuristics": "classify_emails_with_heuristics",
            "quiet_summary": "generate_quiet_summary",
        },
    )
    graph.add_conditional_edges(
        "classify_emails_with_llm",
        route_after_llm_classification,
        {
            "extract_action_items": "extract_action_items",
            "classify_with_heuristics": "classify_emails_with_heuristics",
        },
    )
    graph.add_edge("classify_emails_with_heuristics", "extract_action_items")
    graph.add_conditional_edges(
        "extract_action_items",
        route_after_action_items,
        {
            "summary_with_llm": "generate_summary_with_llm",
            "summary_with_heuristics": "generate_summary_with_heuristics",
        },
    )
    graph.add_conditional_edges(
        "generate_summary_with_llm",
        route_after_llm_summary,
        {
            "save_run": "save_run",
            "summary_with_heuristics": "generate_summary_with_heuristics",
        },
    )
    graph.add_edge("generate_summary_with_heuristics", "save_run")
    graph.add_edge("generate_quiet_summary", "save_run")
    graph.add_edge("save_run", END)

    return graph.compile()


def run_workflow(initial_state: AgentState, settings: Settings) -> AgentState:
    """Run the compiled LangGraph workflow."""

    app = build_workflow(settings)
    return app.invoke(
        {
            **initial_state,
            "language": settings.language,
            "llm_enabled_for_run": llm_is_available(settings),
            "llm_classification_enabled_for_run": llm_classification_enabled(settings),
            "llm_summary_enabled_for_run": llm_summary_enabled(settings),
        }
    )


def route_after_normalization(state: AgentState) -> str:
    return "filter_emails" if state.get("has_emails") else "quiet_summary"


def route_after_filtering(state: AgentState) -> str:
    if not state.get("has_filtered_emails"):
        return "quiet_summary"
    return (
        "classify_with_llm"
        if state.get("llm_classification_enabled_for_run")
        else "classify_with_heuristics"
    )


def route_after_llm_classification(state: AgentState) -> str:
    return "extract_action_items" if state.get("classification_mode") == "llm" else "classify_with_heuristics"


def route_after_action_items(state: AgentState) -> str:
    return "summary_with_llm" if state.get("llm_summary_enabled_for_run") else "summary_with_heuristics"


def route_after_llm_summary(state: AgentState) -> str:
    return "save_run" if state.get("summary_mode") == "llm" else "summary_with_heuristics"


def _build_action_description(
    email: NormalizedEmail,
    assessment: EmailAssessment,
    language: str,
) -> str:
    if language == "de":
        if assessment.label == "urgent":
            return (
                f"Antworte moeglichst schnell auf '{email.subject}' von {email.sender} "
                "oder pruefe die Nachricht sofort."
            )
        if assessment.label == "meeting":
            return f"Pruefe die Besprechungsdetails in '{email.subject}'."
        if assessment.label == "finance":
            return f"Pruefe die finanzbezogene Nachricht '{email.subject}'."
        return f"Bearbeite die E-Mail '{email.subject}' von {email.sender} weiter."

    if assessment.label == "urgent":
        return f"Reply to or review '{email.subject}' from {email.sender} as soon as possible."
    if assessment.label == "meeting":
        return f"Check the meeting details in '{email.subject}'."
    if assessment.label == "finance":
        return f"Review the financial message '{email.subject}'."
    return f"Follow up on '{email.subject}' from {email.sender}."


def _format_label_count(label: str, count: int, language: str) -> str:
    if language == "de":
        translations = {
            "urgent": "dringend",
            "needs_reply": "Antwort noetig",
            "meeting": "Besprechung",
            "finance": "Finanzen",
            "info": "Info",
            "low_priority": "niedrige Prioritaet",
        }
        return f"{count} {translations.get(label, label)}"

    return f"{count} {label.replace('_', ' ')}"
