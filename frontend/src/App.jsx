import { dashboardData } from "./demo-data";

function App() {
  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="hero-card">
        <div className="eyebrow-row">
          <span className="eyebrow">Email Agent</span>
          <span className="live-pill">Portfolio-ready demo</span>
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
            <span className="section-chip">Today</span>
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
            <li>Real Gmail OAuth and read-only ingestion</li>
            <li>LangGraph routing with explicit fallback branches</li>
            <li>Multi-provider LLM support with OpenAI or Gemini</li>
            <li>Localized summaries and inspectable run artifacts</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
