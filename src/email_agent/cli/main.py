"""CLI entrypoint."""

from datetime import date
from pathlib import Path

import typer

from email_agent.config import get_settings
from email_agent.graph.workflow import run_workflow

app = typer.Typer(help="Email summary agent CLI.", no_args_is_help=True)


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

    typer.echo(f"Environment: {settings.env}")
    typer.echo(f"Provider: {state.get('provider', 'unknown')}")
    typer.echo(f"Date: {target_date}")
    typer.echo(f"LLM enabled: {'yes' if settings.use_llm else 'no'}")
    typer.echo(f"LLM provider: {settings.llm_provider}")
    typer.echo(f"Classification mode: {state.get('classification_mode', 'unknown')}")
    typer.echo(f"Summary mode: {state.get('summary_mode', 'unknown')}")

    if state.get("classification_error"):
        typer.echo(f"Classification fallback reason: {state['classification_error']}")
    if state.get("summary_error"):
        typer.echo(f"Summary fallback reason: {state['summary_error']}")

    typer.echo("")
    typer.echo(summary.headline)
    typer.echo(summary.overview)

    if summary.action_items:
        typer.echo("")
        typer.echo("Action items:")
        for item in summary.action_items:
            typer.echo(f"- {item.description}")

    typer.echo("")
    typer.echo(f"Saved run artifacts to: {run_dir}")


if __name__ == "__main__":
    app()
