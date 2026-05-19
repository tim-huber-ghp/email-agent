# Email Agent

An end-to-end Gmail email summary agent built with Python, LangGraph, and React.

I built this project to turn daily email overload into a short, actionable summary, with structured signals such as subscriptions, deadlines, and follow-ups.

It reads daily emails, classifies what matters, extracts structured signals such as deadlines and subscriptions, and saves inspectable run artifacts that power a small dashboard and local API.

## Why This Project

This project is designed as a small but credible AI product:

- real Gmail OAuth integration
- LangGraph workflow orchestration
- hybrid heuristic and LLM classification paths
- structured extraction for deadlines, meetings, and subscriptions
- evaluation on synthetic and anonymized real-email datasets
- React frontend backed by a local Python API and persisted run artifacts

## Current Features

- Gmail read-only integration via Google OAuth
- mock provider for safe local demos
- LangGraph workflow with fallback routing
- heuristic classification and extraction
- optional Gemini or OpenAI classification and summary generation
- LLM guardrails with confidence thresholds and fallback handling
- localized output in English or German
- persisted run artifacts under `data/runs/YYYY-MM-DD/`
- frontend dashboard for reviewing saved runs
- frontend-triggered runs with provider and date selection
- frontend interface language switch between English and German
- offline evaluation harness with:
  - easy curated dataset
  - harder synthetic dataset
  - adversarial dataset
  - anonymized real-email dataset support

## Architecture

High-level flow:

1. fetch emails from `gmail` or `mock`
2. normalize to a shared email schema
3. filter low-value messages
4. classify importance with heuristics or an LLM
5. apply guardrails and fallback logic when needed
6. extract:
   - action items
   - deadlines
   - meetings
   - recurring subscriptions
7. generate the daily summary
8. persist structured artifacts
9. serve saved runs and run triggers through a local Python API
10. render and launch runs from the frontend

Main modules:

```text
src/email_agent/
  cli/         # commands
  config.py    # env-backed settings
  evaluation.py
  graph/       # LangGraph workflow
  models/      # typed schemas
  prompts/     # LLM prompts
  providers/   # gmail + mock
  services/    # heuristics, extraction, llm logic
  storage/     # persisted run artifacts

frontend/      # React + Vite dashboard
src/email_agent/api/  # local HTTP API for runs + artifacts
data/          # runs, auth, eval datasets, reports
tests/         # regression coverage
```

## Quick Start

### 1. Setup

From the repo root:

```bash
python -m venv .venv
.venv/bin/pip install -e '.[dev]'
cp .env.example .env
```

### 2. Run the mock flow

```bash
make run-mock
```

Or without LLM usage:

```bash
make run-mock-fast
```

### 3. Start the API and frontend

In one terminal, start the Python API:

```bash
make api
```

In a second terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Common Commands

Use these from the repo root:

```bash
make api
make run-gmail
make run-mock
make run-mock-fast
make run-eval
make prepare-real-eval
make finalize-real-eval
make frontend
```

Equivalent direct commands are available via:

```bash
.venv/bin/python -m email_agent.cli.main --help
```

## Gmail Setup

To use real Gmail data:

1. Enable the Gmail API in Google Cloud.
2. Create a Desktop OAuth client.
3. Download the OAuth client JSON and save it as:
   - `./credentials.json`
   - or set `GMAIL_CREDENTIALS_FILE` in `.env`
4. Run:

```bash
.venv/bin/python -m email_agent.cli.main gmail-auth
```

5. Then summarize real Gmail mail:

```bash
.venv/bin/python -m email_agent.cli.main summarize --provider gmail
```

The Gmail token is stored locally at:

```text
data/auth/gmail_token.json
```

## LLM Setup

The app supports:

- `gemini`
- `openai`

Example `.env` settings:

```env
EMAIL_AGENT_USE_LLM=true
EMAIL_AGENT_LLM_PROVIDER=gemini
EMAIL_AGENT_MODEL=gemini-2.5-flash
GOOGLE_API_KEY=your_key_here
```

For cheaper runs:

```env
EMAIL_AGENT_USE_LLM=true
EMAIL_AGENT_USE_LLM_CLASSIFICATION=false
EMAIL_AGENT_USE_LLM_SUMMARY=true
```

This keeps heuristic classification but still uses an LLM for the final summary.

## Frontend

The frontend lives in `frontend/` and talks to a small Python API that:

- lists saved runs from `data/runs/`
- loads a single saved run for inspection
- triggers a new summary run from the dashboard

It currently shows:

- summary headline and overview
- frontend trigger controls for provider and run date
- important emails
- action items
- deadlines
- meetings
- recurring charges
- frontend interface language switch
- technical metadata behind a toggle
- workflow / guardrail details on demand

To run:

```bash
make api

cd frontend
npm run dev
```

To build:

```bash
cd frontend
npm run build
```

## Evaluation

The project includes multiple evaluation paths.

### Built-in datasets

- `data/eval/labeled_emails.json`
- `data/eval/labeled_emails_hard.json`
- `data/eval/labeled_emails_adversarial.json`

Run evaluation:

```bash
.venv/bin/python -m email_agent.cli.main evaluate
```

Or explicitly:

```bash
.venv/bin/python -m email_agent.cli.main evaluate \
  --dataset data/eval/labeled_emails_adversarial.json \
  --mode heuristic
```

### Real-email evaluation flow

1. export anonymized Gmail examples:

```bash
make prepare-real-eval
```

2. review the generated draft in:

```text
data/eval/drafts/
```

3. finalize it into the labeled eval schema:

```bash
make finalize-real-eval
```

4. evaluate the finalized dataset:

```bash
.venv/bin/python -m email_agent.cli.main evaluate \
  --dataset data/eval/labeled_emails_real_<YYYY-MM-DD>.json \
  --mode both
```

This gives you a realistic comparison between heuristics and LLM classification on anonymized real examples.

## Saved Artifacts

Each run writes local artifacts such as:

```text
data/runs/YYYY-MM-DD/
  summary.json
  summary.txt
  emails.json
  assessments.json
  deadlines.json
  meetings.json
  subscriptions.json
  run_metadata.json
```

This makes the workflow easy to inspect and powers the frontend through the local Python API.

## Privacy And Security

This project processes private email data locally.

Important notes:

- do not commit `.env`
- do not commit Gmail OAuth credentials
- do not commit Gmail tokens
- be careful with `data/runs/` if it contains real inbox content
- keep `data/eval/drafts/` local only
- keep `data/eval/labeled_emails_real_*.json` local unless you intentionally curate a sharable version
- use anonymized real-email exports only after reviewing them for residual personal or company-specific context

Before sharing the repo publicly, rotate any real API keys that may have been placed in local config files.

## Known Limitations

- classification quality is still rule-heavy and tuned to current datasets
- LLM behavior depends strongly on prompt design and label policy
- the real Gmail flow is local-only and single-user
- there is no hosted backend or multi-user deployment path yet
- some UI and CLI polish is still oriented toward a portfolio project rather than a full product

## Demo Path

The fastest way to demo the project:

1. authenticate Gmail
2. start the API and frontend
3. trigger a summary from the frontend or the CLI
4. open the latest saved run
5. inspect:
   - summary
   - important emails
   - deadlines / subscriptions
   - fallback and guardrail metadata

This gives a compact but strong walkthrough of:

- API integration
- workflow orchestration
- AI + heuristics tradeoffs
- evaluation
- frontend presentation
