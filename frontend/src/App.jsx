import { useEffect, useMemo, useState } from "react";

import {
  CustomSelect,
  RunLauncher,
} from "./components/AppComponents";
import {
  ActiveSheetOverlay,
  BriefModeView,
  InspectModeView,
} from "./components/AppSections";
import {
  buildCorrectionPlaceholder,
  buildEmailHtmlDocument,
  fetchJson,
  formatReviewedValue,
  getInitialInterfaceLocale,
  getSheetKicker,
  getSheetTitle,
  getTodayDateInputValue,
  LOCALE_STORAGE_KEY,
  pickPreferredRun,
} from "./appHelpers";
import { buildDashboardData } from "./dashboardData";
import { UI_TEXT } from "./uiText";

const DEFAULT_RUN_PROVIDER = "mock";
const DEFAULT_TRIGGER_DATE = getTodayDateInputValue();

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
          language: interfaceLocale,
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
        <BriefModeView
          ui={ui}
          dashboardData={dashboardData}
          selectedRunDate={selectedRunDate}
          runSelectOptions={runSelectOptions}
          onRunChange={handleRunChange}
          runProvider={runProvider}
          setRunProvider={setRunProvider}
          triggerDate={triggerDate}
          setTriggerDate={setTriggerDate}
          isRunning={isRunning}
          onRunTrigger={handleRunTrigger}
          runActionError={runActionError}
          runActionMessage={runActionMessage}
          hasInboxMessages={hasInboxMessages}
          hasActions={hasActions}
          hasDeadlines={hasDeadlines}
          hasMeetings={hasMeetings}
          hasSubscriptions={hasSubscriptions}
          isBriefMostlyEmpty={isBriefMostlyEmpty}
          onOpenEmailList={() => setActiveSheet("email-list")}
          onOpenEmail={(emailId) => {
            setSelectedEmailId(emailId);
            setActiveSheet("email");
          }}
        />
      ) : (
        <InspectModeView
          ui={ui}
          dashboardData={dashboardData}
          selectedRunDate={selectedRunDate}
          runSelectOptions={runSelectOptions}
          onRunChange={handleRunChange}
          inspectTabs={inspectTabs}
          inspectTab={inspectTab}
          setInspectTab={setInspectTab}
          activeInspectTabLabel={activeInspectTabLabel}
          reviewActionError={reviewActionError}
          reviewActionMessage={reviewActionMessage}
          savingReviewItemId={savingReviewItemId}
          onReviewUpdate={handleReviewUpdate}
          selectedEmailDetail={selectedEmailDetail}
          setSelectedEmailId={setSelectedEmailId}
          formatReviewedValue={formatReviewedValue}
          buildCorrectionPlaceholder={buildCorrectionPlaceholder}
          buildEmailHtmlDocument={buildEmailHtmlDocument}
        />
      )}

      <ActiveSheetOverlay
        activeSheet={activeSheet}
        selectedEmailDetail={selectedEmailDetail}
        dashboardData={dashboardData}
        ui={ui}
        onClose={() => setActiveSheet(null)}
        setSelectedEmailId={setSelectedEmailId}
        getSheetKicker={getSheetKicker}
        getSheetTitle={getSheetTitle}
        buildEmailHtmlDocument={buildEmailHtmlDocument}
      />
    </div>
  );
}

export default App;
