import { useEffect, useMemo, useState } from "react";

const UI_TEXT = {
  en: {
    loadingKicker: "Loading",
    loadingTitle: "Loading run artifacts...",
    frontendKicker: "Frontend",
    loadErrorTitle: "Could not load saved runs",
    noDataKicker: "No data yet",
    noDataTitle: "Run the email agent first",
    noDataBody: "Saved summaries from data/runs/ will appear here automatically.",
    livePill: "Run dashboard",
    signalLabel: "Daily summary",
    hideDetails: "Hide details",
    showDetails: "Show details",
    savedRun: "Saved run",
    inspector: "Inspector",
    technicalMetadata: "Technical metadata",
    provider: "Provider",
    language: "Language",
    llm: "LLM",
    execution: "Execution",
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
  },
  de: {
    loadingKicker: "Laden",
    loadingTitle: "Laufartefakte werden geladen...",
    frontendKicker: "Frontend",
    loadErrorTitle: "Gespeicherte Läufe konnten nicht geladen werden",
    noDataKicker: "Noch keine Daten",
    noDataTitle: "Starte den Email-Agenten zuerst",
    noDataBody: "Gespeicherte Zusammenfassungen aus data/runs/ erscheinen hier automatisch.",
    livePill: "Übersicht",
    signalLabel: "Tageszusammenfassung",
    hideDetails: "Details ausblenden",
    showDetails: "Details anzeigen",
    savedRun: "Gespeicherter Lauf",
    inspector: "Inspektor",
    technicalMetadata: "Technische Metadaten",
    provider: "Quelle",
    language: "Sprache",
    llm: "LLM",
    execution: "Ausführung",
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
  },
};

function App() {
  const [runs, setRuns] = useState([]);
  const [selectedRunDate, setSelectedRunDate] = useState("");
  const [runData, setRunData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInspector, setShowInspector] = useState(false);
  const [showSystemPath, setShowSystemPath] = useState(false);
  const [showProjectValue, setShowProjectValue] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      try {
        setLoading(true);
        const runsResponse = await fetch("/api/runs");
        const runsPayload = await runsResponse.json();
        if (cancelled) {
          return;
        }

        const availableRuns = runsPayload.runs ?? [];
        setRuns(availableRuns);

        if (availableRuns.length === 0) {
          setRunData(null);
          setSelectedRunDate("");
          setError("");
          return;
        }

        const preferredRun = pickPreferredRun(availableRuns);
        const latestRun = await fetchRun(preferredRun.date);
        if (cancelled) {
          return;
        }

        setRunData(latestRun);
        setSelectedRunDate(preferredRun.date);
        setError("");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load run data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRuns();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchRun(date) {
    const response = await fetch(`/api/runs/${date}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load selected run.");
    }
    return payload.run;
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
          <div>
            <h1>{dashboardData.headline}</h1>
            <div className="hero-summary-frame">
              <p className="hero-copy">{dashboardData.overview}</p>
              {dashboardData.keyTakeaway ? (
                <p className="hero-note">{dashboardData.keyTakeaway}</p>
              ) : null}
            </div>
          </div>

          <div className="signal-card">
            <div className="signal-topline">
              <div>
                <div className="signal-label">{ui.signalLabel}</div>
                <div className="signal-date">{dashboardData.dateLabel}</div>
              </div>
              <button
                type="button"
                className="inspector-toggle"
                onClick={() => setShowInspector((current) => !current)}
              >
                {showInspector ? ui.hideDetails : ui.showDetails}
              </button>
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

            {showInspector ? (
              <div className="inspector-card">
                <div className="inspector-header">
                  <span className="section-kicker">{ui.inspector}</span>
                  <span className="inspector-note">{ui.technicalMetadata}</span>
                </div>

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
              </div>
            ) : null}
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

      <main className="dashboard-grid">
        <section className="panel panel-wide">
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

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{ui.workflow}</span>
              <h2>{ui.systemPath}</h2>
            </div>
            <button
              type="button"
              className="section-toggle"
              onClick={() => setShowSystemPath((current) => !current)}
            >
              {showSystemPath ? ui.hide : ui.view}
            </button>
          </div>

          <p className="panel-summary">{ui.workflowSummary}</p>

          {showSystemPath ? (
            <div className="details-drawer">
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
              onClick={() => setShowProjectValue((current) => !current)}
            >
              {showProjectValue ? ui.hide : ui.view}
            </button>
          </div>

          <p className="panel-summary">{ui.projectSummary}</p>

          {showProjectValue ? (
            <div className="details-drawer">
              <ul className="story-list">
                <li>{ui.projectBullet1}</li>
                <li>{ui.projectBullet2}</li>
                <li>{ui.projectBullet3}</li>
              </ul>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default App;

function pickPreferredRun(runs) {
  const realRun = runs.find((run) => !run.isMock);
  return realRun ?? runs[0];
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
    executionMode: formatMode(runMetadata?.summary_mode, ui) ?? detectExecutionMode(summary, assessments, ui),
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
    timeline: [
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
    ],
    metadata: {
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
  };
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
