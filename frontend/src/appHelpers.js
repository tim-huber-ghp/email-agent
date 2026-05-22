export const LOCALE_STORAGE_KEY = "email-agent-ui-locale";

export function pickPreferredRun(runs, preferredDate = "") {
  if (preferredDate) {
    const matchingRun = runs.find((run) => run.date === preferredDate);
    if (matchingRun) {
      return matchingRun;
    }
  }

  const realRun = runs.find((run) => !run.isMock);
  return realRun ?? runs[0];
}

export async function fetchJson(url, fallbackMessage, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? fallbackMessage);
  }
  return payload;
}

export function getTodayDateInputValue() {
  const today = new Date();
  const timezoneOffsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function getInitialInterfaceLocale() {
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

export function getSheetKicker(activeSheet, ui) {
  if (activeSheet === "workflow") {
    return ui.workflow;
  }
  if (activeSheet === "project") {
    return ui.whyThisMatters;
  }
  if (activeSheet === "email-list" || activeSheet === "email") {
    return ui.allEmails;
  }
  return ui.inspector;
}

export function getSheetTitle(activeSheet, ui) {
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

export function formatReviewedValue(reviewedValue) {
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

export function buildCorrectionPlaceholder(item, ui) {
  const parts = [item.title || item.description, ...item.detailLines].filter(Boolean);
  return parts.join(" | ") || ui.correctionPlaceholder;
}

export function buildEmailHtmlDocument(rawHtml) {
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
