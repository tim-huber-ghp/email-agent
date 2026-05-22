import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_RUN_PROVIDER = "mock";
const DEFAULT_TRIGGER_DATE = getTodayDateInputValue();
const LOCALE_STORAGE_KEY = "email-agent-ui-locale";
const EMPTY_STATE_ICONS = {
  deadlines: "⏰",
  meetings: "📅",
  subscriptions: "🔄",
};

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
    runAgentTitle: "Create a fresh summary",
    runAgentHint: "Choose a provider and date to generate an updated summary from your inbox.",
    runNow: "Create summary",
    runningRun: "Creating summary...",
    runCompleted: (date) => `Summary run completed for ${date}.`,
    runProvider: "Run with",
    runDate: "Run date",
    interfaceLanguage: "Interface",
    briefMode: "Overview",
    inspectMode: "Inspection",
    inspectTitle: "Deep inspection",
    openInspectMode: "Open inspect mode",
    briefHeadline: "Your day in email",
    currentRun: "Current summary",
    newRun: "New summary",
    launchHint: "Choose a provider and date, then create a fresh summary.",
    signalLabel: "Daily summary",
    runOverview: "Overview",
    close: "Close",
    hideDetails: "Hide details",
    showDetails: "Show details",
    savedRun: "Shown summary",
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
    emailCountFound: (count) => `${count} emails found for this day`,
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
    noImportantMessages: "No important emails were identified for this summary.",
    actionBoard: "Action board",
    nextSteps: "Next steps",
    noFollowup: "No follow-up actions were extracted for this summary.",
    deadlines: "Deadlines",
    timeSensitiveItems: "What needs attention soon",
    noDeadlines: "No upcoming deadlines or urgent items were found for this summary.",
    meetings: "Meetings",
    calendarSignals: "Meetings and invites",
    noMeetings: "No meetings or invitations were found.",
    subscriptions: "Subscriptions",
    recurringCharges: "Recurring charges",
    noSubscriptions: "No likely recurring subscriptions were extracted for this summary.",
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
    webdeLabel: "web.de",
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
    guardrailsBrief: (count) =>
      `Guardrails replaced ${count} low-confidence classifications with safer fallback logic.`,
    likelyRecurringFallback: "Likely recurring subscription signal detected.",
    noMeetingDetails: "No additional meeting details extracted.",
    responseLikelyNeeded: "Response likely needed",
    noDueHint: "No explicit due hint found.",
    allEmails: "All emails",
    runInbox: "View emails",
    inspectEveryEmail: "View every email captured in this summary, including informational and lower-priority messages.",
    openAllEmails: "Open all emails",
    emailDetail: "Email detail",
    emailList: "Emails",
    openEmail: "Open email",
    receivedAt: "Received",
    subject: "Subject",
    senderLabel: "Sender",
    reason: "Reason",
    reasonWhyItMatters: "Why it matters",
    bodyPreview: "Body preview",
    htmlView: "HTML view",
    textView: "Text view",
    originalEmail: "Original email",
    noHtmlBody: "No HTML version was captured for this email.",
    noBodyPreview: "No body preview was captured for this email.",
    importanceScore: "Importance score",
    needsAction: "Needs action",
    confidence: "Confidence",
    uncertainty: "Uncertainty",
    noUncertainty: "No uncertainty note recorded.",
    viewEvidence: "View email",
    inspectRunTab: "Overview",
    inspectWorkflowTab: "Workflow",
    inspectEmailsTab: "Emails",
    inspectEvidenceTab: "Details",
    inspectReviewTab: "Review",
    inspectWorkspace: "Workspace",
    noEmailsTabTitle: "No emails available",
    noEmailsTabBody: "This saved summary does not include any emails to inspect yet.",
    noEvidenceTabTitle: "No email selected",
    noEvidenceTabBody: "Choose an email in the Emails tab to inspect its details here.",
    reviewPanel: "Review queue",
    reviewPanelCopy: "Confirm, reject, or correct extracted items and keep the saved run aligned with human review.",
    reviewPanelScope: "You are reviewing extracted items from emails, such as action items, deadlines, meetings, or financial obligations.",
    correctionHelp: "Only revise this single extracted card, not the whole daily summary.",
    reviewDecisionHelp: "Confirm keeps this extracted item. Reject removes it as a false positive. Correct keeps it, but with better content.",
    rejectHelp: "Reject if this extracted item should not exist at all.",
    correctHelp: "Correct if the item is useful, but its wording or details are wrong.",
    noExtractedItemsTitle: "No extracted items available",
    noExtractedItemsBody: "This run does not include reviewable extracted items yet.",
    reviewPending: "Pending",
    reviewConfirmed: "Confirmed",
    reviewRejected: "Rejected",
    reviewCorrected: "Corrected",
    confirm: "Confirm",
    reject: "Reject",
    correct: "Correct",
    saveCorrection: "Save correction",
    correctionLabel: "Corrected item",
    correctionPlaceholder: "Write how this extracted item should appear instead.",
    reviewerNote: "Reviewer note",
    reviewerNotePlaceholder: "Optional note about why you confirmed, rejected, or corrected this item.",
    reviewSaved: "Review update saved.",
    reviewSaveFailed: "Could not save the review update.",
    reviewStatus: "Review status",
    sourceEvidence: "Source evidence",
    extractedType: "Type",
    correctedValue: "Corrected item",
    noCorrectedValue: "No corrected item saved.",
    extractedTypeLabels: {
      action_item: "Action item",
      deadline: "Deadline",
      meeting: "Meeting",
      financial_obligation: "Financial obligation",
      follow_up: "Follow-up",
    },
    categoryLabels: {
      urgent: "Urgent",
      needs_reply: "Needs reply",
      meeting: "Meeting",
      finance: "Finance",
      info: "Info",
      low_priority: "Low priority",
    },
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
    runAgentTitle: "Neue Zusammenfassung erstellen",
    runAgentHint: "Wähle Quelle und Datum, um eine aktualisierte Zusammenfassung aus deinem Posteingang zu erzeugen.",
    runNow: "Zusammenfassung erstellen",
    runningRun: "Zusammenfassung wird erstellt...",
    runCompleted: (date) => `Zusammenfassung für ${date} abgeschlossen.`,
    runProvider: "Ausführen mit",
    runDate: "Datum",
    interfaceLanguage: "Sprache",
    briefMode: "Übersicht",
    inspectMode: "Inspektion",
    inspectTitle: "Technische Einsicht",
    openInspectMode: "Inspect-Modus öffnen",
    briefHeadline: "Dein Tag in E-Mails",
    currentRun: "Aktuelle Zusammenfassung",
    newRun: "Neue Zusammenfassung",
    launchHint: "Quelle und Datum wählen und dann eine neue Zusammenfassung erstellen.",
    signalLabel: "Tageszusammenfassung",
    runOverview: "Überblick",
    close: "Schließen",
    hideDetails: "Details ausblenden",
    showDetails: "Details anzeigen",
    savedRun: "Angezeigte Zusammenfassung",
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
    emailCountFound: (count) => `${count} E-Mails an diesem Tag gefunden`,
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
    noImportantMessages: "Für diese Zusammenfassung wurden keine wichtigen E-Mails erkannt.",
    actionBoard: "Nächste Schritte",
    nextSteps: "Nächste Schritte",
    noFollowup: "Für diese Zusammenfassung wurden keine Folgeaktionen erkannt.",
    deadlines: "Fristen",
    timeSensitiveItems: "Was bald ansteht",
    noDeadlines: "Für diese Zusammenfassung wurden keine anstehenden Fristen oder dringenden Punkte erkannt.",
    meetings: "Besprechungen",
    calendarSignals: "Termine und Einladungen",
    noMeetings: "Es wurden keine Termine oder Einladungen erkannt.",
    subscriptions: "Abos",
    recurringCharges: "Wiederkehrende Kosten",
    noSubscriptions: "Für diese Zusammenfassung wurden keine wahrscheinlichen Abos erkannt.",
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
    webdeLabel: "web.de",
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
    guardrailsBrief: (count) =>
      `Guardrails haben ${count} unsichere Klassifizierungen durch sicherere Fallback-Logik ersetzt.`,
    likelyRecurringFallback: "Wahrscheinliches Signal für ein wiederkehrendes Abo erkannt.",
    noMeetingDetails: "Keine weiteren Besprechungsdetails erkannt.",
    responseLikelyNeeded: "Antwort wahrscheinlich nötig",
    noDueHint: "Keine ausdrückliche Frist erkannt.",
    allEmails: "Alle E-Mails",
    runInbox: "E-Mails anzeigen",
    inspectEveryEmail: "Alle E-Mails aus dieser Zusammenfassung ansehen, auch Info- und weniger wichtige Nachrichten.",
    openAllEmails: "Alle E-Mails öffnen",
    emailDetail: "E-Mail-Detail",
    emailList: "E-Mails",
    openEmail: "E-Mail öffnen",
    receivedAt: "Empfangen",
    subject: "Betreff",
    senderLabel: "Absender",
    reason: "Begründung",
    reasonWhyItMatters: "Warum wichtig",
    bodyPreview: "Textvorschau",
    htmlView: "HTML-Ansicht",
    textView: "Textansicht",
    originalEmail: "Original-E-Mail",
    noHtmlBody: "Für diese E-Mail wurde keine HTML-Version erfasst.",
    noBodyPreview: "Für diese E-Mail wurde keine Textvorschau erfasst.",
    importanceScore: "Wichtigkeitswert",
    needsAction: "Aktion nötig",
    confidence: "Konfidenz",
    uncertainty: "Unsicherheit",
    noUncertainty: "Kein Unsicherheitshinweis erfasst.",
    viewEvidence: "E-Mail ansehen",
    inspectRunTab: "Überblick",
    inspectWorkflowTab: "Ablauf",
    inspectEmailsTab: "E-Mails",
    inspectEvidenceTab: "Details",
    inspectReviewTab: "Review",
    inspectWorkspace: "Arbeitsbereich",
    noEmailsTabTitle: "Keine E-Mails vorhanden",
    noEmailsTabBody: "Diese gespeicherte Zusammenfassung enthält derzeit keine E-Mails zur Prüfung.",
    noEvidenceTabTitle: "Keine E-Mail ausgewählt",
    noEvidenceTabBody: "Wähle im Tab E-Mails eine Nachricht aus, um hier ihre Details zu sehen.",
    reviewPanel: "Review-Warteschlange",
    reviewPanelCopy: "Bestätige, verwerfe oder korrigiere extrahierte Einträge und halte den gespeicherten Lauf mit menschlichem Review synchron.",
    reviewPanelScope: "Hier prüfst du extrahierte Einträge aus E-Mails, zum Beispiel Action Items, Fristen, Besprechungen oder finanzielle Hinweise.",
    correctionHelp: "Hier änderst du nur diese einzelne extrahierte Karte, nicht die gesamte Tageszusammenfassung.",
    reviewDecisionHelp: "Bestätigen behält diesen extrahierten Eintrag. Verwerfen markiert ihn als Fehlfund. Korrigieren behält ihn, aber mit besserem Inhalt.",
    rejectHelp: "Verwerfen, wenn dieser extrahierte Eintrag gar nicht hätte existieren sollen.",
    correctHelp: "Korrigieren, wenn der Eintrag sinnvoll ist, aber Text oder Details falsch sind.",
    noExtractedItemsTitle: "Keine extrahierten Einträge verfügbar",
    noExtractedItemsBody: "Dieser Lauf enthält noch keine reviewbaren extrahierten Einträge.",
    reviewPending: "Ausstehend",
    reviewConfirmed: "Bestätigt",
    reviewRejected: "Verworfen",
    reviewCorrected: "Korrigiert",
    confirm: "Bestätigen",
    reject: "Verwerfen",
    correct: "Korrigieren",
    saveCorrection: "Korrektur speichern",
    correctionLabel: "Korrigierter Eintrag",
    correctionPlaceholder: "Schreibe hier, wie dieser extrahierte Eintrag korrekt lauten sollte.",
    reviewerNote: "Review-Notiz",
    reviewerNotePlaceholder: "Optionale Notiz dazu, warum dieser Eintrag bestätigt, verworfen oder korrigiert wurde.",
    reviewSaved: "Review-Update gespeichert.",
    reviewSaveFailed: "Review-Update konnte nicht gespeichert werden.",
    reviewStatus: "Review-Status",
    sourceEvidence: "Quellbeleg",
    extractedType: "Typ",
    correctedValue: "Korrigierter Eintrag",
    noCorrectedValue: "Noch kein korrigierter Eintrag gespeichert.",
    extractedTypeLabels: {
      action_item: "Nächster Schritt",
      deadline: "Frist",
      meeting: "Besprechung",
      financial_obligation: "Finanzieller Punkt",
      follow_up: "Follow-up",
    },
    categoryLabels: {
      urgent: "Dringend",
      needs_reply: "Antwort nötig",
      meeting: "Besprechung",
      finance: "Finanzen",
      info: "Info",
      low_priority: "Niedrige Priorität",
    },
    heuristicOrFallback: "Heuristik oder Fallback",
    llmAssisted: "LLM-gestützt",
    runModeMixed: (classification, summary) => `${classification} / ${summary}`,
  },
};

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

  async function handleRunChange(event) {
    const nextDate = event.target.value;
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
            <select value={interfaceLocale} onChange={(event) => setInterfaceLocale(event.target.value)}>
              <option value="de">{ui.german}</option>
              <option value="en">{ui.english}</option>
            </select>
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
                    <select value={selectedRunDate} onChange={handleRunChange}>
                      {runs.map((run) => (
                        <option key={run.date} value={run.date}>
                          {run.date} {run.isMock ? `(${ui.mockLabel})` : `(${run.provider})`}
                        </option>
                      ))}
                    </select>
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
                  <select value={selectedRunDate} onChange={handleRunChange}>
                    {runs.map((run) => (
                      <option key={run.date} value={run.date}>
                        {run.date} {run.isMock ? `(${ui.mockLabel})` : `(${run.provider})`}
                      </option>
                    ))}
                  </select>
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
                          <EmailDetailContent selectedEmailDetail={selectedEmailDetail} ui={ui} />
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
                        <EmailDetailContent selectedEmailDetail={selectedEmailDetail} ui={ui} />
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <EmailDetailContent selectedEmailDetail={selectedEmailDetail} ui={ui} />
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

function EmailDetailContent({ selectedEmailDetail, ui }) {
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

function EmptyTabPlaceholder({ title, body }) {
  return (
    <section className="inspect-empty-state">
      <span className="section-kicker">Info</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  );
}

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
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const providerMenuRef = useRef(null);
  const providerOptions = [
    { value: "mock", label: ui.mockLabel },
    { value: "gmail", label: ui.gmailLabel },
    { value: "webde", label: ui.webdeLabel },
  ];
  const selectedProvider = providerOptions.find((option) => option.value === runProvider) ?? providerOptions[0];

  useEffect(() => {
    if (!isProviderOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!providerMenuRef.current?.contains(event.target)) {
        setIsProviderOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsProviderOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProviderOpen]);

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
          <div className={`select-shell ${isProviderOpen ? "select-shell-open" : ""}`} ref={providerMenuRef}>
            <button
              type="button"
              className="run-picker-select"
              aria-haspopup="listbox"
              aria-expanded={isProviderOpen}
              onClick={() => setIsProviderOpen((current) => !current)}
            >
              <span>{selectedProvider.label}</span>
              <span className="run-picker-caret" aria-hidden="true" />
            </button>
            {isProviderOpen ? (
              <div className="run-picker-menu" role="listbox" aria-label={ui.runProvider}>
                {providerOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === runProvider}
                    className={`run-picker-option ${option.value === runProvider ? "run-picker-option-active" : ""}`}
                    onClick={() => {
                      setRunProvider(option.value);
                      setIsProviderOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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

function ReviewItemCard({ item, ui, isSaving, onReview }) {
  const [isCorrecting, setIsCorrecting] = useState(item.reviewStatus === "corrected");
  const [correctionText, setCorrectionText] = useState(formatReviewedValue(item.reviewedValue));
  const [reviewerNote, setReviewerNote] = useState(item.reviewerNote ?? "");

  useEffect(() => {
    setIsCorrecting(item.reviewStatus === "corrected");
    setCorrectionText(formatReviewedValue(item.reviewedValue));
    setReviewerNote(item.reviewerNote ?? "");
  }, [item.id, item.reviewStatus, item.reviewedValue, item.reviewerNote]);

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
