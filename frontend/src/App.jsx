import { useEffect, useMemo, useState } from "react";

import {
  CustomSelect,
  EmailDetailContent,
  EmptyTabPlaceholder,
  ReviewItemCard,
  RunLauncher,
} from "./components/AppComponents";
import { EMPTY_STATE_ICONS, UI_TEXT } from "./uiText";

const DEFAULT_RUN_PROVIDER = "mock";
const DEFAULT_TRIGGER_DATE = getTodayDateInputValue();
const LOCALE_STORAGE_KEY = "email-agent-ui-locale";

function App() {
  const [runs, setRuns] = useState([]);
  const [selectedRunDate, setSelectedRunDate] = useState("");
  const [runData, setRunData] = useState(null);
  const [interfaceLocale, setInterfaceLocale] = useState(getInitialInterfaceLocale);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(null);
  const [activeMode, setActiveMode] = useState("brief");
  const [inspectTab, setInspectTab] = useState("run");
  const [selectedEmailId, setSelectedEmailId] = useState("");
  const [runProvider, setRunProvider] = useState(DEFAULT_RUN_PROVIDER);
  const [triggerDate, setTriggerDate] = useState(DEFAULT_TRIGGER_DATE);
  const [runActionError, setRunActionError] = useState("");
  const [runActionMessage, setRunActionMessage] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [reviewActionError, setReviewActionError] = useState("");
  const [reviewActionMessage, setReviewActionMessage] = useState("");
  const [savingReviewItemId, setSavingReviewItemId] = useState("");

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, interfaceLocale);
  }, [interfaceLocale]);

  async function fetchRun(date) {
    const payload = await fetchJson(`/api/runs/${date}`, "Failed to load selected run.");
    return payload.run;
  }

  async function loadRuns(preferredDate = "", preferredRun = null) {
    try {
      setLoading(true);
      const runsPayload = await fetchJson("/api/runs", "Could not load run data.");
      const availableRuns = runsPayload.runs ?? [];
      setRuns(availableRuns);

      if (availableRuns.length === 0) {
        setRunData(null);
        setSelectedRunDate("");
        setError("");
        return;
      }

      const nextPreferredRun = pickPreferredRun(availableRuns, preferredDate || selectedRunDate);
      const nextRun =
        preferredRun && preferredRun.date === nextPreferredRun.date
          ? preferredRun
          : await fetchRun(nextPreferredRun.date);

      setRunData(nextRun);
      setSelectedRunDate(nextPreferredRun.date);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load run data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunChange(nextDate) {
    setSelectedRunDate(nextDate);
    setSelectedEmailId("");
    setLoading(true);
    setError("");
    setReviewActionError("");
    setReviewActionMessage("");

    try {
      const nextRun = await fetchRun(nextDate);
      setRunData(nextRun);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load run data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunTrigger() {
    setIsRunning(true);
    setRunActionError("");
    setRunActionMessage("");

    try {
      const payload = await fetchJson("/api/runs", "Could not start a summary run.", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: runProvider,
          run_date: triggerDate,
        }),
      });

      await loadRuns(payload.run?.date ?? "", payload.run ?? null);
      if (payload.run?.date) {
        setRunActionMessage(ui.runCompleted(payload.run.date));
      }
    } catch (runError) {
      setRunActionError(runError instanceof Error ? runError.message : "Could not start a summary run.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleReviewUpdate(itemId, payload) {
    if (!selectedRunDate) {
      return;
    }

    setSavingReviewItemId(itemId);
    setReviewActionError("");
    setReviewActionMessage("");

    try {
      const response = await fetchJson(
        `/api/runs/${selectedRunDate}/extracted-items/${encodeURIComponent(itemId)}`,
        ui.reviewSaveFailed,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      setRunData(response.run);
      setReviewActionMessage(ui.reviewSaved);
    } catch (reviewError) {
      setReviewActionError(reviewError instanceof Error ? reviewError.message : ui.reviewSaveFailed);
    } finally {
      setSavingReviewItemId("");
    }
  }

  const dashboardData = useMemo(
    () => buildDashboardData(runData, interfaceLocale),
    [runData, interfaceLocale],
  );
  const ui = dashboardData?.ui ?? UI_TEXT[interfaceLocale];
  const localeOptions = [
    { value: "de", label: ui.german },
    { value: "en", label: ui.english },
  ];
  const runSelectOptions = runs.map((run) => ({
    value: run.date,
    label: `${run.date} ${run.isMock ? `(${ui.mockLabel})` : `(${run.provider})`}`,
  }));
  const selectedEmailDetail =
    dashboardData?.allEmails.find((email) => email.id === selectedEmailId)
    ?? dashboardData?.allEmails[0]
    ?? null;
  const hasInboxMessages = (dashboardData?.inbox.length ?? 0) > 0;
  const hasActions = (dashboardData?.actions.length ?? 0) > 0;
  const hasDeadlines = (dashboardData?.deadlines.length ?? 0) > 0;
  const hasMeetings = (dashboardData?.meetings.length ?? 0) > 0;
  const hasSubscriptions = (dashboardData?.subscriptions.length ?? 0) > 0;
  const isBriefMostlyEmpty = !hasInboxMessages && !hasActions && !hasDeadlines && !hasMeetings && !hasSubscriptions;
  const inspectTabs = [
    ["run", ui.inspectRunTab],
    ["workflow", ui.inspectWorkflowTab],
    ["review", ui.inspectReviewTab],
    ["emails", ui.inspectEmailsTab],
    ["evidence", ui.inspectEvidenceTab],
  ];
  const activeInspectTabLabel = inspectTabs.find(([value]) => value === inspectTab)?.[1] ?? ui.inspectRunTab;

  if (loading && !runData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">Loading</span>
          <h2>{ui.loadingTitle}</h2>
        </div>
      </div>
    );
  }

  if (error && !runData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">{ui.frontendKicker}</span>
          <h2>{ui.loadErrorTitle}</h2>
          <p>{error}</p>
          <RunLauncher
            ui={ui}
            runProvider={runProvider}
            setRunProvider={setRunProvider}
            triggerDate={triggerDate}
            setTriggerDate={setTriggerDate}
            isRunning={isRunning}
            onRun={handleRunTrigger}
            error={runActionError}
            message={runActionMessage}
          />
        </div>
      </div>
    );
  }

  if (!runData || !dashboardData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">{ui.noDataKicker}</span>
          <h2>{ui.noDataTitle}</h2>
          <p>{ui.noDataBody}</p>
          <RunLauncher
            ui={ui}
            runProvider={runProvider}
            setRunProvider={setRunProvider}
            triggerDate={triggerDate}
            setTriggerDate={setTriggerDate}
            isRunning={isRunning}
            onRun={handleRunTrigger}
            error={runActionError}
            message={runActionMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <div className="page-topbar">
        <span className="eyebrow">Email Agent</span>
        <div className="hero-top-actions">
          <div className="mode-switch" role="tablist" aria-label={ui.interfaceLanguage}>
            <button
              type="button"
              className={`mode-switch-button ${activeMode === "brief" ? "mode-switch-button-active" : ""}`}
              onClick={() => setActiveMode("brief")}
            >
              {ui.briefMode}
            </button>
            <button
              type="button"
              className={`mode-switch-button ${activeMode === "inspect" ? "mode-switch-button-active" : ""}`}
              onClick={() => {
                setActiveMode("inspect");
                setInspectTab("run");
              }}
            >
              {ui.inspectMode}
            </button>
          </div>
          <label className="locale-switch">
            <span>{ui.interfaceLanguage}</span>
            <CustomSelect
              value={interfaceLocale}
              options={localeOptions}
              onChange={setInterfaceLocale}
              ariaLabel={ui.interfaceLanguage}
              shellClassName="locale-switch-shell"
              buttonClassName="locale-switch-button"
              menuClassName="locale-switch-menu"
              optionClassName="locale-switch-option"
              activeOptionClassName="locale-switch-option-active"
            />
          </label>
        </div>
      </div>

      {activeMode === "brief" ? (
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
                      onChange={handleRunChange}
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
                  onRun={handleRunTrigger}
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
                      onClick={() => setActiveSheet("email-list")}
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
                          onClick={() => {
                            setSelectedEmailId(item.id);
                            setActiveSheet("email");
                          }}
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
                  <span className="panel-empty-heading-icon" aria-hidden="true">{EMPTY_STATE_ICONS.deadlines}</span>
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
                  <span className="panel-empty-heading-icon" aria-hidden="true">{EMPTY_STATE_ICONS.meetings}</span>
                ) : null}
              </div>

              {dashboardData.meetings.length > 0 ? (
                <ul className="signal-list">
                  {dashboardData.meetings.map((item) => (
                    <li key={`${item.sourceEmailId}-${item.title}`}>
                      <strong>{item.title}</strong>
                      <span>{formatMeetingDetail(item, ui)}</span>
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
                  <span className="panel-empty-heading-icon" aria-hidden="true">{EMPTY_STATE_ICONS.subscriptions}</span>
                ) : null}
              </div>

              {dashboardData.subscriptions.length > 0 ? (
                <ul className="signal-list">
                  {dashboardData.subscriptions.map((item) => (
                    <li key={`${item.sourceEmailId}-${item.serviceName}`}>
                      <strong>{item.serviceName}</strong>
                      <span>{formatSubscriptionDetail(item, ui)}</span>
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
      ) : (
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
                    onChange={handleRunChange}
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
                                onReview={handleReviewUpdate}
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
      )}

      {activeSheet && ((activeSheet === "email" && selectedEmailDetail) || activeSheet === "email-list") ? (
        <div className="sheet-layer" role="presentation">
          <button
            type="button"
            className="sheet-backdrop"
            aria-label={ui.close}
            onClick={() => setActiveSheet(null)}
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
                  onClick={() => setActiveSheet(null)}
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
      ) : null}
    </div>
  );
}

export default App;

function pickPreferredRun(runs, preferredDate = "") {
  if (preferredDate) {
    const matchingRun = runs.find((run) => run.date === preferredDate);
    if (matchingRun) {
      return matchingRun;
    }
  }

  const realRun = runs.find((run) => !run.isMock);
  return realRun ?? runs[0];
}

async function fetchJson(url, fallbackMessage, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? fallbackMessage);
  }
  return payload;
}

function getTodayDateInputValue() {
  const today = new Date();
  const timezoneOffsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getInitialInterfaceLocale() {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (storedLocale === "de" || storedLocale === "en") {
    return storedLocale;
  }

  const browserLocale = window.navigator.language?.toLowerCase() ?? "";
  return browserLocale.startsWith("de") ? "de" : "en";
}

function formatExecutionMode(runMetadata, summary, assessments, ui) {
  const classificationMode = formatMode(runMetadata?.classification_mode, ui);
  const summaryMode = formatMode(runMetadata?.summary_mode, ui);

  if (classificationMode && summaryMode) {
    if (classificationMode === summaryMode) {
      return classificationMode;
    }
    return ui.runModeMixed(classificationMode, summaryMode);
  }

  return summaryMode ?? classificationMode ?? detectExecutionMode(summary, assessments, ui);
}

function getSheetKicker(activeSheet, ui) {
  if (activeSheet === "workflow") {
    return ui.workflow;
  }
  if (activeSheet === "project") {
    return ui.whyThisMatters;
  }
  if (activeSheet === "email-list") {
    return ui.allEmails;
  }
  if (activeSheet === "email") {
    return ui.allEmails;
  }
  return ui.inspector;
}

function getSheetTitle(activeSheet, ui) {
  if (activeSheet === "workflow") {
    return ui.systemPath;
  }
  if (activeSheet === "project") {
    return ui.projectValue;
  }
  if (activeSheet === "email-list") {
    return ui.emailList;
  }
  if (activeSheet === "email") {
    return ui.emailDetail;
  }
  return ui.technicalMetadata;
}

function buildDashboardData(runData, interfaceLocale) {
  if (!runData) {
    return null;
  }

  const { summary, assessments, emails, deadlines, meetings, subscriptions, extractedItems, date, runMetadata } = runData;
  const importantIds = new Set(summary.important_email_ids ?? []);
  const importantEmails = emails.filter((email) => importantIds.has(email.id));
  const assessmentMap = new Map(assessments.map((item) => [item.email_id, item]));
  const emailMap = new Map(emails.map((email) => [email.id, email]));
  const provider = runMetadata?.provider ?? importantEmails[0]?.source ?? emails[0]?.source ?? "unknown";
  const providerDisplay = formatProviderName(provider);
  const locale = interfaceLocale === "de" ? "de" : "en";
  const ui = UI_TEXT[locale];
  const runLanguage = summary.language === "de" ? ui.german : ui.english;

  return {
    ui,
    headline: summary.headline,
    overview: summary.overview,
    dateLabel: formatDate(date, locale),
    dateBadge: date,
    provider: providerDisplay,
    language: runLanguage,
    llmProvider: runMetadata?.llm_provider ?? ui.unknown,
    executionMode: formatExecutionMode(runMetadata, summary, assessments, ui),
    stats: [
      { label: ui.importantMails, value: String(summary.important_email_ids.length), tone: "coral" },
      { label: ui.subscriptionsStat, value: String(subscriptions.length), tone: "gold" },
      { label: ui.deadlinesStat, value: String(deadlines.length), tone: "teal" },
      { label: ui.meetingsStat, value: String(meetings.length), tone: "blue" },
    ],
    actions: summary.action_items.map((item) => item.description),
    deadlines: deadlines.map((item) => ({
      description: item.description,
      dueHint: item.due_hint,
      sourceEmailId: item.source_email_id,
    })),
    meetings: meetings.map((item) => ({
      title: item.title,
      whenHint: item.when_hint,
      locationHint: item.location_hint,
      needsResponse: item.needs_response,
      sourceEmailId: item.source_email_id,
    })),
    subscriptions: subscriptions.map((item) => ({
      serviceName: item.service_name,
      renewalHint: item.renewal_hint,
      cancellationHint: item.cancellation_hint,
      amountHint: item.amount_hint,
      sourceEmailId: item.source_email_id,
    })),
    inbox: importantEmails.map((email) => ({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      tag: formatLabel(assessmentMap.get(email.id)?.label ?? "info", ui),
      summary: email.snippet || email.body_preview || ui.noPreview,
      reason: assessmentMap.get(email.id)?.reason ?? ui.unknown,
    })),
    allEmails: emails.map((email) => {
      const assessment = assessmentMap.get(email.id);
      return {
        id: email.id,
        sender: email.sender,
        subject: email.subject,
        tag: formatLabel(assessment?.label ?? "info", ui),
        preview: email.snippet || email.body_preview || ui.noPreview,
        bodyPreview: email.body_preview || "",
        bodyHtml: email.body_html || "",
        receivedAt: formatTimestamp(email.received_at, locale, ui),
        scoreLabel: `${ui.importanceScore}: ${assessment?.importance_score ?? 0}`,
        needsAction: yesNo(assessment?.needs_action, ui),
        importanceScore: assessment?.importance_score ?? 0,
        confidenceScore: assessment?.confidence_score ?? 0,
        reason: assessment?.reason ?? ui.unknown,
        uncertaintyNote: assessment?.uncertainty_note ?? "",
      };
    }),
    extractedItems: (extractedItems ?? []).map((item) => mapExtractedItem(item, ui, emailMap)),
    extractedGroups: groupExtractedItems(
      (extractedItems ?? []).map((item) => mapExtractedItem(item, ui, emailMap)),
    ),
    timeline: buildTimeline({
      ui,
      date,
      summary,
      deadlines,
      meetings,
      subscriptions,
      runMetadata,
    }),
    metadata: {
      runStartedAt: formatTimestamp(runMetadata?.run_started_at, locale, ui),
      runCompletedAt: formatTimestamp(runMetadata?.run_completed_at, locale, ui),
      workflowDuration: formatDuration(runMetadata?.workflow_duration_ms),
      inputTokens: formatInteger(runMetadata?.llm_input_tokens ?? 0),
      outputTokens: formatInteger(runMetadata?.llm_output_tokens ?? 0),
      totalTokens: formatInteger(runMetadata?.llm_total_tokens ?? 0),
      estimatedCost: formatEur(runMetadata?.estimated_cost_eur ?? 0),
      emailCount: runMetadata?.email_count ?? emails.length,
      importantEmailCount: runMetadata?.important_email_count ?? summary.important_email_ids.length,
      llmClassificationEnabled: yesNo(runMetadata?.llm_classification_enabled, ui),
      llmSummaryEnabled: yesNo(runMetadata?.llm_summary_enabled, ui),
      classificationMode: formatMode(runMetadata?.classification_mode, ui),
      summaryMode: formatMode(runMetadata?.summary_mode, ui),
      uncertainAssessmentCount: runMetadata?.uncertain_assessment_count ?? 0,
      abstainedAssessmentCount: runMetadata?.abstained_assessment_count ?? 0,
      llmFallbackCount: runMetadata?.llm_fallback_count ?? 0,
    },
    previewMeta: [
      { label: ui.totalTokens, value: formatInteger(runMetadata?.llm_total_tokens ?? 0) },
      { label: ui.emailCount, value: String(runMetadata?.email_count ?? emails.length) },
      {
        label: ui.importantCount,
        value: String(runMetadata?.important_email_count ?? summary.important_email_ids.length),
      },
    ],
  };
}

function buildTimeline({ ui, date, summary, deadlines, meetings, subscriptions, runMetadata }) {
  const timedSteps = Object.entries(runMetadata?.step_durations_ms ?? {}).map(([step, durationMs]) => ({
    title: humanizeStepName(step),
    detail: ui.stepCompletedInDetail(formatDuration(durationMs)),
    status: "completed",
  }));

  return [
    {
      title: ui.savedSummary,
      detail: ui.savedSummaryDetail(date, summary.important_email_ids.length),
      status: "completed",
    },
    {
      title: ui.structuredExtraction,
      detail: ui.structuredExtractionDetail(deadlines.length, meetings.length, subscriptions.length),
      status: "completed",
    },
    {
      title: ui.artifactBackedUi,
      detail: ui.artifactBackedUiDetail,
      status: "completed",
    },
    {
      title: ui.llm,
      detail: ui.usageRecordedDetail(
        runMetadata?.llm_total_tokens ?? 0,
        formatEur(runMetadata?.estimated_cost_eur ?? 0),
      ),
      status: "completed",
    },
    ...timedSteps,
    {
      title: ui.guardrails,
      detail: ui.guardrailsDetail(
        runMetadata?.llm_fallback_count ?? 0,
        runMetadata?.abstained_assessment_count ?? 0,
      ),
      status: "completed",
    },
    {
      title: ui.nextStep,
      detail: ui.nextStepDetail,
      status: "next",
    },
  ];
}

function formatDate(date, locale) {
  const parsed = new Date(`${date}T12:00:00`);
  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Intl.DateTimeFormat(formatterLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function formatTimestamp(value, locale, ui) {
  if (!value) {
    return ui.unknown;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Intl.DateTimeFormat(formatterLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

function formatDuration(value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return "0 ms";
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(2)} s`;
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatEur(value) {
  const amount = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return `${amount.toFixed(4)} €`;
}

function humanizeStepName(step) {
  return step
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapExtractedItem(item, ui, emailMap) {
  const sourceEmail = emailMap.get(item.source_email_id);
  return {
    id: item.id,
    itemType: item.item_type,
    itemTypeLabel: ui.extractedTypeLabels[item.item_type] ?? item.item_type,
    reviewStatus: item.review_status ?? "pending",
    reviewStatusLabel: formatReviewStatus(item.review_status, ui),
    title: item.title ?? "",
    description: item.description ?? "",
    confidenceLabel: `${item.confidence_score ?? 0}/100`,
    confidenceReason: item.confidence_reason ?? "",
    evidenceText: item.evidence_text ?? sourceEmail?.snippet ?? sourceEmail?.body_preview ?? "",
    reviewedValue: item.reviewed_value ?? null,
    reviewerNote: item.reviewer_note ?? "",
    detailLines: buildExtractedItemDetails(item, ui),
  };
}

function buildExtractedItemDetails(item, ui) {
  const details = [];
  const itemData = item.item_data ?? {};

  if (item.item_type === "deadline" && itemData.due_hint) {
    details.push(itemData.due_hint);
  }
  if (item.item_type === "meeting") {
    if (itemData.when_hint) {
      details.push(itemData.when_hint);
    }
    if (itemData.location_hint) {
      details.push(itemData.location_hint);
    }
    if (itemData.needs_response) {
      details.push(ui.responseLikelyNeeded);
    }
  }
  if (item.item_type === "financial_obligation") {
    if (itemData.amount_hint) {
      details.push(itemData.amount_hint);
    }
    if (itemData.renewal_hint) {
      details.push(itemData.renewal_hint);
    }
    if (itemData.cancellation_hint) {
      details.push(itemData.cancellation_hint);
    }
  }
  if (item.item_type === "action_item" && itemData.priority) {
    details.push(formatLabel(itemData.priority, ui));
  }

  return details;
}

function groupExtractedItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    if (!grouped.has(item.itemType)) {
      grouped.set(item.itemType, {
        itemType: item.itemType,
        label: item.itemTypeLabel,
        items: [],
      });
    }
    grouped.get(item.itemType).items.push(item);
  });

  return Array.from(grouped.values());
}

function formatLabel(label, ui) {
  const normalized = String(label ?? "").toLowerCase();
  return ui?.categoryLabels?.[normalized] ?? normalized.replace(/_/g, " ");
}

function formatProviderName(provider) {
  const normalized = String(provider ?? "").trim().toLowerCase();
  if (normalized === "webde") {
    return "WEB.DE";
  }
  if (normalized === "gmail") {
    return "Gmail";
  }
  if (normalized === "mock") {
    return "Mock";
  }
  if (!normalized) {
    return "Unknown";
  }
  return provider.toUpperCase();
}

function detectExecutionMode(summary, assessments, ui) {
  if (summary.headline && summary.overview) {
    const heuristicReasons = assessments.every((item) =>
      [
        "Contains urgent language or a time-sensitive deadline.",
        "Looks like a meeting or calendar-related email.",
        "Contains finance-related keywords.",
        "Likely expects a response.",
        "Useful informational update.",
        "No strong signal of importance.",
      ].includes(item.reason),
    );
    return heuristicReasons ? ui.heuristicOrFallback : ui.llmAssisted;
  }

  return ui.unknown;
}

function formatMode(value, ui) {
  if (!value) {
    return ui.unknown;
  }

  const normalized = value.toLowerCase();
  const modeMap = {
    heuristic: ui.heuristicOrFallback,
    heuristic_fallback: ui.heuristicOrFallback,
    llm: "LLM",
    llm_guardrailed: "LLM + Guardrails",
    llm_assisted: ui.llmAssisted,
  };
  return modeMap[normalized] ?? value.replace(/_/g, " ");
}

function yesNo(value, ui) {
  return value ? ui.yes : ui.no;
}

function formatReviewStatus(status, ui) {
  if (status === "confirmed") {
    return ui.reviewConfirmed;
  }
  if (status === "rejected") {
    return ui.reviewRejected;
  }
  if (status === "corrected") {
    return ui.reviewCorrected;
  }
  return ui.reviewPending;
}

function formatReviewedValue(reviewedValue) {
  if (!reviewedValue) {
    return "";
  }
  if (typeof reviewedValue.corrected_text === "string") {
    return reviewedValue.corrected_text;
  }
  try {
    return JSON.stringify(reviewedValue, null, 2);
  } catch {
    return "";
  }
}

function buildCorrectionPlaceholder(item, ui) {
  const parts = [item.title || item.description, ...item.detailLines].filter(Boolean);
  return parts.join(" | ") || ui.correctionPlaceholder;
}

function buildEmailHtmlDocument(rawHtml) {
  const sanitized = sanitizeEmailHtml(rawHtml);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: Arial, sans-serif;
        color: #222;
        background: #fff;
        line-height: 1.55;
        word-break: break-word;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        max-width: 100%;
      }
      a {
        color: #315a9a;
      }
    </style>
  </head>
  <body>${sanitized}</body>
</html>`;
}

function sanitizeEmailHtml(rawHtml) {
  return String(rawHtml ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\s(href|src)=("javascript:[^"]*"|'javascript:[^']*')/gi, " $1=\"#\"");
}

function formatMeetingDetail(item, ui) {
  const parts = [item.whenHint, item.locationHint].filter(Boolean);
  if (item.needsResponse) {
    parts.push(ui.responseLikelyNeeded);
  }
  return parts.join(" · ") || ui.noMeetingDetails;
}

function formatSubscriptionDetail(item, ui) {
  const parts = [item.renewalHint, item.amountHint, item.cancellationHint].filter(Boolean);
  return parts.join(" · ") || ui.likelyRecurringFallback;
}
