"""CLI entrypoint."""

from datetime import date
from pathlib import Path

import typer

from email_agent.config import get_settings
from email_agent.graph.workflow import run_workflow

app = typer.Typer(help="Email summary agent CLI.", no_args_is_help=True)


def _label(english: str, german: str, is_german: bool) -> str:
    return german if is_german else english


@app.callback()
def main() -> None:
    """Email summary agent commands."""


@app.command()
def summarize(run_date: str | None = None) -> None:
    """Run the mock summary flow."""

    settings = get_settings()
    target_date = run_date or date.today().isoformat()
    state = run_workflow({"provider": "mock", "run_date": target_date}, settings)
    summary = state["summary"]
    run_dir = Path(state["persisted_run_dir"])
    is_german = settings.language == "de"

    typer.echo(f"{_label('Environment', 'Umgebung', is_german)}: {settings.env}")
    typer.echo(f"{_label('Provider', 'Anbieter', is_german)}: {state.get('provider', 'unknown')}")
    typer.echo(f"{_label('Date', 'Datum', is_german)}: {target_date}")
    typer.echo(
        f"{_label('LLM enabled', 'LLM aktiviert', is_german)}: "
        f"{'ja' if is_german and settings.use_llm else 'nein' if is_german else 'yes' if settings.use_llm else 'no'}"
    )
    typer.echo(f"{_label('LLM provider', 'LLM-Anbieter', is_german)}: {settings.llm_provider}")
    typer.echo(f"{_label('Language', 'Sprache', is_german)}: {settings.language}")
    typer.echo(
        f"{_label('Classification mode', 'Klassifizierungsmodus', is_german)}: "
        f"{state.get('classification_mode', 'unknown')}"
    )
    typer.echo(
        f"{_label('Summary mode', 'Zusammenfassungsmodus', is_german)}: "
        f"{state.get('summary_mode', 'unknown')}"
    )

    if state.get("classification_error"):
        typer.echo(
            f"{_label('Classification fallback reason', 'Grund fuer Klassifizierungs-Fallback', is_german)}: "
            f"{state['classification_error']}"
        )
    if state.get("summary_error"):
        typer.echo(
            f"{_label('Summary fallback reason', 'Grund fuer Zusammenfassungs-Fallback', is_german)}: "
            f"{state['summary_error']}"
        )

    typer.echo("")
    typer.echo(summary.headline)
    typer.echo(summary.overview)

    if summary.action_items:
        typer.echo("")
        typer.echo(_label("Action items:", "Naechste Schritte:", is_german))
        for item in summary.action_items:
            typer.echo(f"- {item.description}")

    typer.echo("")
    typer.echo(
        f"{_label('Saved run artifacts to', 'Gespeicherte Laufdateien unter', is_german)}: {run_dir}"
    )


if __name__ == "__main__":
    app()
