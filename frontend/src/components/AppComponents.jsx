import { useEffect, useRef, useState } from "react";

export function EmailDetailContent({ selectedEmailDetail, ui, buildEmailHtmlDocument }) {
  const [contentView, setContentView] = useState(selectedEmailDetail.bodyHtml ? "html" : "text");

  useEffect(() => {
    setContentView(selectedEmailDetail.bodyHtml ? "html" : "text");
  }, [selectedEmailDetail.id, selectedEmailDetail.bodyHtml]);

  return (
    <div className="sheet-stack">
      <div className="email-detail-header">
        <span className={`tag tag-${selectedEmailDetail.tag.replace(/\s+/g, "-")}`}>
          {selectedEmailDetail.tag}
        </span>
        <span className="summary-subtle">{selectedEmailDetail.receivedAt}</span>
      </div>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.subject}</span>
        <h3>{selectedEmailDetail.subject}</h3>
      </div>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.senderLabel}</span>
        <p className="sheet-summary">{selectedEmailDetail.sender}</p>
      </div>

      <dl className="email-detail-grid">
        <div>
          <dt>{ui.importanceScore}</dt>
          <dd>{selectedEmailDetail.importanceScore}</dd>
        </div>
        <div>
          <dt>{ui.needsAction}</dt>
          <dd>{selectedEmailDetail.needsAction}</dd>
        </div>
        <div>
          <dt>{ui.confidence}</dt>
          <dd>{selectedEmailDetail.confidenceScore}</dd>
        </div>
        <div>
          <dt>{ui.receivedAt}</dt>
          <dd>{selectedEmailDetail.receivedAt}</dd>
        </div>
      </dl>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.reason}</span>
        <p className="sheet-summary">{selectedEmailDetail.reason}</p>
      </div>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.bodyPreview}</span>
        {selectedEmailDetail.bodyHtml ? (
          <div className="email-view-toggle-row">
            <button
              type="button"
              className={`email-view-toggle ${contentView === "text" ? "email-view-toggle-active" : ""}`}
              onClick={() => setContentView("text")}
            >
              {ui.textView}
            </button>
            <button
              type="button"
              className={`email-view-toggle ${contentView === "html" ? "email-view-toggle-active" : ""}`}
              onClick={() => setContentView("html")}
            >
              {ui.htmlView}
            </button>
          </div>
        ) : null}
        {contentView === "html" && selectedEmailDetail.bodyHtml ? (
          <div className="email-html-view">
            <span className="section-kicker">{ui.originalEmail}</span>
            <iframe
              className="email-html-frame"
              sandbox=""
              srcDoc={buildEmailHtmlDocument(selectedEmailDetail.bodyHtml)}
              title={selectedEmailDetail.subject}
            />
          </div>
        ) : (
          <div className="email-text-view">
            <p className="sheet-summary email-text-view-copy">
              {selectedEmailDetail.bodyPreview
                || (selectedEmailDetail.bodyHtml ? ui.noHtmlBody : ui.noBodyPreview)}
            </p>
          </div>
        )}
      </div>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.uncertainty}</span>
        <p className="sheet-summary">
          {selectedEmailDetail.uncertaintyNote || ui.noUncertainty}
        </p>
      </div>
    </div>
  );
}

export function EmptyTabPlaceholder({ title, body }) {
  return (
    <section className="inspect-empty-state">
      <span className="section-kicker">Info</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  );
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  shellClassName = "",
  buttonClassName = "",
  menuClassName = "",
  optionClassName = "",
  activeOptionClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const buttonRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
        buttonRef.current?.blur();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.blur();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`select-shell ${shellClassName} ${isOpen ? "select-shell-open" : ""}`.trim()} ref={selectRef}>
      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="select-button-value">{selectedOption?.label ?? ""}</span>
        <span className="run-picker-caret" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className={menuClassName} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`${optionClassName} ${option.value === value ? activeOptionClassName : ""}`.trim()}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                buttonRef.current?.blur();
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RunLauncher({
  ui,
  runProvider,
  setRunProvider,
  triggerDate,
  setTriggerDate,
  isRunning,
  onRun,
  error,
  message,
  compact = false,
}) {
  const providerOptions = [
    { value: "mock", label: ui.mockLabel },
    { value: "gmail", label: ui.gmailLabel },
    { value: "webde", label: ui.webdeLabel },
  ];

  return (
    <div className={`run-launcher ${compact ? "run-launcher-compact" : ""}`}>
      {!compact ? (
        <div className="run-launcher-copy">
          <span className="section-kicker">{ui.runAgent}</span>
          <h3>{ui.runAgentTitle}</h3>
          <p>{ui.runAgentHint}</p>
        </div>
      ) : null}

      <div className="run-launcher-controls">
        <div className="run-picker">
          <span>{ui.runProvider}</span>
          <CustomSelect
            value={runProvider}
            options={providerOptions}
            onChange={setRunProvider}
            ariaLabel={ui.runProvider}
            buttonClassName="run-picker-select"
            menuClassName="run-picker-menu"
            optionClassName="run-picker-option"
            activeOptionClassName="run-picker-option-active"
          />
        </div>

        <label className="run-picker">
          <span>{ui.runDate}</span>
          <div className="date-input-shell">
            <input
              type="date"
              value={triggerDate}
              onChange={(event) => setTriggerDate(event.target.value)}
              onClick={(event) => event.currentTarget.showPicker?.()}
              onFocus={(event) => event.currentTarget.showPicker?.()}
            />
            <span className="date-input-icon" aria-hidden="true">📅</span>
          </div>
        </label>

        <button type="button" className="run-trigger-button" onClick={onRun} disabled={isRunning}>
          {isRunning ? ui.runningRun : ui.runNow}
        </button>
      </div>

      {error ? <p className="signal-feedback signal-feedback-error">{error}</p> : null}
      {!error && message ? <p className="signal-feedback">{message}</p> : null}
    </div>
  );
}

