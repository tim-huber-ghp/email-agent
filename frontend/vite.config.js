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
    const [summaryRaw, emailsRaw] = await Promise.all([
      fs.readFile(path.join(runDir, "summary.json"), "utf-8"),
      fs.readFile(path.join(runDir, "emails.json"), "utf-8"),
    ]);

    const summary = JSON.parse(summaryRaw);
    const emails = JSON.parse(emailsRaw);
    const provider = emails[0]?.source ?? "unknown";

    return {
      date,
      provider,
      language: summary.language ?? "en",
      isMock: provider === "mock",
    };
  } catch {
    return {
      date,
      provider: "unknown",
      language: "en",
      isMock: false,
    };
  }
}

async function readRun(date) {
  const runDir = path.join(runsDir, date);
  const [summaryRaw, assessmentsRaw, emailsRaw] = await Promise.all([
    fs.readFile(path.join(runDir, "summary.json"), "utf-8"),
    fs.readFile(path.join(runDir, "assessments.json"), "utf-8"),
    fs.readFile(path.join(runDir, "emails.json"), "utf-8"),
  ]);

  return {
    date,
    summary: JSON.parse(summaryRaw),
    assessments: JSON.parse(assessmentsRaw),
    emails: JSON.parse(emailsRaw),
  };
}

export default defineConfig({
  plugins: [react(), runArtifactsPlugin()],
});
