from email_agent.config import Settings
from email_agent.graph.workflow import run_workflow


def test_workflow_returns_state() -> None:
    settings = Settings(
        EMAIL_AGENT_DATA_DIR="./data",
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_MODEL="test-model",
    )
    initial_state = {"provider": "mock", "run_date": "2026-05-10"}

    result = run_workflow(initial_state, settings)

    assert result["provider"] == "mock"
    assert result["summary"].important_email_ids
    assert result["persisted_run_dir"].endswith("2026-05-10")