export function ReviewItemCard({
  item,
  ui,
  isSaving,
  onReview,
  formatReviewedValue,
  buildCorrectionPlaceholder,
}) {
  const [isCorrecting, setIsCorrecting] = useState(item.reviewStatus === "corrected");
  const [correctionText, setCorrectionText] = useState(formatReviewedValue(item.reviewedValue));
  const [reviewerNote, setReviewerNote] = useState(item.reviewerNote ?? "");

  useEffect(() => {
    setIsCorrecting(item.reviewStatus === "corrected");
    setCorrectionText(formatReviewedValue(item.reviewedValue));
    setReviewerNote(item.reviewerNote ?? "");
  }, [formatReviewedValue, item.id, item.reviewStatus, item.reviewedValue, item.reviewerNote]);

  return (
    <article className="review-card">
      <div className="review-card-topline">
        <span className={`tag tag-${item.itemType.replace(/_/g, "-")}`}>{item.itemTypeLabel}</span>
        <span className={`review-status-pill review-status-${item.reviewStatus}`}>
          {item.reviewStatusLabel}
        </span>
      </div>

      <div className="review-card-body">
        <h4>{item.title || item.description}</h4>
        {item.description && item.description !== item.title ? <p>{item.description}</p> : null}
        {item.detailLines.length > 0 ? (
          <ul className="review-detail-list">
            {item.detailLines.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <dl className="review-meta-grid">
        <div>
          <dt>{ui.confidence}</dt>
          <dd>{item.confidenceLabel}</dd>
        </div>
        <div>
          <dt>{ui.reviewStatus}</dt>
          <dd>{item.reviewStatusLabel}</dd>
        </div>
      </dl>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.reason}</span>
        <p className="sheet-summary">{item.confidenceReason || ui.unknown}</p>
      </div>

      <div className="email-detail-block">
        <span className="section-kicker">{ui.sourceEvidence}</span>
        <p className="sheet-summary">{item.evidenceText || ui.noPreview}</p>
      </div>

      {item.reviewedValue ? (
        <div className="email-detail-block">
          <span className="section-kicker">{ui.correctedValue}</span>
          <p className="sheet-summary">
            {formatReviewedValue(item.reviewedValue) || ui.noCorrectedValue}
          </p>
        </div>
      ) : null}

      <div className="review-action-row">
        <button
          type="button"
          className="review-action-button review-action-button-confirm"
          disabled={isSaving}
          onClick={() =>
            onReview(item.id, {
              review_status: "confirmed",
              reviewer_note: reviewerNote,
            })
          }
        >
          {ui.confirm}
        </button>
        <button
          type="button"
          className="review-action-button review-action-button-reject"
          disabled={isSaving}
          onClick={() =>
            onReview(item.id, {
              review_status: "rejected",
              reviewer_note: reviewerNote,
            })
          }
        >
          {ui.reject}
        </button>
        <button
          type="button"
          className="review-action-button review-action-button-correct"
          disabled={isSaving}
          onClick={() => setIsCorrecting((current) => !current)}
        >
          {ui.correct}
        </button>
      </div>

      <div className="review-action-help-grid">
        <p className="review-action-help">{ui.rejectHelp}</p>
        <p className="review-action-help">{ui.correctHelp}</p>
      </div>

      <label className="review-note-field">
        <span>{ui.reviewerNote}</span>
        <textarea
          value={reviewerNote}
          onChange={(event) => setReviewerNote(event.target.value)}
          placeholder={ui.reviewerNotePlaceholder}
          rows={2}
        />
      </label>

      {isCorrecting ? (
        <div className="review-correction-panel">
          <p className="review-help-text">{ui.correctionHelp}</p>
          <label className="review-note-field">
            <span>{ui.correctionLabel}</span>
            <textarea
              value={correctionText}
              onChange={(event) => setCorrectionText(event.target.value)}
              placeholder={buildCorrectionPlaceholder(item, ui)}
              rows={3}
            />
          </label>
          <button
            type="button"
            className="run-trigger-button review-save-button"
            disabled={isSaving || !correctionText.trim()}
            onClick={() =>
              onReview(item.id, {
                review_status: "corrected",
                reviewed_value: { corrected_text: correctionText.trim() },
                reviewer_note: reviewerNote,
              })
            }
          >
            {isSaving ? ui.runningRun : ui.saveCorrection}
          </button>
        </div>
      ) : null}
    </article>
  );
}
