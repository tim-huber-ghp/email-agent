from pathlib import Path

from email_agent.evaluation import load_evaluation_examples, run_heuristic_evaluation


def test_load_evaluation_examples_reads_dataset() -> None:
    examples = load_evaluation_examples(Path("data/eval/labeled_emails.json"))

    assert len(examples) >= 8
    assert examples[0].expected_label == "urgent"


def test_run_heuristic_evaluation_returns_metrics_and_mismatches() -> None:
    report = run_heuristic_evaluation(Path("data/eval/labeled_emails.json"))

    assert report.total_examples >= 8
    assert 0 <= report.label_accuracy <= 1
    assert report.important_email.true_positives >= 1
    assert report.deadline_extraction.true_positives >= 1
    assert report.meeting_extraction.true_positives >= 1
    assert report.subscription_extraction.true_positives >= 1
    assert isinstance(report.mismatches, list)
