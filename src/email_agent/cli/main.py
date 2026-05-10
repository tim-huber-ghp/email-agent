"""CLI entrypoint."""

from datetime import date

import typer

from email_agent.config import get_settings
from email_agent.graph.workflow import run_workflow

app = typer.Typer(help="Email summary agent CLI.")


@app.command()
def summarize() -> None:
    """Run a placeholder summary flow."""

    settings = get_settings()
    state = run_workflow({"provider": "mock", "run_date": date.today().isoformat()})
    typer.echo(f"Environment: {settings.env}")
    typer.echo(f"Provider: {state.get('provider', 'unknown')}")
    typer.echo("Workflow scaffold is ready.")


if __name__ == "__main__":
    app()
