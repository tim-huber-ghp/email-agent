from email_agent.config import Settings
from email_agent.graph.workflow import (
    _apply_llm_guardrails,
    route_after_action_items,
    route_after_filtering,
    route_after_llm_classification,
    route_after_llm_summary,
    route_after_normalization,
    route_after_structured_extraction,
    run_workflow,
)
from email_agent.models.email import EmailAssessment, NormalizedEmail


def test_workflow_returns_state() -> None:
    settings = Settings(
        EMAIL_AGENT_DATA_DIR="./data",
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_MODEL="test-model",
        EMAIL_AGENT_USE_LLM=False,
        EMAIL_AGENT_LLM_PROVIDER="openai",
        EMAIL_AGENT_LANGUAGE="en",
        EMAIL_AGENT_USE_LLM_CLASSIFICATION=False,
        EMAIL_AGENT_USE_LLM_SUMMARY=True,
    )
    initial_state = {"provider": "mock", "run_date": "2026-05-10"}

    result = run_workflow(initial_state, settings)

    assert result["provider"] == "mock"
    assert result["summary"].important_email_ids
    assert result["persisted_run_dir"].endswith("2026-05-10")
    assert result["classification_mode"] == "heuristic"
    assert result["summary_mode"] == "heuristic"
    assert result["language"] == "en"
    assert result["extracted_items"]
    assert result["deadlines"]
    assert result["meetings"]
    assert result["subscriptions"]
    assert result["run_metadata"].extracted_item_count == len(result["extracted_items"])
    assert result["run_metadata"].run_started_at
    assert result["run_metadata"].run_completed_at
    assert result["run_metadata"].workflow_duration_ms >= 0
    assert "load_emails" in result["run_metadata"].step_durations_ms
    assert "generate_summary_with_heuristics" in result["run_metadata"].step_durations_ms


def test_llm_guardrails_fallback_to_heuristics_for_low_confidence() -> None:
    settings = Settings(
        EMAIL_AGENT_DATA_DIR="./data",
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_MODEL="test-model",
        EMAIL_AGENT_USE_LLM=True,
        EMAIL_AGENT_LLM_PROVIDER="openai",
        EMAIL_AGENT_LANGUAGE="en",
        EMAIL_AGENT_USE_LLM_CLASSIFICATION=True,
        OPENAI_API_KEY="test-key",
        EMAIL_AGENT_LLM_CONFIDENCE_THRESHOLD=70,
        EMAIL_AGENT_LLM_ABSTAIN_THRESHOLD=40,
    )
    email = NormalizedEmail.model_validate(
        {
            "id": "msg-1",
            "source": "evaluation",
            "sender": "manager@example.com",
            "subject": "Urgent: Please reply with the final budget today",
            "received_at": "2026-05-10T08:15:00",
            "snippet": "Need your confirmation before 4pm today.",
            "body_preview": (
                "Please reply with the updated budget numbers before the deadline today."
            ),
            "labels": ["work", "inbox"],
        }
    )
    llm_assessment = EmailAssessment(
        email_id="msg-1",
        label="needs_reply",
        importance_score=55,
        reason="Ambiguous request.",
        needs_action=True,
        confidence_score=35,
        abstained=True,
        uncertainty_note="Too ambiguous.",
    )

    assessments, replaced_count = _apply_llm_guardrails(
        emails=[email],
        llm_assessments=[llm_assessment],
        settings=settings,
    )

    assert replaced_count == 1
    assert assessments[0].label == "urgent"
    assert "Fallback from low-confidence LLM classification" in assessments[0].reason
    assert assessments[0].uncertainty_note == "Too ambiguous."


def test_routing_functions_cover_key_branches() -> None:
    assert route_after_normalization({"has_emails": False}) == "quiet_summary"
    assert route_after_normalization({"has_emails": True}) == "filter_emails"

    assert route_after_filtering({"has_filtered_emails": False}) == "quiet_summary"
    assert (
        route_after_filtering(
            {"has_filtered_emails": True, "llm_classification_enabled_for_run": False}
        )
        == "classify_with_heuristics"
    )
    assert (
        route_after_filtering(
            {"has_filtered_emails": True, "llm_classification_enabled_for_run": True}
        )
        == "classify_with_llm"
    )

    assert route_after_llm_classification({"classification_mode": "llm"}) == "extract_action_items"
    assert (
        route_after_llm_classification({"classification_mode": "llm_guardrailed"})
        == "extract_action_items"
    )
    assert (
        route_after_llm_classification({"classification_mode": "llm_failed"})
        == "classify_with_heuristics"
    )

    assert route_after_action_items({}) == "extract_deadlines"

    assert (
        route_after_structured_extraction({"llm_summary_enabled_for_run": True})
        == "summary_with_llm"
    )
    assert (
        route_after_structured_extraction({"llm_summary_enabled_for_run": False})
        == "summary_with_heuristics"
    )

    assert route_after_llm_summary({"summary_mode": "llm"}) == "save_run"
    assert route_after_llm_summary({"summary_mode": "llm_failed"}) == "summary_with_heuristics"
