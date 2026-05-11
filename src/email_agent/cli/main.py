"""CLI entrypoint."""

from datetime import date
from pathlib import Path
import warnings

try:
    from langchain_core._api.deprecation import LangChainPendingDeprecationWarning
except Exception:  # pragma: no cover - defensive import fallback
    LangChainPendingDeprecationWarning = Warning

warnings.filterwarnings(
    "ignore",
    message=r"The default value of `allowed_objects` will change in a future version\..*",
    category=LangChainPendingDeprecationWarning,
    module=r"langgraph\.cache\.base(\..*)?",
)

import typer

from email_agent.config import get_settings
from email_agent.evaluation import run_heuristic_evaluation, save_evaluation_report
from email_agent.graph.workflow import run_workflow
from email_agent.providers.gmail import GmailProvider

app = typer.Typer(help="Email summary agent CLI.", no_args_is_help=True)


def _label(english: str, german: str, is_german: bool) -> str:
    return german if is_german else english


@app.callback()
def main() -> None:
    """Email summary agent commands."""


@app.command()
def summarize(
    run_date: str | None = None,
    provider: str = typer.Option("mock", help="Email provider to use: mock or gmail."),
) -> None:
    """Run the summary flow."""

    settings = get_settings()
    target_date = run_date or date.today().isoformat()
    state = run_workflow({"provider": provider, "run_date": target_date}, settings)
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
    typer.echo(
        f"{_label('LLM classification', 'LLM-Klassifizierung', is_german)}: "
        f"{'ja' if is_german and settings.use_llm_classification else 'nein' if is_german else 'yes' if settings.use_llm_classification else 'no'}"
    )
    typer.echo(
        f"{_label('LLM summary', 'LLM-Zusammenfassung', is_german)}: "
        f"{'ja' if is_german and settings.use_llm_summary else 'nein' if is_german else 'yes' if settings.use_llm_summary else 'no'}"
    )
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


@app.command("gmail-auth")
def gmail_auth() -> None:
    """Run Gmail desktop OAuth and save the token locally."""

    settings = get_settings()
    is_german = settings.language == "de"
    token_path = GmailProvider(settings).authenticate()
    typer.echo(
        f"{_label('Gmail token saved to', 'Gmail-Token gespeichert unter', is_german)}: "
        f"{token_path}"
    )


@app.command()
def evaluate(
    dataset: str = typer.Option(
        "data/eval/labeled_emails.json",
        help="Path to the labeled evaluation dataset.",
    ),
) -> None:
    """Run the offline evaluation harness on labeled emails."""

    settings = get_settings()
    is_german = settings.language == "de"
    dataset_path = Path(dataset)
    report = run_heuristic_evaluation(dataset_path)
    output_path = settings.data_dir / "eval" / "reports" / "heuristic_report.json"
    save_evaluation_report(report, output_path)

    typer.echo(f"{_label('Dataset', 'Datensatz', is_german)}: {dataset_path}")
    typer.echo(f"{_label('Examples', 'Beispiele', is_german)}: {report.total_examples}")
    typer.echo("")
    typer.echo(
        f"{_label('Label accuracy', 'Label-Genauigkeit', is_german)}: "
        f"{report.label_accuracy:.3f}"
    )
    _print_metric(_label("Important email", "Wichtige E-Mails", is_german), report.important_email)
    _print_metric(_label("Needs action", "Aktion noetig", is_german), report.needs_action)
    _print_metric(_label("Deadlines", "Fristen", is_german), report.deadline_extraction)
    _print_metric(_label("Meetings", "Besprechungen", is_german), report.meeting_extraction)
    _print_metric(_label("Subscriptions", "Abos", is_german), report.subscription_extraction)

    if report.mismatches:
        typer.echo("")
        typer.echo(_label("Label mismatches:", "Label-Abweichungen:", is_german))
        for item in report.mismatches[:8]:
            typer.echo(
                f"- {item['subject']}: expected {item['expected_label']}, "
                f"predicted {item['predicted_label']}"
            )

    typer.echo("")
    typer.echo(
        f"{_label('Saved evaluation report to', 'Evaluationsbericht gespeichert unter', is_german)}: "
        f"{output_path}"
    )


def _print_metric(label: str, metric: object) -> None:
    typer.echo(
        f"{label}: "
        f"precision {metric.precision:.3f}, "
        f"recall {metric.recall:.3f}, "
        f"tp {metric.true_positives}, fp {metric.false_positives}, fn {metric.false_negatives}"
    )


if __name__ == "__main__":
    app()
