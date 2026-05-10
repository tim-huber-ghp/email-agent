"""Workflow entrypoints."""

from __future__ import annotations

from collections import Counter
from datetime import date

from langgraph.graph import END, START, StateGraph

from email_agent.config import Settings
from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.models.summary import ActionItem, DailySummary
from email_agent.providers.mock import MockEmailProvider
from email_agent.services.importance import assess_email, filter_low_value_emails
from email_agent.services.llm import (
    classify_emails_with_llm,
    generate_summary_with_llm,
    llm_is_available,
)
from email_agent.state import AgentState
from email_agent.storage.json_store import persist_run


def load_mock_emails(state: AgentState, settings: Settings) -> AgentState:
    """Fetch fixture emails for the requested date."""

    target_date = date.fromisoformat(state["run_date"])
    provider = MockEmailProvider(settings.data_dir / "fixtures" / "mock_emails.json")
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
    }


def filter_emails(state: AgentState) -> AgentState:
    """Drop obviously low-value emails before assessment."""

    emails = state.get("emails", [])
    filtered = filter_low_value_emails(emails)
    return {
        **state,
        "filtered_emails": filtered,
    }


def classify_emails(state: AgentState, settings: Settings) -> AgentState:
    """Assign an importance label to each candidate email."""

    filtered_emails = state.get("filtered_emails", [])
    if llm_is_available(settings):
        try:
            assessments = classify_emails_with_llm(filtered_emails, settings)
        except Exception:
            assessments = [assess_email(email) for email in filtered_emails]
    else:
        assessments = [assess_email(email) for email in filtered_emails]

    return {
        **state,
        "assessments": assessments,
    }


def extract_action_items(state: AgentState) -> AgentState:
    """Create a simple action list from important emails."""

    emails_by_id = {email.id: email for email in state.get("filtered_emails", [])}
    action_items: list[ActionItem] = []

    for assessment in state.get("assessments", []):
        if not assessment.needs_action:
            continue

        email = emails_by_id[assessment.email_id]
        description = _build_action_description(email, assessment)
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


def generate_summary(state: AgentState, settings: Settings) -> AgentState:
    """Build a readable daily summary from heuristic results."""

    assessments = state.get("assessments", [])
    important_assessments = [item for item in assessments if item.importance_score >= 50]
    counts = Counter(item.label for item in important_assessments)
    filtered_emails = state.get("filtered_emails", [])
    important_email_ids = [item.email_id for item in important_assessments]
    important_emails = [email for email in filtered_emails if email.id in important_email_ids]

    if important_assessments:
        top_labels = ", ".join(
            f"{count} {label.replace('_', ' ')}" for label, count in counts.most_common()
        )
        overview = (
            f"You received {len(important_assessments)} important emails today. "
            f"Main categories: {top_labels}."
        )
        headline = "Important emails need your attention today."
    else:
        overview = "Your inbox was quiet today. No important emails were detected."
        headline = "No urgent email follow-up today."

    if important_emails and llm_is_available(settings):
        try:
            llm_summary = generate_summary_with_llm(
                important_emails=important_emails,
                assessments=important_assessments,
                action_items=state.get("action_items", []),
                settings=settings,
            )
            headline = llm_summary.headline
            overview = llm_summary.overview
        except Exception:
            pass

    summary = DailySummary(
        headline=headline,
        overview=overview,
        important_email_ids=important_email_ids,
        action_items=state.get("action_items", []),
        counts_by_label=dict(counts),
    )

    return {
        **state,
        "summary": summary,
    }


def save_run(state: AgentState, settings: Settings) -> AgentState:
    """Persist the run output for inspection and future UI work."""

    run_dir = persist_run(
        data_dir=settings.data_dir,
        run_date=state["run_date"],
        emails=state.get("emails", []),
        assessments=state.get("assessments", []),
        summary=state["summary"],
    )
    return {
        **state,
        "persisted_run_dir": str(run_dir),
    }


def build_workflow(settings: Settings):
    """Compile the LangGraph workflow for the MVP."""

    graph = StateGraph(AgentState)
    graph.add_node("load_mock_emails", lambda state: load_mock_emails(state, settings))
    graph.add_node("normalize_emails", normalize_emails)
    graph.add_node("filter_emails", filter_emails)
    graph.add_node("classify_emails", lambda state: classify_emails(state, settings))
    graph.add_node("extract_action_items", extract_action_items)
    graph.add_node("generate_summary", lambda state: generate_summary(state, settings))
    graph.add_node("save_run", lambda state: save_run(state, settings))

    graph.add_edge(START, "load_mock_emails")
    graph.add_edge("load_mock_emails", "normalize_emails")
    graph.add_edge("normalize_emails", "filter_emails")
    graph.add_edge("filter_emails", "classify_emails")
    graph.add_edge("classify_emails", "extract_action_items")
    graph.add_edge("extract_action_items", "generate_summary")
    graph.add_edge("generate_summary", "save_run")
    graph.add_edge("save_run", END)

    return graph.compile()


def run_workflow(initial_state: AgentState, settings: Settings) -> AgentState:
    """Run the compiled LangGraph workflow."""

    app = build_workflow(settings)
    return app.invoke(initial_state)


def _build_action_description(email: NormalizedEmail, assessment: EmailAssessment) -> str:
    if assessment.label == "urgent":
        return f"Reply to or review '{email.subject}' from {email.sender} as soon as possible."
    if assessment.label == "meeting":
        return f"Check the meeting details in '{email.subject}'."
    if assessment.label == "finance":
        return f"Review the financial message '{email.subject}'."
    return f"Follow up on '{email.subject}' from {email.sender}."
