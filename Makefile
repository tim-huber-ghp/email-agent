.PHONY: run-gmail run-mock run-mock-fast run-eval prepare-real-eval finalize-real-eval frontend

run-gmail:
	.venv/bin/python -m email_agent.cli.main summarize --provider gmail

run-mock:
	.venv/bin/python -m email_agent.cli.main summarize --provider mock --run-date 2026-05-10

run-mock-fast:
	EMAIL_AGENT_USE_LLM=false .venv/bin/python -m email_agent.cli.main summarize --provider mock --run-date 2026-05-10

run-eval:
	.venv/bin/python -m email_agent.cli.main evaluate

prepare-real-eval:
	.venv/bin/python -m email_agent.cli.main prepare-real-eval

finalize-real-eval:
	.venv/bin/python -m email_agent.cli.main finalize-real-eval --draft data/eval/drafts/real_email_candidates_2026-05-12.json

frontend:
	cd frontend && npm run dev
