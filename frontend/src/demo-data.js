export const dashboardData = {
  dateLabel: "Sunday, May 10",
  provider: "Gmail",
  language: "German",
  llmProvider: "Gemini 2.5 Flash",
  executionMode: "LLM",
  headline: "Wichtige E-Mails brauchen heute deine Aufmerksamkeit.",
  overview:
    "Du hast heute 4 wichtige E-Mails erhalten. Wichtigste Kategorien: 1 dringend, 1 Besprechung, 1 Finanzen, 1 Antwort noetig.",
  keyTakeaway:
    "The system already handles real Gmail read-only access, language switching, and LLM fallback tracing.",
  stats: [
    { label: "Important mails", value: "4", tone: "coral" },
    { label: "Action items", value: "4", tone: "gold" },
    { label: "Provider", value: "gmail", tone: "teal" },
    { label: "LLM route", value: "live", tone: "blue" },
  ],
  actions: [
    "Antworte moeglichst schnell auf 'Urgent: Please reply with the final budget today' von manager@example.com oder pruefe die Nachricht sofort.",
    "Pruefe die Besprechungsdetails in 'Team meeting invite for Monday'.",
    "Pruefe die finanzbezogene Nachricht 'Invoice for May subscription'.",
    "Bearbeite die E-Mail 'FYI: project update' von colleague@example.com weiter.",
  ],
  inbox: [
    {
      sender: "Alice Example",
      subject: "Urgent: Please reply with the final budget today",
      tag: "urgent",
      summary: "Needs a same-day response before the afternoon deadline.",
    },
    {
      sender: "Calendar Bot",
      subject: "Team meeting invite for Monday",
      tag: "meeting",
      summary: "Contains the schedule and attendance confirmation request.",
    },
    {
      sender: "Billing SaaS",
      subject: "Invoice for May subscription",
      tag: "finance",
      summary: "Monthly invoice that should be reviewed before the next billing cycle.",
    },
    {
      sender: "Colleague",
      subject: "FYI: project update",
      tag: "needs reply",
      summary: "Status update that still hints at follow-up if blockers appear.",
    },
  ],
  timeline: [
    {
      title: "Gmail fetch",
      detail: "Read-only inbox sync with OAuth token cache under data/auth/",
      status: "completed",
    },
    {
      title: "Normalization",
      detail: "Multipart parsing, sender cleanup, snippet cleanup, body preview extraction",
      status: "completed",
    },
    {
      title: "LangGraph routing",
      detail: "Conditional branches for quiet inboxes, LLM attempts, and heuristic fallback",
      status: "completed",
    },
    {
      title: "Frontend sync",
      detail: "Next step: connect this dashboard to saved run artifacts or a tiny API",
      status: "next",
    },
  ],
};
