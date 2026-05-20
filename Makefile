.PHONY: api webde-list-folders run-gmail run-webde run-mock run-mock-fast run-eval prepare-real-eval prepare-real-gmail-eval prepare-real-webde-eval finalize-real-eval frontend

api:
	.venv/bin/python -m email_agent.cli.main serve-api

webde-list-folders:
	.venv/bin/python -m email_agent.cli.main webde-list-folders

# Example: make run-gmail DATE=2026-05-19
run-gmail:
	.venv/bin/python -m email_agent.cli.main summarize --provider gmail $(if $(DATE),--run-date $(DATE),)

# Example: make run-webde DATE=2026-05-19
run-webde:
	.venv/bin/python -m email_agent.cli.main summarize --provider webde $(if $(DATE),--run-date $(DATE),)

# Example: make run-mock DATE=2026-05-19
run-mock:
	.venv/bin/python -m email_agent.cli.main summarize --provider mock $(if $(DATE),--run-date $(DATE),)

run-mock-fast:
	EMAIL_AGENT_USE_LLM=false .venv/bin/python -m email_agent.cli.main summarize --provider mock $(if $(DATE),--run-date $(DATE),)

run-eval:
	.venv/bin/python -m email_agent.cli.main evaluate

prepare-real-eval:
	.venv/bin/python -m email_agent.cli.main prepare-real-eval $(if $(DATE),--run-date $(DATE),)

# Example: make prepare-real-gmail-eval DATE=2026-05-19
prepare-real-gmail-eval:
	.venv/bin/python -m email_agent.cli.main prepare-real-gmail-eval $(if $(DATE),--run-date $(DATE),)

# Example: make prepare-real-webde-eval DATE=2026-05-19
prepare-real-webde-eval:
	.venv/bin/python -m email_agent.cli.main prepare-real-webde-eval $(if $(DATE),--run-date $(DATE),)

finalize-real-eval:
	@printf "Usage: .venv/bin/python -m email_agent.cli.main finalize-real-eval --draft data/eval/drafts/real_email_candidates_<provider>_<YYYY-MM-DD>.json\n"

frontend:
	cd frontend && npm run dev
