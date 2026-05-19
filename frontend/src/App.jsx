import { useEffect, useMemo, useState } from "react";

const DEFAULT_RUN_PROVIDER = "mock";
const DEFAULT_TRIGGER_DATE = getTodayDateInputValue();

const UI_TEXT = {
  en: {
    loadingKicker: "Loading",
    loadingTitle: "Loading run artifacts...",
    frontendKicker: "Frontend",
    loadErrorTitle: "Could not load saved runs",
    noDataKicker: "No data yet",
    noDataTitle: "Run the email agent first",
    noDataBody: "Saved summaries from data/runs/ will appear here automatically.",
    runAgent: "Run agent",
    runAgentTitle: "Trigger a fresh summary",
    runAgentHint: "Start a new summary run from the dashboard and reload the saved artifacts when it finishes.",
    runNow: "Run summary",
    runningRun: "Running summary...",
    runCompleted: (date) => `Summary run completed for ${date}.`,
    runProvider: "Run with",
    runDate: "Run date",
    currentRun: "Current run",
    newRun: "New run",
    launchHint: "Choose a provider and date, then start a fresh run.",
    livePill: "Run dashboard",
    signalLabel: "Daily summary",
    runOverview: "Run overview",
    close: "Close",
    hideDetails: "Hide details",
    showDetails: "Show details",
    savedRun: "Saved run",
    inspector: "Inspector",
    technicalMetadata: "Technical metadata",
    inspectorPreview: "Open details for the full technical trace behind this run.",
    provider: "Provider",
    language: "Language",
    llm: "LLM",
    execution: "Execution",
    startedAt: "Started",
    completedAt: "Completed",
    workflowDuration: "Workflow duration",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    totalTokens: "Total tokens",
    estimatedCost: "Estimated cost",
    emailCount: "Email count",
    importantCount: "Important count",
    llmClassification: "LLM classification",
    llmSummary: "LLM summary",
    classificationRoute: "Classification route",
    summaryRoute: "Summary route",
    lowConfidenceItems: "Low-confidence items",
    abstainedItems: "Abstained items",
    llmFallbacks: "LLM fallbacks",
    inboxFocus: "Inbox focus",
    importantMessages: "Important messages",
    actionBoard: "Action board",
    nextSteps: "Next steps",
    noFollowup: "No follow-up actions were extracted for this run.",
    deadlines: "Deadlines",
    timeSensitiveItems: "Time-sensitive items",
    noDeadlines: "No explicit deadline signals were extracted for this run.",
    meetings: "Meetings",
    calendarSignals: "Calendar signals",
    noMeetings: "No meeting invitations or scheduling signals were extracted.",
    subscriptions: "Subscriptions",
    recurringCharges: "Recurring charges",
    noSubscriptions: "No likely recurring subscriptions were extracted for this run.",
    workflow: "Workflow",
    systemPath: "System path",
    hide: "Hide",
    view: "View",
    workflowSummary: "A compact system overview is available when you want to inspect the workflow path.",
    stepTimingSummary: "Each saved run now includes timestamps and step durations for a clearer operational trace.",
    stepCompletedInDetail: (duration) => `Completed in ${duration}.`,
    usageRecordedDetail: (tokens, cost) =>
      tokens > 0 ? `${tokens} total LLM tokens recorded. Estimated cost ${cost}.` : "No LLM token usage recorded for this run.",
    whyThisMatters: "Why this matters",
    projectValue: "Project value",
    projectSummary: "The interface is intentionally product-first, while the engineering story stays available on demand.",
    projectBullet1: "Real Gmail runs and saved artifacts already drive the interface.",
    projectBullet2: "The product view stays clean while technical metadata remains accessible on demand.",
    projectBullet3: "The next step could be a lightweight API or live refresh after each summary run.",
    importantMails: "Important mails",
    subscriptionsStat: "Subscriptions",
    deadlinesStat: "Deadlines",
    meetingsStat: "Meetings",
    german: "German",
    english: "English",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    gmailLabel: "gmail",
    mockLabel: "mock",
    noPreview: "No preview available.",
    savedSummary: "Saved summary",
    structuredExtraction: "Structured extraction",
    artifactBackedUi: "Artifact-backed UI",
    guardrails: "Guardrails",
    nextStep: "Next step",
    savedSummaryDetail: (date, count) => `Loaded summary.json for ${date} with ${count} important emails.`,
    structuredExtractionDetail: (deadlines, meetings, subscriptions) =>
      `Saved ${deadlines} deadline signals, ${meetings} meeting signals, and ${subscriptions} subscription signals as first-class artifacts.`,
    artifactBackedUiDetail: "This dashboard reflects real persisted outputs from the Python workflow.",
    guardrailsDetail: (fallbacks, abstained) =>
      fallbacks > 0
        ? `Guardrails replaced ${fallbacks} low-confidence classifications and tracked ${abstained} abstentions.`
        : "No low-confidence classifications needed fallback in this run.",
    nextStepDetail: "Add token, cost, and latency telemetry to the saved run metadata.",
    calmerBrief: "A calmer daily brief, centered on the few things worth your attention.",
    guardrailsBrief: (count) =>
      `Guardrails replaced ${count} low-confidence classifications with safer fallback logic.`,
    likelyRecurringFallback: "Likely recurring subscription signal detected.",
    noMeetingDetails: "No additional meeting details extracted.",
    responseLikelyNeeded: "Response likely needed",
    noDueHint: "No explicit due hint found.",
    heuristicOrFallback: "Heuristic or fallback",
    llmAssisted: "LLM-assisted",
    runModeMixed: (classification, summary) => `${classification} / ${summary}`,
  },
  de: {
    loadingKicker: "Laden",
    loadingTitle: "Laufartefakte werden geladen...",
    frontendKicker: "Frontend",
    loadErrorTitle: "Gespeicherte Läufe konnten nicht geladen werden",
    noDataKicker: "Noch keine Daten",
    noDataTitle: "Starte den Email-Agenten zuerst",
    noDataBody: "Gespeicherte Zusammenfassungen aus data/runs/ erscheinen hier automatisch.",
    runAgent: "Agent starten",
    runAgentTitle: "Neue Zusammenfassung auslösen",
    runAgentHint: "Starte einen neuen Lauf direkt aus dem Dashboard und lade die gespeicherten Artefakte danach neu.",
    runNow: "Zusammenfassung starten",
    runningRun: "Zusammenfassung läuft...",
    runCompleted: (date) => `Zusammenfassung für ${date} abgeschlossen.`,
    runProvider: "Ausführen mit",
    runDate: "Datum",
    currentRun: "Aktueller Lauf",
    newRun: "Neuer Lauf",
    launchHint: "Quelle und Datum wählen und dann einen neuen Lauf starten.",
    livePill: "Übersicht",
    signalLabel: "Tageszusammenfassung",
    runOverview: "Laufüberblick",
    close: "Schließen",
    hideDetails: "Details ausblenden",
    showDetails: "Details anzeigen",
    savedRun: "Gespeicherter Lauf",
    inspector: "Inspektor",
    technicalMetadata: "Technische Metadaten",
    inspectorPreview: "Öffne die Details für die vollständige technische Spur dieses Laufs.",
    provider: "Quelle",
    language: "Sprache",
    llm: "LLM",
    execution: "Ausführung",
    startedAt: "Gestartet",
    completedAt: "Beendet",
    workflowDuration: "Workflow-Dauer",
    inputTokens: "Input-Tokens",
    outputTokens: "Output-Tokens",
    totalTokens: "Gesamt-Tokens",
    estimatedCost: "Geschaetzte Kosten",
    emailCount: "E-Mail-Anzahl",
    importantCount: "Wichtige E-Mails",
    llmClassification: "LLM-Klassifizierung",
    llmSummary: "LLM-Zusammenfassung",
    classificationRoute: "Klassifizierungsweg",
    summaryRoute: "Zusammenfassungsweg",
    lowConfidenceItems: "Unsichere Einträge",
    abstainedItems: "Enthaltungen",
    llmFallbacks: "LLM-Fallbacks",
    inboxFocus: "Posteingang",
    importantMessages: "Wichtige Nachrichten",
    actionBoard: "Nächste Schritte",
    nextSteps: "Nächste Schritte",
    noFollowup: "Für diesen Lauf wurden keine Folgeaktionen erkannt.",
    deadlines: "Fristen",
    timeSensitiveItems: "Zeitkritische Punkte",
    noDeadlines: "Für diesen Lauf wurden keine klaren Fristsignale erkannt.",
    meetings: "Besprechungen",
    calendarSignals: "Kalendersignale",
    noMeetings: "Es wurden keine Besprechungs- oder Planungssignale erkannt.",
    subscriptions: "Abos",
    recurringCharges: "Wiederkehrende Kosten",
    noSubscriptions: "Für diesen Lauf wurden keine wahrscheinlichen Abos erkannt.",
    workflow: "Ablauf",
    systemPath: "Systempfad",
    hide: "Ausblenden",
    view: "Anzeigen",
    workflowSummary: "Eine kompakte Systemansicht ist verfügbar, wenn du den Ablauf genauer ansehen willst.",
    stepTimingSummary: "Jeder gespeicherte Lauf enthält jetzt Zeitstempel und Schrittdauern für eine klarere operative Spur.",
    stepCompletedInDetail: (duration) => `Abgeschlossen in ${duration}.`,
    usageRecordedDetail: (tokens, cost) =>
      tokens > 0 ? `${tokens} gesamte LLM-Tokens erfasst. Geschaetzte Kosten ${cost}.` : "Keine LLM-Token-Nutzung fuer diesen Lauf erfasst.",
    whyThisMatters: "Warum das wichtig ist",
    projectValue: "Projektwert",
    projectSummary: "Die Oberfläche bleibt bewusst produktnah, während die technische Sicht bei Bedarf verfügbar ist.",
    projectBullet1: "Echte Gmail-Läufe und gespeicherte Artefakte treiben die Oberfläche bereits an.",
    projectBullet2: "Die Produktansicht bleibt ruhig, während technische Metadaten gezielt verfügbar bleiben.",
    projectBullet3: "Als nächster Schritt bietet sich eine leichte API oder Live-Aktualisierung nach jedem Lauf an.",
    importantMails: "Wichtige E-Mails",
    subscriptionsStat: "Abos",
    deadlinesStat: "Fristen",
    meetingsStat: "Besprechungen",
    german: "Deutsch",
    english: "Englisch",
    unknown: "Unbekannt",
    yes: "Ja",
    no: "Nein",
    gmailLabel: "gmail",
    mockLabel: "mock",
    noPreview: "Keine Vorschau verfügbar.",
    savedSummary: "Gespeicherte Zusammenfassung",
    structuredExtraction: "Strukturierte Extraktion",
    artifactBackedUi: "Artefaktgestützte Oberfläche",
    guardrails: "Guardrails",
    nextStep: "Nächster Schritt",
    savedSummaryDetail: (date, count) => `summary.json für ${date} mit ${count} wichtigen E-Mails geladen.`,
    structuredExtractionDetail: (deadlines, meetings, subscriptions) =>
      `${deadlines} Fristsignale, ${meetings} Besprechungssignale und ${subscriptions} Abo-Signale als eigene Artefakte gespeichert.`,
    artifactBackedUiDetail: "Dieses Dashboard zeigt echte gespeicherte Ausgaben aus dem Python-Workflow.",
    guardrailsDetail: (fallbacks, abstained) =>
      fallbacks > 0
        ? `Guardrails haben ${fallbacks} unsichere Klassifizierungen durch sicherere Fallback-Logik ersetzt und ${abstained} Enthaltungen erfasst.`
        : "In diesem Lauf waren keine Fallbacks für unsichere Klassifizierungen nötig.",
    nextStepDetail: "Token-, Kosten- und Latenztelemetrie in die gespeicherten Laufmetadaten aufnehmen.",
    calmerBrief: "Ein ruhiger Tagesbrief, fokussiert auf die wenigen Dinge, die wirklich Aufmerksamkeit brauchen.",
    guardrailsBrief: (count) =>
      `Guardrails haben ${count} unsichere Klassifizierungen durch sicherere Fallback-Logik ersetzt.`,
    likelyRecurringFallback: "Wahrscheinliches Signal für ein wiederkehrendes Abo erkannt.",
    noMeetingDetails: "Keine weiteren Besprechungsdetails erkannt.",
    responseLikelyNeeded: "Antwort wahrscheinlich nötig",
    noDueHint: "Keine ausdrückliche Frist erkannt.",
    heuristicOrFallback: "Heuristik oder Fallback",
    llmAssisted: "LLM-gestützt",
    runModeMixed: (classification, summary) => `${classification} / ${summary}`,
  },
};

