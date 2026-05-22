.PHONY: install-dev frontend-install lint test frontend-check check api webde-list-folders run-gmail run-webde run-mock run-mock-fast run-eval prepare-real-eval prepare-real-gmail-eval prepare-real-webde-eval finalize-real-eval frontend

PYTHON := .venv/bin/python
PIP := .venv/bin/pip

install-dev:
	python -m venv .venv
	$(PIP) install -e '.[dev]'

frontend-install:
	cd frontend && npm ci

lint:
	$(PYTHON) -m ruff check .

test:
	$(PYTHON) -m pytest

frontend-check:
	cd frontend && npm run check

check: lint test frontend-check

api:
	$(PYTHON) -m email_agent.cli.main serve-api

webde-list-folders:
	$(PYTHON) -m email_agent.cli.main webde-list-folders

# Example: make run-gmail DATE=2026-05-19
run-gmail:
	$(PYTHON) -m email_agent.cli.main summarize --provider gmail $(if $(DATE),--run-date $(DATE),)

# Example: make run-webde DATE=2026-05-19
run-webde:
	$(PYTHON) -m email_agent.cli.main summarize --provider webde $(if $(DATE),--run-date $(DATE),)

# Example: make run-mock DATE=2026-05-19
run-mock:
	$(PYTHON) -m email_agent.cli.main summarize --provider mock $(if $(DATE),--run-date $(DATE),)

run-mock-fast:
	EMAIL_AGENT_USE_LLM=false $(PYTHON) -m email_agent.cli.main summarize --provider mock $(if $(DATE),--run-date $(DATE),)

run-eval:
	$(PYTHON) -m email_agent.cli.main evaluate

prepare-real-eval:
	$(PYTHON) -m email_agent.cli.main prepare-real-eval $(if $(DATE),--run-date $(DATE),)

# Example: make prepare-real-gmail-eval DATE=2026-05-19
prepare-real-gmail-eval:
	$(PYTHON) -m email_agent.cli.main prepare-real-gmail-eval $(if $(DATE),--run-date $(DATE),)

# Example: make prepare-real-webde-eval DATE=2026-05-19
prepare-real-webde-eval:
	$(PYTHON) -m email_agent.cli.main prepare-real-webde-eval $(if $(DATE),--run-date $(DATE),)

finalize-real-eval:
	@printf "Usage: .venv/bin/python -m email_agent.cli.main finalize-real-eval --draft data/eval/drafts/real_email_candidates_<provider>_<YYYY-MM-DD>.json\n"

frontend:
	cd frontend && npm run dev
