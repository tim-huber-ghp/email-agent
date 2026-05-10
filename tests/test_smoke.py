from email_agent.config import Settings
from email_agent.graph.workflow import (
    route_after_action_items,
    route_after_filtering,
    route_after_llm_classification,
    route_after_llm_summary,
    route_after_normalization,
    run_workflow,
)


def test_workflow_returns_state() -> None:
    settings = Settings(
        EMAIL_AGENT_DATA_DIR="./data",
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_MODEL="test-model",
        EMAIL_AGENT_USE_LLM=False,
        EMAIL_AGENT_LLM_PROVIDER="openai",
        EMAIL_AGENT_LANGUAGE="en",
    )
    initial_state = {"provider": "mock", "run_date": "2026-05-10"}

    result = run_workflow(initial_state, settings)

    assert result["provider"] == "mock"
    assert result["summary"].important_email_ids
    assert result["persisted_run_dir"].endswith("2026-05-10")
    assert result["classification_mode"] == "heuristic"
    assert result["summary_mode"] == "heuristic"
    assert result["language"] == "en"


def test_routing_functions_cover_key_branches() -> None:
    assert route_after_normalization({"has_emails": False}) == "quiet_summary"
    assert route_after_normalization({"has_emails": True}) == "filter_emails"

    assert route_after_filtering({"has_filtered_emails": False}) == "quiet_summary"
    assert route_after_filtering({"has_filtered_emails": True, "llm_enabled_for_run": False}) == "classify_with_heuristics"
    assert route_after_filtering({"has_filtered_emails": True, "llm_enabled_for_run": True}) == "classify_with_llm"

    assert route_after_llm_classification({"classification_mode": "llm"}) == "extract_action_items"
    assert route_after_llm_classification({"classification_mode": "llm_failed"}) == "classify_with_heuristics"

    assert route_after_action_items({"llm_enabled_for_run": True}) == "summary_with_llm"
    assert route_after_action_items({"llm_enabled_for_run": False}) == "summary_with_heuristics"

    assert route_after_llm_summary({"summary_mode": "llm"}) == "save_run"
    assert route_after_llm_summary({"summary_mode": "llm_failed"}) == "summary_with_heuristics"
