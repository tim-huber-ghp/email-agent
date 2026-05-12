import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runsDir = path.resolve(__dirname, "../data/runs");

function runArtifactsPlugin() {
  return {
    name: "email-agent-run-artifacts",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/runs")) {
          next();
          return;
        }

        try {
          const payload = await handleRunsRequest(req.url);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/runs")) {
          next();
          return;
        }

        try {
          const payload = await handleRunsRequest(req.url);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }));
        }
      });
    },
  };
}

async function handleRunsRequest(url) {
  const pathname = url.split("?")[0];

  if (pathname === "/api/runs") {
    return { runs: await listRuns() };
  }

  if (pathname === "/api/runs/latest") {
    const runs = await listRuns();
    if (runs.length === 0) {
      return { run: null };
    }
    return { run: await readRun(runs[0].date) };
  }

  const prefix = "/api/runs/";
  if (pathname.startsWith(prefix)) {
    const date = pathname.slice(prefix.length);
    return { run: await readRun(date) };
  }

  return { runs: [] };
}

async function listRuns() {
  try {
    const entries = await fs.readdir(runsDir, { withFileTypes: true });
    const runDates = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    const runs = await Promise.all(runDates.map((date) => readRunMeta(date)));
    return runs.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

async function readRunMeta(date) {
  const runDir = path.join(runsDir, date);

  try {
    const [summaryRaw, emailsRaw, metadata] = await Promise.all([
      fs.readFile(path.join(runDir, "summary.json"), "utf-8"),
      fs.readFile(path.join(runDir, "emails.json"), "utf-8"),
      readOptionalJson(path.join(runDir, "run_metadata.json")),
    ]);

    const summary = JSON.parse(summaryRaw);
    const emails = JSON.parse(emailsRaw);
    const provider = emails[0]?.source ?? "unknown";

    return {
      date,
      provider: metadata?.provider ?? provider,
      language: metadata?.language ?? summary.language ?? "en",
      isMock: provider === "mock",
      executionMode: metadata?.summary_mode ?? "unknown",
    };
  } catch {
    return {
      date,
      provider: "unknown",
      language: "en",
      isMock: false,
      executionMode: "unknown",
    };
  }
}

async function readRun(date) {
  const runDir = path.join(runsDir, date);
  const [summaryRaw, assessmentsRaw, emailsRaw, metadata, deadlines, meetings, subscriptions] = await Promise.all([
    fs.readFile(path.join(runDir, "summary.json"), "utf-8"),
    fs.readFile(path.join(runDir, "assessments.json"), "utf-8"),
    fs.readFile(path.join(runDir, "emails.json"), "utf-8"),
    readOptionalJson(path.join(runDir, "run_metadata.json")),
    readOptionalJson(path.join(runDir, "deadlines.json")),
    readOptionalJson(path.join(runDir, "meetings.json")),
    readOptionalJson(path.join(runDir, "subscriptions.json")),
  ]);

  const summary = JSON.parse(summaryRaw);
  const assessments = JSON.parse(assessmentsRaw);
  const emails = JSON.parse(emailsRaw);

  return {
    date,
    summary,
    assessments,
    emails,
    deadlines: deadlines ?? [],
    meetings: meetings ?? [],
    subscriptions: subscriptions ?? [],
    runMetadata:
      metadata ??
      buildFallbackRunMetadata({
        date,
        summary,
        assessments,
        emails,
      }),
  };
}

async function readOptionalJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function buildFallbackRunMetadata({ date, summary, assessments, emails }) {
  const provider = emails[0]?.source ?? "unknown";
  const importantEmailCount = Array.isArray(summary.important_email_ids)
    ? summary.important_email_ids.length
    : Array.isArray(assessments)
      ? assessments.filter((assessment) => (assessment.importance_score ?? 0) >= 50).length
      : 0;

  return {
    run_date: date,
    run_started_at: "",
    run_completed_at: "",
    provider,
    language: summary.language ?? "en",
    llm_enabled: false,
    llm_provider: "unknown",
    llm_classification_enabled: false,
    llm_summary_enabled: false,
    classification_mode: "unknown",
    summary_mode: "unknown",
    workflow_duration_ms: 0,
    step_durations_ms: {},
    email_count: Array.isArray(emails) ? emails.length : 0,
    filtered_email_count: Array.isArray(assessments) ? assessments.length : 0,
    important_email_count: importantEmailCount,
    uncertain_assessment_count: 0,
    abstained_assessment_count: 0,
    llm_fallback_count: 0,
  };
}

export default defineConfig({
  plugins: [react(), runArtifactsPlugin()],
});
