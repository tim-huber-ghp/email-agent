import { UI_TEXT } from "./uiText";

export function buildDashboardData(runData, interfaceLocale) {
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
      detail: formatMeetingDetail(item, ui),
    })),
    subscriptions: subscriptions.map((item) => ({
      serviceName: item.service_name,
      renewalHint: item.renewal_hint,
      cancellationHint: item.cancellation_hint,
      amountHint: item.amount_hint,
      sourceEmailId: item.source_email_id,
      detail: formatSubscriptionDetail(item, ui),
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

function formatMeetingDetail(item, ui) {
  const parts = [item.when_hint ?? item.whenHint, item.location_hint ?? item.locationHint].filter(Boolean);
  if (item.needs_response ?? item.needsResponse) {
    parts.push(ui.responseLikelyNeeded);
  }
  return parts.join(" · ") || ui.noMeetingDetails;
}

function formatSubscriptionDetail(item, ui) {
  const parts = [
    item.renewal_hint ?? item.renewalHint,
    item.amount_hint ?? item.amountHint,
    item.cancellation_hint ?? item.cancellationHint,
  ].filter(Boolean);
  return parts.join(" · ") || ui.likelyRecurringFallback;
}
