import {
  CustomSelect,
  EmailDetailContent,
  EmptyTabPlaceholder,
  ReviewItemCard,
  RunLauncher,
} from "./AppComponents";

export function BriefModeView({
  ui,
  dashboardData,
  selectedRunDate,
  runSelectOptions,
  onRunChange,
  runProvider,
  setRunProvider,
  triggerDate,
  setTriggerDate,
  isRunning,
  onRunTrigger,
  runActionError,
  runActionMessage,
  hasInboxMessages,
  hasActions,
  hasDeadlines,
  hasMeetings,
  hasSubscriptions,
  isBriefMostlyEmpty,
  onOpenEmailList,
  onOpenEmail,
}) {
  return (
    <>
      <header className="hero-card">
        <div className="hero-grid hero-grid-briefing">
          <div className="hero-main-stack hero-main-stack-brief">
            <div className="hero-brief-topline">
              <div>
                <div className="signal-label">{ui.signalLabel}</div>
                <div className="signal-date">{dashboardData.dateLabel}</div>
              </div>
            </div>

            <h1>{ui.briefHeadline}</h1>

            <div className="brief-run-meta">
              <label className="run-picker run-picker-brief">
                <span>{ui.savedRun}</span>
                <CustomSelect
                  value={selectedRunDate}
                  options={runSelectOptions}
                  onChange={onRunChange}
                  ariaLabel={ui.savedRun}
                  shellClassName="run-picker-shell-brief"
                  buttonClassName="run-picker-select run-picker-select-brief"
                  menuClassName="run-picker-menu"
                  optionClassName="run-picker-option"
                  activeOptionClassName="run-picker-option-active"
                />
              </label>
              <p className="brief-run-count">
                {ui.emailCountFound(dashboardData.metadata.emailCount)}
              </p>
            </div>
          </div>

          <section className="hero-stats-panel">
            <div className="signal-section-header">
              <div>
                <span className="section-kicker">{ui.runOverview}</span>
              </div>
            </div>
            <div className="hero-stat-row">
              {dashboardData.stats.map((stat) => (
                <article className="hero-stat-card" key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <div className="hero-summary-frame">
            <p className="hero-copy">{dashboardData.overview}</p>
          </div>

          <section className="signal-section signal-section-emphasis hero-launch-section">
            <div className="signal-section-header">
              <div>
                <span className="section-kicker">{ui.newRun}</span>
                <p className="signal-section-copy">{ui.launchHint}</p>
              </div>
            </div>

            <RunLauncher
              ui={ui}
              runProvider={runProvider}
              setRunProvider={setRunProvider}
              triggerDate={triggerDate}
              setTriggerDate={setTriggerDate}
              isRunning={isRunning}
              onRun={onRunTrigger}
              error={runActionError}
              message={runActionMessage}
              compact
            />
          </section>
        </div>
      </header>

      <main className="brief-stack">
        <section className="brief-grid">
          <div className="dashboard-column dashboard-column-primary">
            <section className={`panel panel-spotlight ${!hasInboxMessages ? "panel-empty-quiet" : ""}`}>
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">{ui.inboxFocus}</span>
                  <h2>{ui.importantMessages}</h2>
                </div>
                <div className="panel-heading-actions">
                  <button
                    type="button"
                    className="section-toggle"
                    disabled={!hasInboxMessages}
                    onClick={onOpenEmailList}
                  >
                    {ui.openAllEmails}
                  </button>
                  <span className="section-chip">{dashboardData.dateBadge}</span>
                </div>
              </div>

              {dashboardData.inbox.length > 0 ? (
                <div className="message-list message-list-brief">
                  {dashboardData.inbox.map((item) => (
                    <article className="message-card message-card-brief" key={item.id}>
                      <div className="message-topline">
                        <span className="sender">{item.sender}</span>
                        <span className={`tag tag-${item.tag.replace(/\s+/g, "-")}`}>{item.tag}</span>
                      </div>
                      <h3>{item.subject}</h3>
                      <p>{item.summary}</p>
                      <div className="message-reason-block">
                        <span className="message-reason-label">{ui.reasonWhyItMatters}</span>
                        <strong>{item.reason}</strong>
                      </div>
                      <button
                        type="button"
                        className="section-toggle"
                        onClick={() => onOpenEmail(item.id)}
                      >
                        {ui.viewEvidence}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="panel-summary">{ui.noImportantMessages}</p>
              )}
            </section>
          </div>

          <div className="dashboard-column dashboard-column-secondary">
            <section className={`panel panel-emphasis ${!hasActions ? "panel-empty-quiet" : ""}`}>
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">{ui.actionBoard}</span>
                  <h2>{ui.nextSteps}</h2>
                </div>
              </div>

              {dashboardData.actions.length > 0 ? (
                <ol className="action-list action-list-emphasis">
                  {dashboardData.actions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="panel-summary">{ui.noFollowup}</p>
              )}
            </section>
          </div>
        </section>

        <section className={`signal-band ${isBriefMostlyEmpty ? "signal-band-empty" : ""}`}>
          <section className={`panel signal-panel ${!hasDeadlines ? "panel-empty-quiet" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{ui.deadlines}</span>
                <h2>{ui.timeSensitiveItems}</h2>
              </div>
              {!hasDeadlines ? (
                <span className="panel-empty-heading-icon" aria-hidden="true">⏰</span>
              ) : null}
            </div>

            {dashboardData.deadlines.length > 0 ? (
              <ul className="signal-list">
                {dashboardData.deadlines.map((item) => (
                  <li key={`${item.sourceEmailId}-${item.description}`}>
                    <strong>{item.description}</strong>
                    <span>{item.dueHint || ui.noDueHint}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel-empty-copy">
                <p className="panel-summary">{ui.noDeadlines}</p>
              </div>
            )}
          </section>

          <section className={`panel signal-panel ${!hasMeetings ? "panel-empty-quiet" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{ui.meetings}</span>
                <h2>{ui.calendarSignals}</h2>
              </div>
              {!hasMeetings ? (
                <span className="panel-empty-heading-icon" aria-hidden="true">📅</span>
              ) : null}
            </div>

            {dashboardData.meetings.length > 0 ? (
              <ul className="signal-list">
                {dashboardData.meetings.map((item) => (
                  <li key={`${item.sourceEmailId}-${item.title}`}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel-empty-copy">
                <p className="panel-summary">{ui.noMeetings}</p>
              </div>
            )}
          </section>

          <section className={`panel signal-panel ${!hasSubscriptions ? "panel-empty-quiet" : ""}`}>
            <div className="panel-heading">
              <div>
                <span className="section-kicker">{ui.subscriptions}</span>
                <h2>{ui.recurringCharges}</h2>
              </div>
              {!hasSubscriptions ? (
                <span className="panel-empty-heading-icon" aria-hidden="true">🔄</span>
              ) : null}
            </div>

            {dashboardData.subscriptions.length > 0 ? (
              <ul className="signal-list">
                {dashboardData.subscriptions.map((item) => (
                  <li key={`${item.sourceEmailId}-${item.serviceName}`}>
                    <strong>{item.serviceName}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel-empty-copy">
                <p className="panel-summary">{ui.noSubscriptions}</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

export function InspectModeView({
  ui,
  dashboardData,
  selectedRunDate,
  runSelectOptions,
  onRunChange,
  inspectTabs,
  inspectTab,
  setInspectTab,
  activeInspectTabLabel,
  reviewActionError,
  reviewActionMessage,
  savingReviewItemId,
  onReviewUpdate,
  selectedEmailDetail,
  setSelectedEmailId,
  formatReviewedValue,
  buildCorrectionPlaceholder,
  buildEmailHtmlDocument,
}) {
  return (
    <>
      <header className="panel inspect-hero">
        <div className="inspect-hero-top">
          <div>
            <h1 className="inspect-hero-title">{ui.inspectTitle}</h1>
          </div>
          <div className="inspect-hero-status">
            <div className="summary-status-row">
              <span className="summary-status">{dashboardData.executionMode}</span>
              <span className="summary-subtle">{dashboardData.provider}</span>
              <span className="summary-subtle">{dashboardData.language}</span>
            </div>
          </div>
        </div>

        <div className="inspect-hero-grid">
          <div className="inspect-hero-run">
            <label className="run-picker">
              <span>{ui.savedRun}</span>
              <CustomSelect
                value={selectedRunDate}
                options={runSelectOptions}
                onChange={onRunChange}
                ariaLabel={ui.savedRun}
                buttonClassName="run-picker-select"
                menuClassName="run-picker-menu"
                optionClassName="run-picker-option"
                activeOptionClassName="run-picker-option-active"
              />
            </label>
          </div>
        </div>
      </header>

      <main className="inspect-shell">
        <section className="panel inspect-panel">
          <div className="inspect-panel-heading">
            <div className="inspect-heading-copy">
              <span className="section-kicker">{ui.inspectWorkspace}</span>
              <h2>{activeInspectTabLabel}</h2>
            </div>
            <div className="inspect-tab-shell">
              <div className="inspect-tab-row" role="tablist" aria-label={ui.inspectMode}>
                {inspectTabs.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`inspect-tab ${inspectTab === value ? "inspect-tab-active" : ""}`}
                    onClick={() => setInspectTab(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="inspect-panel-body">
            {inspectTab === "run" ? (
              <div className="inspect-run-layout">
                <section className="inspect-section-card inspect-overview-card">
                  <div className="inspect-card-header">
                    <span className="section-kicker">{ui.runOverview}</span>
                  </div>
                  <div className="inspector-mini-grid inspector-mini-grid-wide">
                    {dashboardData.previewMeta.map((item) => (
                      <div key={item.label} className="inspector-mini-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="inspect-section-card inspect-metadata-card">
                  <div className="inspect-card-header">
                    <span className="section-kicker">{ui.technicalMetadata}</span>
                  </div>
                  <dl className="meta-grid meta-grid-inspect">
                    <div><dt>{ui.provider}</dt><dd>{dashboardData.provider}</dd></div>
                    <div><dt>{ui.language}</dt><dd>{dashboardData.language}</dd></div>
                    <div><dt>{ui.llm}</dt><dd>{dashboardData.llmProvider}</dd></div>
                    <div><dt>{ui.execution}</dt><dd>{dashboardData.executionMode}</dd></div>
                    <div><dt>{ui.startedAt}</dt><dd>{dashboardData.metadata.runStartedAt}</dd></div>
                    <div><dt>{ui.completedAt}</dt><dd>{dashboardData.metadata.runCompletedAt}</dd></div>
                    <div><dt>{ui.workflowDuration}</dt><dd>{dashboardData.metadata.workflowDuration}</dd></div>
                    <div><dt>{ui.estimatedCost}</dt><dd>{dashboardData.metadata.estimatedCost}</dd></div>
                  </dl>
                </section>
              </div>
            ) : null}

            {inspectTab === "workflow" ? (
              <div className="sheet-stack">
                <p className="sheet-summary">{ui.workflowSummary}</p>
                <p className="sheet-summary">{ui.stepTimingSummary}</p>
                <div className="timeline">
                  {dashboardData.timeline.map((item) => (
                    <div className="timeline-item" key={item.title}>
                      <div className={`timeline-dot status-${item.status}`} />
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {inspectTab === "review" ? (
              dashboardData.extractedItems.length > 0 ? (
                <div className="sheet-stack">
                  <section className="inspect-section-card">
                    <div className="inspect-card-header">
                      <span className="section-kicker">{ui.reviewPanel}</span>
                      <p className="sheet-summary">{ui.reviewPanelCopy}</p>
                      <p className="sheet-summary review-scope-copy">{ui.reviewPanelScope}</p>
                      <p className="sheet-summary review-scope-copy">{ui.reviewDecisionHelp}</p>
                    </div>
                    {reviewActionError ? (
                      <p className="signal-feedback signal-feedback-error">{reviewActionError}</p>
                    ) : null}
                    {!reviewActionError && reviewActionMessage ? (
                      <p className="signal-feedback">{reviewActionMessage}</p>
                    ) : null}
                  </section>

                  {dashboardData.extractedGroups.map((group) => (
                    <section className="inspect-section-card" key={group.itemType}>
                      <div className="inspect-card-header">
                        <span className="section-kicker">{ui.extractedType}</span>
                        <h3>{group.label}</h3>
                      </div>
                      <div className="review-card-grid">
                        {group.items.map((item) => (
                          <ReviewItemCard
                            key={item.id}
                            item={item}
                            ui={ui}
                            isSaving={savingReviewItemId === item.id}
                            onReview={onReviewUpdate}
                            formatReviewedValue={formatReviewedValue}
                            buildCorrectionPlaceholder={buildCorrectionPlaceholder}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyTabPlaceholder
                  title={ui.noExtractedItemsTitle}
                  body={ui.noExtractedItemsBody}
                />
              )
            ) : null}

            {inspectTab === "emails" ? (
              dashboardData.allEmails.length > 0 ? (
                <div className="email-explorer">
                  <div className="email-list email-list-scroll">
                    {dashboardData.allEmails.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`email-row ${selectedEmailDetail?.id === item.id ? "email-row-active" : ""}`}
                        onClick={() => setSelectedEmailId(item.id)}
                      >
                        <div className="email-row-topline">
                          <span className="sender">{item.sender}</span>
                          <span className={`tag tag-${item.tag.replace(/\s+/g, "-")}`}>{item.tag}</span>
                        </div>
                        <strong>{item.subject}</strong>
                        <p>{item.preview}</p>
                        <div className="email-row-meta">
                          <span>{item.receivedAt}</span>
                          <span>{item.scoreLabel}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedEmailDetail ? (
                    <section className="inspect-section-card inspect-detail-card">
                      <EmailDetailContent
                        selectedEmailDetail={selectedEmailDetail}
                        ui={ui}
                        buildEmailHtmlDocument={buildEmailHtmlDocument}
                      />
                    </section>
                  ) : (
                    <EmptyTabPlaceholder title={ui.noEvidenceTabTitle} body={ui.noEvidenceTabBody} />
                  )}
                </div>
              ) : (
                <EmptyTabPlaceholder title={ui.noEmailsTabTitle} body={ui.noEmailsTabBody} />
              )
            ) : null}

            {inspectTab === "evidence" ? (
              selectedEmailDetail ? (
                <div className="inspect-grid">
                  <section className="inspect-section-card">
                    <span className="section-kicker">{ui.emailDetail}</span>
                    <h3>{selectedEmailDetail.subject}</h3>
                    <p className="sheet-summary">{selectedEmailDetail.sender}</p>
                    <dl className="email-detail-grid">
                      <div><dt>{ui.importanceScore}</dt><dd>{selectedEmailDetail.importanceScore}</dd></div>
                      <div><dt>{ui.needsAction}</dt><dd>{selectedEmailDetail.needsAction}</dd></div>
                      <div><dt>{ui.confidence}</dt><dd>{selectedEmailDetail.confidenceScore}</dd></div>
                      <div><dt>{ui.receivedAt}</dt><dd>{selectedEmailDetail.receivedAt}</dd></div>
                    </dl>
                  </section>

                  <section className="inspect-section-card">
                    <span className="section-kicker">{ui.whyThisMatters}</span>
                    <div className="sheet-stack">
                      <div className="email-detail-block">
                        <span className="section-kicker">{ui.reason}</span>
                        <p className="sheet-summary">{selectedEmailDetail.reason}</p>
                      </div>
                      <div className="email-detail-block">
                        <span className="section-kicker">{ui.uncertainty}</span>
                        <p className="sheet-summary">
                          {selectedEmailDetail.uncertaintyNote || ui.noUncertainty}
                        </p>
                      </div>
                      <div className="email-detail-block">
                        <span className="section-kicker">{ui.bodyPreview}</span>
                        <p className="sheet-summary">
                          {selectedEmailDetail.bodyPreview || ui.noBodyPreview}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <EmptyTabPlaceholder title={ui.noEvidenceTabTitle} body={ui.noEvidenceTabBody} />
              )
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}

export function ActiveSheetOverlay({
  activeSheet,
  selectedEmailDetail,
  dashboardData,
  ui,
  onClose,
  setSelectedEmailId,
  getSheetKicker,
  getSheetTitle,
  buildEmailHtmlDocument,
}) {
  if (!activeSheet || !((activeSheet === "email" && selectedEmailDetail) || activeSheet === "email-list")) {
    return null;
  }

  return (
    <div className="sheet-layer" role="presentation">
      <button
        type="button"
        className="sheet-backdrop"
        aria-label={ui.close}
        onClick={onClose}
      />
      <aside
        className={`sheet-panel ${activeSheet === "email-list" ? "sheet-panel-wide" : ""}`}
        aria-label={getSheetTitle(activeSheet, ui)}
      >
        <div className="sheet-panel-inner">
          <div className="sheet-header">
            <div>
              <span className="section-kicker">{getSheetKicker(activeSheet, ui)}</span>
              <h2>{getSheetTitle(activeSheet, ui)}</h2>
            </div>
            <button
              type="button"
              className="sheet-close"
              onClick={onClose}
            >
              {ui.close}
            </button>
          </div>

          <div className="sheet-section">
            {activeSheet === "email-list" ? (
              <div className="email-modal-layout">
                <div className="sheet-stack">
                  <p className="sheet-summary">{ui.inspectEveryEmail}</p>
                  <div className="email-list email-list-scroll email-list-modal">
                    {dashboardData.allEmails.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`email-row ${selectedEmailDetail?.id === item.id ? "email-row-active" : ""}`}
                        onClick={() => setSelectedEmailId(item.id)}
                      >
                        <div className="email-row-topline">
                          <span className="sender">{item.sender}</span>
                          <span className={`tag tag-${item.tag.replace(/\s+/g, "-")}`}>{item.tag}</span>
                        </div>
                        <strong>{item.subject}</strong>
                        <p>{item.preview}</p>
                        <div className="email-row-meta">
                          <span>{item.receivedAt}</span>
                          <span>{item.scoreLabel}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedEmailDetail ? (
                  <section className="inspect-section-card inspect-detail-card">
                    <EmailDetailContent
                      selectedEmailDetail={selectedEmailDetail}
                      ui={ui}
                      buildEmailHtmlDocument={buildEmailHtmlDocument}
                    />
                  </section>
                ) : null}
              </div>
            ) : (
              <EmailDetailContent
                selectedEmailDetail={selectedEmailDetail}
                ui={ui}
                buildEmailHtmlDocument={buildEmailHtmlDocument}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
