import { useEffect, useMemo, useState } from "react";

function App() {
  const [runs, setRuns] = useState([]);
  const [selectedRunDate, setSelectedRunDate] = useState("");
  const [runData, setRunData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  if (loading && !runData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">Loading</span>
          <h2>Loading run artifacts...</h2>
        </div>
      </div>
    );
  }

  if (error && !runData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">Frontend</span>
          <h2>Could not load saved runs</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!runData || !dashboardData) {
    return (
      <div className="page-shell">
        <div className="panel empty-state">
          <span className="section-kicker">No data yet</span>
          <h2>Run the email agent first</h2>
          <p>Saved summaries from <code>data/runs/</code> will appear here automatically.</p>
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
          <span className="live-pill">Live run artifact viewer</span>
        </div>

        <div className="hero-grid">
          <div>
            <h1>{dashboardData.headline}</h1>
            <p className="hero-copy">{dashboardData.overview}</p>
            <p className="hero-note">{dashboardData.keyTakeaway}</p>
          </div>

          <div className="signal-card">
            <div className="signal-label">Daily summary</div>
            <div className="signal-date">{dashboardData.dateLabel}</div>
            <label className="run-picker">
              <span>Saved run</span>
              <select value={selectedRunDate} onChange={handleRunChange}>
                {runs.map((run) => (
                  <option key={run.date} value={run.date}>
                    {run.date} {run.isMock ? "(mock)" : `(${run.provider})`}
                  </option>
                ))}
              </select>
            </label>

            <dl className="meta-grid">
              <div>
                <dt>Provider</dt>
                <dd>{dashboardData.provider}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{dashboardData.language}</dd>
              </div>
              <div>
                <dt>LLM</dt>
                <dd>{dashboardData.llmProvider}</dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>{dashboardData.executionMode}</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <section className="stats-row">
        {dashboardData.stats.map((stat) => (
          <article className={`stat-card tone-${stat.tone}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <main className="dashboard-grid">
        <section className="panel panel-wide">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Inbox focus</span>
              <h2>Important messages</h2>
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
              <span className="section-kicker">Action board</span>
              <h2>Next steps</h2>
            </div>
          </div>

          <ol className="action-list">
            {dashboardData.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Workflow</span>
              <h2>LangGraph path</h2>
            </div>
          </div>

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
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Why this matters</span>
              <h2>CV story</h2>
            </div>
          </div>

          <ul className="story-list">
            <li>Run artifacts are loaded directly from <code>data/runs/</code>.</li>
            <li>Each dashboard view is based on the same saved summary JSON used for debugging.</li>
            <li>This makes the UI portfolio-friendly even before adding a backend API.</li>
            <li>The next upgrade could be a Python API or live push after each summary run.</li>
          </ul>
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

  const { summary, assessments, emails, date } = runData;
  const importantIds = new Set(summary.important_email_ids ?? []);
  const importantEmails = emails.filter((email) => importantIds.has(email.id));
  const assessmentMap = new Map(assessments.map((item) => [item.email_id, item]));
  const provider = importantEmails[0]?.source ?? emails[0]?.source ?? "unknown";
  const language = summary.language === "de" ? "German" : "English";

  return {
    headline: summary.headline,
    overview: summary.overview,
    keyTakeaway:
      "This view is driven by saved run artifacts, so the frontend can already inspect real summaries without waiting for a backend API.",
    dateLabel: formatDate(date),
    dateBadge: date,
    provider: provider.toUpperCase(),
    language,
    llmProvider: "From backend config",
    executionMode: detectExecutionMode(summary, assessments),
    stats: [
      { label: "Important mails", value: String(summary.important_email_ids.length), tone: "coral" },
      { label: "Action items", value: String(summary.action_items.length), tone: "gold" },
      { label: "Provider", value: provider, tone: "teal" },
      { label: "Language", value: summary.language, tone: "blue" },
    ],
    actions: summary.action_items.map((item) => item.description),
    inbox: importantEmails.map((email) => ({
      sender: email.sender,
      subject: email.subject,
      tag: formatLabel(assessmentMap.get(email.id)?.label ?? "info"),
      summary: email.snippet || email.body_preview || "No preview available.",
    })),
    timeline: [
      {
        title: "Saved summary",
        detail: `Loaded summary.json for ${date} with ${summary.important_email_ids.length} important emails.`,
        status: "completed",
      },
      {
        title: "Assessment join",
        detail: `Mapped ${assessments.length} assessments to normalized emails for UI rendering.`,
        status: "completed",
      },
      {
        title: "Artifact-backed UI",
        detail: "This dashboard reflects real persisted outputs from the Python workflow.",
        status: "completed",
      },
      {
        title: "Next step",
        detail: "Add metadata such as exact LLM provider and workflow route to the saved run payload.",
        status: "next",
      },
    ],
  };
}

function formatDate(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

function formatLabel(label) {
  return label.replace(/_/g, " ");
}

function detectExecutionMode(summary, assessments) {
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
    return heuristicReasons ? "Heuristic or fallback" : "LLM-assisted";
  }

  return "Unknown";
}