function App() {
  const [runs, setRuns] = useState([]);
  const [selectedRunDate, setSelectedRunDate] = useState("");
  const [runData, setRunData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(null);
  const [runProvider, setRunProvider] = useState(DEFAULT_RUN_PROVIDER);
  const [triggerDate, setTriggerDate] = useState(DEFAULT_TRIGGER_DATE);
  const [runActionError, setRunActionError] = useState("");
  const [runActionMessage, setRunActionMessage] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

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

  async function handleRunChange(event) {
    const nextDate = event.target.value;
    setSelectedRunDate(nextDate);
    setLoading(true);
    setError("");

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

  const dashboardData = useMemo(() => buildDashboardData(runData), [runData]);
  const ui = dashboardData?.ui ?? UI_TEXT.en;

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

      <header className="hero-card">
        <div className="eyebrow-row">
          <span className="eyebrow">Email Agent</span>
          <span className="live-pill">{ui.livePill}</span>
        </div>

        <div className="hero-grid">
          <div className="hero-main-stack">
            <h1>{dashboardData.headline}</h1>
            <div className="hero-summary-frame">
              <p className="hero-copy">{dashboardData.overview}</p>
              {dashboardData.keyTakeaway ? (
                <p className="hero-note">{dashboardData.keyTakeaway}</p>
              ) : null}
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

          <div className="signal-card signal-rail">
            <div className="signal-topline">
              <div>
                <div className="signal-label">{ui.signalLabel}</div>
                <div className="signal-date">{dashboardData.dateLabel}</div>
              </div>
              <button
                type="button"
                className="inspector-toggle"
                onClick={() => setActiveSheet((current) => (current === "inspector" ? null : "inspector"))}
              >
                {activeSheet === "inspector" ? ui.hideDetails : ui.showDetails}
              </button>
            </div>
            <div className="signal-stack">
              <section className="signal-section">
                <div className="signal-section-header">
                  <span className="section-kicker">{ui.currentRun}</span>
                </div>
                <label className="run-picker">
                  <span>{ui.savedRun}</span>
                  <select value={selectedRunDate} onChange={handleRunChange}>
                    {runs.map((run) => (
                      <option key={run.date} value={run.date}>
                        {run.date} {run.isMock ? `(${ui.mockLabel})` : `(${run.provider})`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="summary-status-row">
                  <span className="summary-status">{dashboardData.executionMode}</span>
                  <span className="summary-subtle">{dashboardData.provider}</span>
                </div>
              </section>
            </div>

            <div className="signal-rail-body signal-section">
              <div className="inspector-preview">
                <div className="inspector-preview-header">
                  <span className="section-kicker">{ui.runOverview}</span>
                  <span className="inspector-note">{ui.technicalMetadata}</span>
                </div>
                <p className="inspector-preview-copy">{ui.inspectorPreview}</p>
                <div className="inspector-mini-grid">
                  {dashboardData.previewMeta.map((item) => (
                    <div key={item.label} className="inspector-mini-card">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="stats-row">
        {dashboardData.stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <main className="dashboard-columns">
        <div className="dashboard-column dashboard-column-primary">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.inboxFocus}</span>
              <h2>{ui.importantMessages}</h2>
            </div>
            <span className="section-chip">{dashboardData.dateBadge}</span>
          </div>

          <div className="message-list">
            {dashboardData.inbox.map((item) => (
              <article className="message-card" key={item.subject}>
                <div className="message-topline">
                  <span className="sender">{item.sender}</span>
                  <span className={`tag tag-${item.tag.replace(/\s+/g, "-")}`}>{item.tag}</span>
                </div>
                <h3>{item.subject}</h3>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.deadlines}</span>
              <h2>{ui.timeSensitiveItems}</h2>
            </div>
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
            <p className="panel-summary">{ui.noDeadlines}</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.meetings}</span>
              <h2>{ui.calendarSignals}</h2>
            </div>
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
            <p className="panel-summary">{ui.noMeetings}</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.subscriptions}</span>
              <h2>{ui.recurringCharges}</h2>
            </div>
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
            <p className="panel-summary">{ui.noSubscriptions}</p>
          )}
        </section>
        </div>

        <div className="dashboard-column dashboard-column-secondary">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.actionBoard}</span>
              <h2>{ui.nextSteps}</h2>
            </div>
          </div>

          {dashboardData.actions.length > 0 ? (
            <ol className="action-list">
              {dashboardData.actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : (
            <p className="panel-summary">{ui.noFollowup}</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.workflow}</span>
              <h2>{ui.systemPath}</h2>
            </div>
            <button
              type="button"
              className="section-toggle"
              onClick={() => setActiveSheet((current) => (current === "workflow" ? null : "workflow"))}
            >
              {activeSheet === "workflow" ? ui.hide : ui.view}
            </button>
          </div>

          <p className="panel-summary">{ui.workflowSummary}</p>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.whyThisMatters}</span>
              <h2>{ui.projectValue}</h2>
            </div>
            <button
              type="button"
              className="section-toggle"
              onClick={() => setActiveSheet((current) => (current === "project" ? null : "project"))}
            >
              {activeSheet === "project" ? ui.hide : ui.view}
            </button>
          </div>

          <p className="panel-summary">{ui.projectSummary}</p>
        </section>
        </div>
      </main>

      {activeSheet ? (
        <div className="sheet-layer" role="presentation">
          <button
            type="button"
            className="sheet-backdrop"
            aria-label={ui.close}
            onClick={() => setActiveSheet(null)}
          />
          <aside className="sheet-panel" aria-label={getSheetTitle(activeSheet, ui)}>
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
                {activeSheet === "inspector" ? (
                  <dl className="meta-grid">
                    <div>
                      <dt>{ui.provider}</dt>
                      <dd>{dashboardData.provider}</dd>
                    </div>
                    <div>
                      <dt>{ui.language}</dt>
                      <dd>{dashboardData.language}</dd>
                    </div>
                    <div>
                      <dt>{ui.llm}</dt>
                      <dd>{dashboardData.llmProvider}</dd>
                    </div>
                    <div>
                      <dt>{ui.execution}</dt>
                      <dd>{dashboardData.executionMode}</dd>
                    </div>
                    <div>
                      <dt>{ui.startedAt}</dt>
                      <dd>{dashboardData.metadata.runStartedAt}</dd>
                    </div>
                    <div>
                      <dt>{ui.completedAt}</dt>
                      <dd>{dashboardData.metadata.runCompletedAt}</dd>
                    </div>
                    <div>
                      <dt>{ui.workflowDuration}</dt>
                      <dd>{dashboardData.metadata.workflowDuration}</dd>
                    </div>
                    <div>
                      <dt>{ui.inputTokens}</dt>
                      <dd>{dashboardData.metadata.inputTokens}</dd>
                    </div>
                    <div>
                      <dt>{ui.outputTokens}</dt>
                      <dd>{dashboardData.metadata.outputTokens}</dd>
                    </div>
                    <div>
                      <dt>{ui.totalTokens}</dt>
                      <dd>{dashboardData.metadata.totalTokens}</dd>
                    </div>
                    <div>
                      <dt>{ui.estimatedCost}</dt>
                      <dd>{dashboardData.metadata.estimatedCost}</dd>
                    </div>
                    <div>
                      <dt>{ui.emailCount}</dt>
                      <dd>{dashboardData.metadata.emailCount}</dd>
                    </div>
                    <div>
                      <dt>{ui.importantCount}</dt>
                      <dd>{dashboardData.metadata.importantEmailCount}</dd>
                    </div>
                    <div>
                      <dt>{ui.llmClassification}</dt>
                      <dd>{dashboardData.metadata.llmClassificationEnabled}</dd>
                    </div>
                    <div>
                      <dt>{ui.llmSummary}</dt>
                      <dd>{dashboardData.metadata.llmSummaryEnabled}</dd>
                    </div>
                    <div>
                      <dt>{ui.classificationRoute}</dt>
                      <dd>{dashboardData.metadata.classificationMode}</dd>
                    </div>
                    <div>
                      <dt>{ui.summaryRoute}</dt>
                      <dd>{dashboardData.metadata.summaryMode}</dd>
                    </div>
                    <div>
                      <dt>{ui.lowConfidenceItems}</dt>
                      <dd>{dashboardData.metadata.uncertainAssessmentCount}</dd>
                    </div>
                    <div>
                      <dt>{ui.abstainedItems}</dt>
                      <dd>{dashboardData.metadata.abstainedAssessmentCount}</dd>
                    </div>
                    <div>
                      <dt>{ui.llmFallbacks}</dt>
                      <dd>{dashboardData.metadata.llmFallbackCount}</dd>
                    </div>
                  </dl>
                ) : null}

                {activeSheet === "workflow" ? (
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

                {activeSheet === "project" ? (
                  <div className="sheet-stack">
                    <p className="sheet-summary">{ui.projectSummary}</p>
                    <ul className="story-list story-list-sheet">
                      <li>{ui.projectBullet1}</li>
                      <li>{ui.projectBullet2}</li>
                      <li>{ui.projectBullet3}</li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default App;

function RunLauncher({
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
        <label className="run-picker">
          <span>{ui.runProvider}</span>
          <select value={runProvider} onChange={(event) => setRunProvider(event.target.value)}>
            <option value="mock">{ui.mockLabel}</option>
            <option value="gmail">{ui.gmailLabel}</option>
          </select>
        </label>

        <label className="run-picker">
          <span>{ui.runDate}</span>
          <input type="date" value={triggerDate} onChange={(event) => setTriggerDate(event.target.value)} />
        </label>

        <button type="button" className="inspector-toggle run-trigger-button" onClick={onRun} disabled={isRunning}>
          {isRunning ? ui.runningRun : ui.runNow}
        </button>
      </div>

      {error ? <p className="signal-feedback signal-feedback-error">{error}</p> : null}
      {!error && message ? <p className="signal-feedback">{message}</p> : null}
    </div>
  );
}

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
  return ui.inspector;
}

function getSheetTitle(activeSheet, ui) {
  if (activeSheet === "workflow") {
    return ui.systemPath;
  }
  if (activeSheet === "project") {
    return ui.projectValue;
  }
  return ui.technicalMetadata;
}

function buildDashboardData(runData) {
  if (!runData) {
    return null;
  }

  const { summary, assessments, emails, deadlines, meetings, subscriptions, date, runMetadata } = runData;
  const importantIds = new Set(summary.important_email_ids ?? []);
  const importantEmails = emails.filter((email) => importantIds.has(email.id));
  const assessmentMap = new Map(assessments.map((item) => [item.email_id, item]));
  const provider = runMetadata?.provider ?? importantEmails[0]?.source ?? emails[0]?.source ?? "unknown";
  const locale = summary.language === "de" ? "de" : "en";
  const ui = UI_TEXT[locale];
  const language = locale === "de" ? ui.german : ui.english;

  return {
    ui,
    headline: summary.headline,
    overview: summary.overview,
    keyTakeaway:
      (runMetadata?.llm_fallback_count ?? 0) > 0
        ? ui.guardrailsBrief(runMetadata?.llm_fallback_count ?? 0)
        : ui.calmerBrief,
    dateLabel: formatDate(date, locale),
    dateBadge: date,
    provider: provider.toUpperCase(),
    language,
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
      sender: email.sender,
      subject: email.subject,
      tag: formatLabel(assessmentMap.get(email.id)?.label ?? "info"),
      summary: email.snippet || email.body_preview || ui.noPreview,
    })),
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
      { label: ui.provider, value: provider.toUpperCase() },
      { label: ui.language, value: language },
      { label: ui.workflowDuration, value: formatDuration(runMetadata?.workflow_duration_ms) },
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

function formatLabel(label) {
  return label.replace(/_/g, " ");
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
