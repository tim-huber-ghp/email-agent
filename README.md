# Email Agent

A LangGraph-based Python project that reads emails, identifies important messages, and generates an end-of-day summary.

## Planned MVP

- Gmail as the first provider
- Local CLI workflow
- Mock email provider for early development
- Importance classification and action item extraction
- Daily summary output saved locally

## Tech Stack

- Python
- LangGraph
- Pydantic
- Pytest
- Ruff
- Optional React frontend later

## Quick Start

1. Create a virtual environment: `.venv/bin/python -m venv .venv` or `python -m venv .venv`
2. Install dependencies: `.venv/bin/pip install -e '.[dev]'`
3. Copy `.env.example` to `.env`
4. Run the mock workflow: `.venv/bin/python -m email_agent.cli.main summarize --run-date 2026-05-10`

## Repository Layout

```text
src/email_agent/
tests/
data/
scripts/
frontend/
```

More detailed requirements and planning live in [agents.md](./agents.md).

## Current Status

The project can already:

- load sample emails from `data/fixtures/mock_emails.json`
- run a LangGraph workflow over those emails
- classify likely important messages with simple heuristics
- print a daily summary in the terminal
- save run artifacts under `data/runs/YYYY-MM-DD/`

It can also use an OpenAI model for classification and summary generation when:

- `OPENAI_API_KEY` is set
- `EMAIL_AGENT_USE_LLM=true`

It can also use Gemini when:

- `GOOGLE_API_KEY` is set
- `EMAIL_AGENT_USE_LLM=true`
- `EMAIL_AGENT_LLM_PROVIDER=gemini`
