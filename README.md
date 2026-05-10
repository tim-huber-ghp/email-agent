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

1. Create a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env`.
4. Run the CLI once the first workflow is implemented.

## Repository Layout

```text
src/email_agent/
tests/
data/
scripts/
frontend/
```

More detailed requirements and planning live in [agents.md](./agents.md).
