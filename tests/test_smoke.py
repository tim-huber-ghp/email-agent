from email_agent.graph.workflow import run_workflow


def test_workflow_returns_state() -> None:
    initial_state = {"provider": "mock", "run_date": "2026-05-10"}

    result = run_workflow(initial_state)

    assert result["provider"] == "mock"
