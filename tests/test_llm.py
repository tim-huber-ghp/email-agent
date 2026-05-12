from datetime import datetime

from email_agent.config import Settings
from email_agent.models.email import EmailAssessment, NormalizedEmail
from email_agent.prompts.email_prompts import classification_messages
from email_agent.services import llm


def _email(email_id: str) -> NormalizedEmail:
    return NormalizedEmail(
        id=email_id,
        source="evaluation",
        sender="sender@example.com",
        subject=f"Subject {email_id}",
        received_at=datetime.fromisoformat("2026-05-10T09:00:00"),
        snippet="Snippet",
        body_preview="Body preview",
        labels=[],
    )


def test_classification_prompt_contains_priority_guidance() -> None:
    messages = classification_messages([_email("msg-1")])
    system_prompt = messages[0]["content"]

    assert "Choose meeting over needs_reply" in system_prompt
    assert "Choose finance over urgent" in system_prompt
    assert "'Your free trial ends tomorrow' -> finance" in system_prompt
    assert "needs_action guidance" in system_prompt
    assert "prefer needs_action=true" in system_prompt
    assert "importance_score >= 50" in system_prompt
    assert "urgent: usually 80-100" in system_prompt
    assert "confidence_score from 0 to 100" in system_prompt
    assert "Set abstained=true" in system_prompt


def test_classify_emails_with_llm_batches_large_inputs(monkeypatch) -> None:
    calls: list[list[str]] = []

    def fake_classify_batch(emails: list[NormalizedEmail], settings: Settings) -> list[EmailAssessment]:
        calls.append([email.id for email in emails])
        return [
            EmailAssessment(
                email_id=email.id,
                label="info",
                importance_score=40,
                reason="Test classification.",
                needs_action=False,
            )
            for email in emails
        ]

    monkeypatch.setattr(llm, "_classify_email_batch_with_llm", fake_classify_batch)

    settings = Settings(
        EMAIL_AGENT_ENV="test",
        EMAIL_AGENT_DATA_DIR="./data",
        EMAIL_AGENT_MODEL="test-model",
        EMAIL_AGENT_USE_LLM=True,
        EMAIL_AGENT_LLM_PROVIDER="openai",
        EMAIL_AGENT_USE_LLM_CLASSIFICATION=True,
        OPENAI_API_KEY="test-key",
        EMAIL_AGENT_LLM_MAX_EMAILS=2,
    )
    emails = [_email("msg-1"), _email("msg-2"), _email("msg-3"), _email("msg-4"), _email("msg-5")]

    assessments = llm.classify_emails_with_llm(emails, settings)

    assert len(assessments) == 5
    assert [assessment.email_id for assessment in assessments] == [email.id for email in emails]
    assert calls == [["msg-1", "msg-2"], ["msg-3", "msg-4"], ["msg-5"]]
