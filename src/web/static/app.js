import {
  bodyEl,
  BREASTFEED_COMPLETE_NOTE,
  BREASTFEED_IN_PROGRESS_NOTE,
  BREASTFEED_TIMER_KEY,
  buildUrl,
  CHART_CONFIG,
  CHART_EVENT_TYPES,
  CUSTOM_TYPE_MAX_LENGTH,
  DB_NAME,
  DB_VERSION,
  INDEX_ENTRIES_TS,
  INDEX_ENTRIES_TYPE_TS,
  INDEX_ENTRIES_USER,
  INDEX_ENTRIES_USER_TS,
  logFilterType,
  logWindowHours,
  META_DEVICE_ID,
  META_SYNC_CURSOR,
  MILK_EXPRESS_TYPE,
  OFFLINE_WINDOW_DAYS,
  pageType,
  RESERVED_USER_SLUGS,
  SLEEP_GANTT_DEFAULT_OVERLAYS,
  SLEEP_GANTT_TYPE_COLORS,
  statusEl,
  STORE_ENTRIES,
  STORE_META,
  STORE_OUTBOX,
  THEME_KEY,
  TIMED_EVENT_TIMER_KEY,
  TIMED_EVENT_TYPES,
  USER_KEY,
} from "./app/core/config.js";
import {
  formatDateInputValue,
  getDateKey,
  getDateKeyFromTimestamp,
  getGoalDayWindow,
  getHourKey,
  getLocalMidnightTs,
  getNextLocalMidnightTs,
  getSummaryDayWindow,
  isSameDay,
  parseDateInputValue,
  parseDob,
  toLocalDateTimeValue,
} from "./app/core/dates.js";
import {
  buildFeedShortcutUrl,
  formatAge,
  formatAverageDuration,
  formatAverageMl,
  formatDurationMinutes,
  formatEntryTypeLabel,
  formatFeedTime,
  formatMl,
  formatRangeLabel,
  formatRelativeTime,
  formatSummaryDateLabel,
  formatSummaryTime,
  formatTimeUntil,
  formatTimelineDay,
  formatTimelineHour,
  formatTimestamp,
  getTimelineTypeConfig,
  hexToRgba,
  normalizeEntryType,
  normalizeUserSlug,
  parseMilkExpressNotes,
} from "./app/core/formatters.js";
import { state } from "./app/core/state.js";

const themeToggleBtn = document.getElementById("theme-toggle");
const navMenuToggleBtn = document.getElementById("nav-menu-toggle");
const navMenuPanelEl = document.getElementById("nav-menu-panel");
const userFormEl = document.getElementById("user-form");
const userInputEl = document.getElementById("user-input");
const userMessageEl = document.getElementById("today-label")
  || document.getElementById("user-message");
const userChipEl = document.getElementById("user-chip");
const homeHeaderDefaultEl = document.getElementById("home-header-default");
const homeHeaderTimersEl = document.getElementById("home-header-timers");

const feedBtn = document.getElementById("log-feed");
const feedMenu = document.getElementById("feed-menu");
const feedBackdrop = document.getElementById("feed-backdrop");
const breastfeedBtn = document.getElementById("log-breastfeed");
const breastfeedBannerEl = document.getElementById("breastfeed-banner");
const breastfeedBannerTimerEl = document.getElementById("breastfeed-banner-timer");
const breastfeedBannerMetaEl = document.getElementById("breastfeed-banner-meta");
const breastfeedBannerActionEl = document.getElementById("breastfeed-banner-action");
const timedEventBannerEl = document.getElementById("timed-event-banner");
const timedEventBannerTitleEl = document.getElementById("timed-event-banner-title");
const timedEventBannerTimerEl = document.getElementById("timed-event-banner-timer");
const timedEventBannerMetaEl = document.getElementById("timed-event-banner-meta");
const timedEventBannerActionEl = document.getElementById("timed-event-banner-action");
const feedQuickBtns = document.querySelectorAll("[data-quick-size], [data-quick-ml]");
const feedManualToggleBtn = document.getElementById("feed-manual-toggle");
const feedManualWrap = document.getElementById("feed-manual");
const manualFeedBtn = document.getElementById("log-feed-manual");
const expressedInput = document.getElementById("expressed-ml");
const expressedBtn = document.getElementById("log-expressed");
const formulaInput = document.getElementById("formula-ml");
const formulaBtn = document.getElementById("log-formula");
const nappyBtn = document.getElementById("log-nappy");
const pooBtn = document.getElementById("log-poo");
const weeBtn = document.getElementById("log-wee");
const nappyMenu = document.getElementById("nappy-menu");
const nappyBackdrop = document.getElementById("nappy-backdrop");
const miscBtn = document.getElementById("log-misc");
const miscMenu = document.getElementById("misc-menu");
const miscBackdrop = document.getElementById("misc-backdrop");
const logLinkEl = document.getElementById("log-link");
const homeLinkEl = document.getElementById("home-link");
const summaryLinkEl = document.getElementById("summary-link");
const milkExpressLinkEl = document.getElementById("milk-express-link");
const bottlesLinkEl = document.getElementById("bottles-link");
const nappyStockLinkEl = document.getElementById("nappy-stock-link");
const refreshBtn = document.getElementById("refresh-btn");
const csvFormEl = document.getElementById("csv-upload-form");
const csvFileEl = document.getElementById("csv-file");
const csvUploadBtn = document.getElementById("csv-upload-btn");
const backfillInputEl = document.getElementById("backfill-input");
const backfillParseBtn = document.getElementById("backfill-parse");
const backfillClearBtn = document.getElementById("backfill-clear");
const backfillDraftsEl = document.getElementById("backfill-drafts");
const backfillSaveRowEl = document.getElementById("backfill-save-row");
const backfillSaveBtn = document.getElementById("backfill-save");
const backfillStatusEl = document.getElementById("backfill-status");
const summaryDateInputEl = document.getElementById("summary-date");
const summaryDateLabelEl = document.getElementById("summary-date-label");
const summaryPrevBtn = document.getElementById("summary-prev");
const summaryNextBtn = document.getElementById("summary-next");
const summaryEventsListEl = document.getElementById("summary-events-list");
const summaryEventsEmptyEl = document.getElementById("summary-events-empty");
const summaryEventsCountEl = document.getElementById("summary-events-count");
const aiSummaryGenerateBtn = document.getElementById("ai-summary-generate");
const aiSummaryMetaEl = document.getElementById("ai-summary-meta");
const aiSummaryOutputEl = document.getElementById("ai-summary-output");
const aiChatFormEl = document.getElementById("ai-chat-form");
const aiChatInputEl = document.getElementById("ai-chat-question");
const aiChatSubmitBtn = document.getElementById("ai-chat-submit");
const aiChatMetaEl = document.getElementById("ai-chat-meta");
const aiChatOutputEl = document.getElementById("ai-chat-output");
const aiChatPromptBtns = document.querySelectorAll("[data-ai-chat-question]");
const sleepGanttTypeOptionsEl = document.getElementById("sleep-gantt-type-options");
const sleepGanttChartEl = document.getElementById("sleep-gantt-chart");
const sleepGanttReadoutEl = document.getElementById("sleep-gantt-readout");
const sleepGanttEmptyEl = document.getElementById("sleep-gantt-empty");
const summaryFeedDurationEl = document.getElementById("summary-feed-duration");
const summaryFeedDurationAvgEl = document.getElementById("summary-feed-duration-avg");
const summaryExpressedEl = document.getElementById("summary-expressed-amount");
const summaryExpressedAvgEl = document.getElementById("summary-expressed-avg");
const summaryFormulaEl = document.getElementById("summary-formula-amount");
const summaryFormulaAvgEl = document.getElementById("summary-formula-avg");
const summaryTotalIntakeEl = document.getElementById("summary-total-intake-amount");
const summaryTotalIntakeAvgEl = document.getElementById("summary-total-intake-avg");
const summarySleepDurationEl = document.getElementById("summary-sleep-duration");
const summarySleepDurationAvgEl = document.getElementById("summary-sleep-duration-avg");
const summarySleepDayNightEl = document.getElementById("summary-sleep-day-night");
const summaryCurrentWeightEl = document.getElementById("summary-current-weight");
const summaryWeightPercentileEl = document.getElementById("summary-weight-percentile");
const homeSleepDurationEl = document.getElementById("home-sleep-duration");
const homeSleepDurationAvgEl = document.getElementById("home-sleep-duration-avg");
const homeSleepDayNightEl = document.getElementById("home-sleep-day-night");
const homeNextNapTimeEl = document.getElementById("home-next-nap-time");
const homeNextNapDetailEl = document.getElementById("home-next-nap-detail");
const milkExpressCountEl = document.getElementById("milk-express-count");
const milkExpressTotalsEl = document.getElementById("milk-express-totals");
const milkExpressListEl = document.getElementById("milk-express-list");
const milkExpressEmptyEl = document.getElementById("milk-express-empty");
const milkExpressSparklineWrapEl = document.getElementById("milk-express-sparkline-wrap");
const milkExpressSparklineEl = document.getElementById("milk-express-sparkline");
const milkExpressSparklineRangeEl = document.getElementById("milk-express-sparkline-range");
const milkExpressSparklineTotalEl = document.getElementById("milk-express-sparkline-total");
const milkExpressSparklineToggleEls = document.querySelectorAll(
  "[data-milk-sparkline-mode]",
);
const insightLastFeedEl = document.getElementById("insight-last-feed");
const insightLastFeedSubEl = document.getElementById("insight-last-feed-sub");
const insightLastExpressEl = document.getElementById("insight-last-express");
const insightLastExpressSubEl = document.getElementById("insight-last-express-sub");
const insightFeedInterval24El = document.getElementById("insight-feed-interval-24");
const insightFeedInterval24SubEl = document.getElementById("insight-feed-interval-24-sub");
const insightFeedInterval7dEl = document.getElementById("insight-feed-interval-7d");
const insightFeedInterval7dSubEl = document.getElementById("insight-feed-interval-7d-sub");
const insightExpressTotal24El = document.getElementById("insight-express-total-24");
const insightExpressTotal24SubEl = document.getElementById("insight-express-total-24-sub");
const insightExpressTotal7El = document.getElementById("insight-express-total-7");
const insightExpressTotal7SubEl = document.getElementById("insight-express-total-7-sub");
const insightDiaper24El = document.getElementById("insight-diaper-24");
const insightDiaper24SubEl = document.getElementById("insight-diaper-24-sub");
const insightDiaper7El = document.getElementById("insight-diaper-7");
const insightDiaper7SubEl = document.getElementById("insight-diaper-7-sub");
const insightAnchorLabelEl = document.getElementById("insight-anchor-label");
const insightProgressLabelEl = document.getElementById("insight-progress-label");
const insightTimeframeBodyEl = document.getElementById("insight-timeframe-body");
const sleepTrendChartEl = document.getElementById("sleep-trend-chart");
const sleepTrendLabelsEl = document.getElementById("sleep-trend-labels");
const sleepTrendAverageChipEl = document.getElementById("sleep-trend-average-chip");
const weightPercentileChartEl = document.getElementById("weight-percentile-chart");
const weightPercentileLabelsEl = document.getElementById("weight-percentile-labels");
const weightPercentileLatestEl = document.getElementById("weight-percentile-latest");
const weightPercentileRangeEl = document.getElementById("weight-percentile-range");
const weightPercentileEmptyEl = document.getElementById("weight-percentile-empty");
const homeSleepTrendChartEl = document.getElementById("home-sleep-trend-chart");
const homeSleepTrendLabelsEl = document.getElementById("home-sleep-trend-labels");
const homeSleepTrendAverageChipEl = document.getElementById("home-sleep-trend-average-chip");
const homeFeedVolumeChartEl = document.getElementById("home-feed-volume-chart");
const homeFeedVolumeLabelsEl = document.getElementById("home-feed-volume-labels");
const homeFeedVolumeAverageChipEl = document.getElementById("home-feed-volume-average-chip");

const timelineWrapEl = document.getElementById("timeline-wrap");
const timelineTrackEl = document.getElementById("timeline-track");
const timelineEmptyEl = document.getElementById("timeline-empty");
const timelineLoadingEl = document.getElementById("timeline-loading");
const timelineSentinelEl = document.getElementById("timeline-sentinel");

const rulerWrapEl = document.getElementById("ruler-wrap");
const rulerBodyEl = document.getElementById("ruler-body");
const rulerCanvasEl = document.getElementById("ruler-canvas");
const rulerReadoutEl = document.getElementById("ruler-readout");
const rulerTotalEl = document.getElementById("ruler-total");
const rulerDetailEl = document.getElementById("ruler-detail");
const rulerGoalEl = document.getElementById("ruler-goal");
const rulerStartEl = document.getElementById("ruler-start");
const rulerEndEl = document.getElementById("ruler-end");
const rulerEmptyEl = document.getElementById("ruler-empty");
const rulerSnapToggleEl = document.getElementById("ruler-snap-toggle");
const rulerNowBtnEl = document.getElementById("ruler-now-btn");

const chartPanelsEl = document.getElementById("history-chart-panels");
const chartEmptyEl = document.getElementById("chart-empty");
const HOME_CHART_TOTAL_HOURS = 24;
const HOME_CHART_CHUNK_HOURS = 6;
const NAP_ESTIMATE_LOOKBACK_DAYS = 3;
const NAP_ESTIMATE_MIN_SAMPLES = 2;
const NAP_WAKE_MIN_MINUTES = 30;
const NAP_WAKE_MAX_MINUTES = 8 * 60;
const logListEl = document.getElementById("log-entries");
const logEmptyEl = document.getElementById("log-empty");
const editEntryBackdropEl = document.getElementById("edit-entry-backdrop");
const editEntryModalEl = document.getElementById("edit-entry-modal");
const editEntryFormEl = document.getElementById("edit-entry-form");
const editEntryTypeEl = document.getElementById("edit-entry-type");
const editEntryTimeEl = document.getElementById("edit-entry-time");
const editEntryDurationEl = document.getElementById("edit-entry-duration");
const editEntryExpressedEl = document.getElementById("edit-entry-expressed");
const editEntryFormulaEl = document.getElementById("edit-entry-formula");
const editEntryNotesEl = document.getElementById("edit-entry-notes");
const editEntryCancelEl = document.getElementById("edit-entry-cancel");
const editEntryCloseEl = document.getElementById("edit-entry-close");
const statFeedTodayEl = document.getElementById("stat-feed-today");
const statFeed24hEl = document.getElementById("stat-feed-24h");
const statNappyTodayEl = document.getElementById("stat-nappy-today");
const statNappy24hEl = document.getElementById("stat-nappy-24h");
const statNappyBreakdownTodayEl = document.getElementById("stat-nappy-breakdown-today");
const statNappyBreakdown24hEl = document.getElementById("stat-nappy-breakdown-24h");
const homeNappyStockSummaryEl = document.getElementById("home-nappy-stock-summary");
const homeNappyStockRemainingEl = document.getElementById("home-nappy-stock-remaining");
const homeNappyStockDetailEl = document.getElementById("home-nappy-stock-detail");
const statDailyFeedTotalEl = document.getElementById("stat-daily-feed-total");
const statDailyFeedSubEl = document.getElementById("stat-daily-feed-sub");
const statFeedMlTodayEl = document.getElementById("stat-feed-ml-today");
const statFeedMl24hEl = document.getElementById("stat-feed-ml-24h");
const statFeedBreakdownTodayEl = document.getElementById("stat-feed-breakdown-today");
const statFeedBreakdown24hEl = document.getElementById("stat-feed-breakdown-24h");
const statGoalProgressTodayEl = document.getElementById("stat-goal-progress-today");
const statGoalProgress24hEl = document.getElementById("stat-goal-progress-24h");
const statGoalDetailTodayEl = document.getElementById("stat-goal-detail-today");
const statGoalDetail24hEl = document.getElementById("stat-goal-detail-24h");
const statWindowEl = document.getElementById("stat-window");
const lastActivityEl = document.getElementById("last-activity");
const lastFeedEl = document.getElementById("last-feed");
const nextFeedEl = document.getElementById("next-feed");
const nextFeedShortcutEl = document.getElementById("next-feed-shortcut");
const lastWeeEl = document.getElementById("last-wee");
const lastPooEl = document.getElementById("last-poo");
const latestBodyEl = document.getElementById("latest-body");
const latestEmptyEl = document.getElementById("latest-empty");
const latestTypeEl = document.getElementById("latest-type");
const latestTimeEl = document.getElementById("latest-time");
const latestRelativeEl = document.getElementById("latest-relative");
const latestDetailsEl = document.getElementById("latest-details");
const latestNotesEl = document.getElementById("latest-notes");
const latestEditBtn = document.getElementById("latest-edit");
const latestDeleteBtn = document.getElementById("latest-delete");
const statCardEls = document.querySelectorAll(".stat-card[data-log-type]");
const homeStatFlipCardEls = document.querySelectorAll(".stat-card[data-home-stat-key]");
const nextFeedModalEl = document.getElementById("next-feed-modal");
const nextFeedBackdropEl = document.getElementById("next-feed-backdrop");
const nextFeedCloseEl = document.getElementById("next-feed-close");
const nextFeedListEl = document.getElementById("next-feed-list");
const nextFeedSubEl = document.getElementById("next-feed-sub");
const nextFeedEmptyEl = document.getElementById("next-feed-empty");
const nextFeedShowPreviousEl = document.getElementById("next-feed-show-previous");

const timelineLinkEl = document.getElementById("timeline-link");

const settingsFormEl = document.getElementById("settings-form");
const dobInputEl = document.getElementById("dob-input");
const ageOutputEl = document.getElementById("age-output");
const intervalInputEl = document.getElementById("interval-input");
const feedSizeSmallInputEl = document.getElementById("feed-size-small-input");
const feedSizeMediumInputEl = document.getElementById("feed-size-medium-input");
const feedSizeBigInputEl = document.getElementById("feed-size-big-input");
const customTypeInputEl = document.getElementById("custom-type-input");
const entryWebhookInputEl = document.getElementById("entry-webhook-input");
const homeKpisWebhookInputEl = document.getElementById("home-kpis-webhook-input");
const defaultUserInputEl = document.getElementById("default-user-input");
const openaiModelInputEl = document.getElementById("openai-model-input");
const openaiTimeoutInputEl = document.getElementById("openai-timeout-input");
const openaiPromptInputEl = document.getElementById("openai-prompt-input");
const pushReminderUserEl = document.getElementById("push-reminder-user");
const pushReminderStatusEl = document.getElementById("push-reminder-status");
const enablePushRemindersBtn = document.getElementById("enable-push-reminders");
const disablePushRemindersBtn = document.getElementById("disable-push-reminders");
const customTypeAddBtn = document.getElementById("custom-type-add");
const customTypeListEl = document.getElementById("custom-type-list");
const customTypeHintEl = document.getElementById("custom-type-hint");
const customTypeEmptyEl = document.getElementById("custom-type-empty");
const exportCsvBtn = document.getElementById("export-csv");
const goalsLinkEl = document.getElementById("goals-link");

let breastfeedTickerId = null;
let miscTimedEventTickerId = null;
let miscTimedEventTypeSelectEl = null;
let miscTimedEventToggleBtn = null;
let hasLoadedHomeEntries = false;
let hasLoadedLogEntries = false;
let hasLoadedSummaryEntries = false;
let hasLoadedSummaryInsights = false;
let syncInFlight = null;
let syncTimerId = null;
let pruneScheduled = false;
let pruneInFlight = false;
let editEntryModalInitialized = false;
let editEntryModalResolver = null;
let editEntryModalEntry = null;
let editEntryModalMode = "full";
let backfillBatchId = null;
let backfillDrafts = [];
let breastfeedHydrated = false;
let timedEventHydrated = false;
let pushReminderState = {
  enabled: false,
  endpoint: "",
  isCurrentDevice: false,
  permission: typeof Notification === "undefined" ? "default" : Notification.permission,
  supported: false,
  configured: false,
};
const WHO_BOY_WEIGHT_LMS_BY_MONTH = [
  { month: 0, l: 0.3487, m: 3.3464, s: 0.14602 },
  { month: 1, l: 0.2297, m: 4.4709, s: 0.13395 },
  { month: 2, l: 0.1970, m: 5.5675, s: 0.12385 },
  { month: 3, l: 0.1738, m: 6.3762, s: 0.11727 },
  { month: 4, l: 0.1553, m: 7.0023, s: 0.11316 },
  { month: 5, l: 0.1395, m: 7.5105, s: 0.11080 },
  { month: 6, l: 0.1257, m: 7.9340, s: 0.10958 },
  { month: 7, l: 0.1134, m: 8.2970, s: 0.10902 },
  { month: 8, l: 0.1021, m: 8.6151, s: 0.10882 },
  { month: 9, l: 0.0917, m: 8.9014, s: 0.10881 },
  { month: 10, l: 0.0820, m: 9.1649, s: 0.10891 },
  { month: 11, l: 0.0730, m: 9.4122, s: 0.10906 },
  { month: 12, l: 0.0644, m: 9.6479, s: 0.10925 },
  { month: 13, l: 0.0563, m: 9.8749, s: 0.10949 },
  { month: 14, l: 0.0487, m: 10.0953, s: 0.10976 },
  { month: 15, l: 0.0413, m: 10.3108, s: 0.11007 },
  { month: 16, l: 0.0343, m: 10.5228, s: 0.11041 },
  { month: 17, l: 0.0275, m: 10.7319, s: 0.11079 },
  { month: 18, l: 0.0211, m: 10.9385, s: 0.11119 },
  { month: 19, l: 0.0148, m: 11.1430, s: 0.11164 },
  { month: 20, l: 0.0087, m: 11.3462, s: 0.11211 },
  { month: 21, l: 0.0029, m: 11.5486, s: 0.11261 },
  { month: 22, l: -0.0028, m: 11.7504, s: 0.11314 },
  { month: 23, l: -0.0083, m: 11.9514, s: 0.11369 },
  { month: 24, l: -0.0137, m: 12.1515, s: 0.11426 },
];
const WHO_WEIGHT_PERCENTILE_LINES = [
  { label: "0.4th", z: -2.6521, style: "dashed" },
  { label: "2nd", z: -2.0537, style: "solid" },
  { label: "9th", z: -1.3408, style: "dashed" },
  { label: "25th", z: -0.6745, style: "solid" },
  { label: "50th", z: 0, style: "dashed" },
  { label: "75th", z: 0.6745, style: "solid" },
  { label: "91st", z: 1.3408, style: "dashed" },
  { label: "98th", z: 2.0537, style: "solid" },
  { label: "99.6th", z: 2.6521, style: "dashed" },
];


function getPreferredTheme() {
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function updateThemeToggle(theme) {
  if (!themeToggleBtn) {
    return;
  }
  const icon = themeToggleBtn.querySelector(".material-symbols-outlined");
  if (icon) {
    icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
  }
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggleBtn.setAttribute("aria-label", label);
  themeToggleBtn.setAttribute("title", label);
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  updateThemeToggle(theme);
}

function toggleTheme() {
  const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  window.localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function getFeedIntervalMinutes() {
  return state.feedIntervalMinutes;
}

function getFeedEntryTotalMl(entry) {
  if (!entry || !isFeedType(entry.type) || isBreastfeedInProgress(entry)) {
    return 0;
  }
  let total = 0;
  if (typeof entry.amount_ml === "number" && Number.isFinite(entry.amount_ml)) {
    total += entry.amount_ml;
  }
  if (typeof entry.expressed_ml === "number" && Number.isFinite(entry.expressed_ml)) {
    total += entry.expressed_ml;
  }
  if (typeof entry.formula_ml === "number" && Number.isFinite(entry.formula_ml)) {
    total += entry.formula_ml;
  }
  return total;
}

function getPrevious24hFeedEntries(anchorTs) {
  const startTs = anchorTs - RULER_WINDOW_MS;
  return recentFeedVolumeEntries.filter((entry) => entry.ts >= startTs && entry.ts <= anchorTs);
}

function getTodayFeedTotalMl(anchorTs = Date.now()) {
  const dayStartTs = getLocalMidnightTs(anchorTs);
  return recentFeedVolumeEntries.reduce((total, entry) => {
    if (entry.ts < dayStartTs || entry.ts > anchorTs) {
      return total;
    }
    return total + entry.ml;
  }, 0);
}

function getFeedTotalForDay(dayStartTs, dayEndTs, anchorTs = Date.now()) {
  return recentFeedVolumeEntries.reduce((total, entry) => {
    if (entry.ts < dayStartTs || entry.ts >= dayEndTs || entry.ts > anchorTs) {
      return total;
    }
    return total + entry.ml;
  }, 0);
}

function planDayFeedSuggestions(daySchedule, consumedDayMl, goalValue) {
  if (!Array.isArray(daySchedule) || !daySchedule.length) {
    return [];
  }

  let plannedTotalMl = consumedDayMl;
  const plannedEntries = [];
  daySchedule.forEach((ts, dayIndex) => {
    const remainingFeeds = daySchedule.length - dayIndex;
    const remainingMl = Math.max(0, goalValue - plannedTotalMl);
    if (remainingFeeds <= 0 || remainingMl <= 0) {
      plannedEntries.push({ ts, category: null, ml: 0, rollingTotalMl: plannedTotalMl });
      return;
    }

    const averageMl = remainingMl / remainingFeeds;
    const options = [
      { category: null, ml: 0 },
      { category: "small", ml: state.feedSizeSmallMl },
      { category: "big", ml: state.feedSizeBigMl },
    ].filter((option) => option.ml <= remainingMl);

    options.sort((left, right) => {
      const distanceDiff = Math.abs(left.ml - averageMl) - Math.abs(right.ml - averageMl);
      if (distanceDiff !== 0) {
        return distanceDiff;
      }
      return right.ml - left.ml;
    });

    const chosen = options[0] || { category: null, ml: 0 };
    plannedTotalMl += chosen.ml;
    plannedEntries.push({
      ts,
      category: chosen.category,
      ml: chosen.ml,
      rollingTotalMl: plannedTotalMl,
    });
  });

  return plannedEntries;
}

function getUpcomingFeedSuggestionPlan({ nowTs, firstFeedTs, intervalMinutes, feedCount }) {
  const goalValue = Number.parseFloat(state.activeFeedingGoal && state.activeFeedingGoal.goal_ml);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    return [];
  }
  if (!Number.isFinite(firstFeedTs) || !Number.isFinite(intervalMinutes) || intervalMinutes <= 0 || !Number.isInteger(feedCount) || feedCount <= 0) {
    return [];
  }

  const visibleSchedule = [];
  for (let i = 0; i < feedCount; i += 1) {
    const ts = firstFeedTs + (intervalMinutes * 60000 * i);
    visibleSchedule.push(ts);
  }
  if (!visibleSchedule.length) {
    return [];
  }

  const planEndTs = getNextLocalMidnightTs(visibleSchedule[visibleSchedule.length - 1]);
  const schedule = [];
  for (let ts = firstFeedTs; ts < planEndTs; ts += intervalMinutes * 60000) {
    schedule.push(ts);
  }
  const visibleTs = new Set(visibleSchedule);

  const suggestions = [];
  let index = 0;
  while (index < schedule.length) {
    const dayStartTs = getLocalMidnightTs(schedule[index]);
    const dayEndTs = getNextLocalMidnightTs(schedule[index]);
    const daySchedule = [];
    while (index < schedule.length && schedule[index] < dayEndTs) {
      daySchedule.push(schedule[index]);
      index += 1;
    }

    const consumedDayMl = dayStartTs <= nowTs
      ? getFeedTotalForDay(dayStartTs, dayEndTs, nowTs)
      : 0;
    if (consumedDayMl >= goalValue) {
      continue;
    }

    const dayPlan = planDayFeedSuggestions(daySchedule, consumedDayMl, goalValue);
    dayPlan.forEach((entry) => {
      if (!entry.category || !visibleTs.has(entry.ts)) {
        return;
      }
      suggestions.push({
        ts: entry.ts,
        category: entry.category,
        ml: entry.ml,
        rollingTotalMl: entry.rollingTotalMl,
      });
    });
  }
  return suggestions;
}

function buildNextFeedRow({
  date,
  detail,
  meta,
  itemClass = "next-feed-item",
  dotClass = "next-feed-dot",
}) {
  const item = document.createElement("div");
  item.className = itemClass;

  const dot = document.createElement("span");
  dot.className = dotClass;
  dot.setAttribute("aria-hidden", "true");

  const timeWrap = document.createElement("div");
  timeWrap.className = "next-feed-time-wrap";

  const timeEl = document.createElement("div");
  timeEl.className = "next-feed-time";
  timeEl.textContent = formatFeedTime(date);

  const metaEl = document.createElement("div");
  metaEl.className = "next-feed-eta";
  metaEl.textContent = meta;

  timeWrap.appendChild(timeEl);
  if (detail) {
    const detailEl = document.createElement("div");
    detailEl.className = "next-feed-safe";
    detailEl.textContent = detail;
    timeWrap.appendChild(detailEl);
  }
  item.append(dot, timeWrap, metaEl);
  return item;
}

function getBreastfeedStorageKey() {
  return BREASTFEED_TIMER_KEY;
}

function getTimedEventStorageKey() {
  return TIMED_EVENT_TIMER_KEY;
}

function parseTimedEventPayload(raw, key) {
  if (!raw) {
    return null;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.start_at || !parsed.event_type) {
    if (key) {
      window.localStorage.removeItem(key);
    }
    return null;
  }
  const start = new Date(parsed.start_at);
  if (Number.isNaN(start.getTime())) {
    if (key) {
      window.localStorage.removeItem(key);
    }
    return null;
  }
  const eventType = normalizeEntryType(parsed.event_type);
  if (!TIMED_EVENT_TYPES.includes(eventType)) {
    if (key) {
      window.localStorage.removeItem(key);
    }
    return null;
  }
  return {
    start,
    type: eventType,
    startedBy: parsed.started_by || null,
    clientEventId: parsed.client_event_id || null,
  };
}

function parseBreastfeedPayload(raw, key) {
  if (!raw) {
    return null;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parsed = null;
  }
  if (parsed && typeof parsed === "object" && parsed.start_at) {
    const start = new Date(parsed.start_at);
    if (Number.isNaN(start.getTime())) {
      if (key) {
        window.localStorage.removeItem(key);
      }
      return null;
    }
    return {
      start,
      startedBy: parsed.started_by || null,
      clientEventId: parsed.client_event_id || null,
    };
  }
  const legacyStart = new Date(raw);
  if (Number.isNaN(legacyStart.getTime())) {
    if (key) {
      window.localStorage.removeItem(key);
    }
    return null;
  }
  return { start: legacyStart, startedBy: null, clientEventId: null };
}

function getTimedEventStart() {
  const key = getTimedEventStorageKey();
  if (!key) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  return parseTimedEventPayload(raw, key);
}

function getBreastfeedStart() {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (raw) {
    return parseBreastfeedPayload(raw, key);
  }
  if (state.activeUser) {
    const legacyKey = `${BREASTFEED_TIMER_KEY}:${state.activeUser}`;
    const legacyRaw = window.localStorage.getItem(legacyKey);
    const legacyParsed = parseBreastfeedPayload(legacyRaw, legacyKey);
    if (legacyParsed) {
      setBreastfeedStart(legacyParsed.start, state.activeUser, null);
      window.localStorage.removeItem(legacyKey);
      return {
        start: legacyParsed.start,
        startedBy: state.activeUser,
        clientEventId: null,
      };
    }
  }
  return null;
}

function setTimedEventStart(start, eventType, startedBy, clientEventId) {
  const key = getTimedEventStorageKey();
  if (!key) {
    return;
  }
  const payload = {
    start_at: start.toISOString(),
    event_type: normalizeEntryType(eventType),
    started_by: startedBy || null,
    client_event_id: clientEventId || null,
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
}

function setBreastfeedStart(start, startedBy, clientEventId) {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return;
  }
  const payload = {
    start_at: start.toISOString(),
    started_by: startedBy || null,
    client_event_id: clientEventId || null,
  };
  window.localStorage.setItem(key, JSON.stringify(payload));
}

function clearTimedEventStart() {
  const key = getTimedEventStorageKey();
  if (!key) {
    return;
  }
  window.localStorage.removeItem(key);
}

function clearBreastfeedStart() {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return;
  }
  window.localStorage.removeItem(key);
  if (state.activeUser) {
    window.localStorage.removeItem(`${BREASTFEED_TIMER_KEY}:${state.activeUser}`);
  }
}

function stopMiscTimedEventTicker() {
  if (miscTimedEventTickerId === null) {
    return;
  }
  window.clearInterval(miscTimedEventTickerId);
  miscTimedEventTickerId = null;
}

function startMiscTimedEventTicker() {
  if (miscTimedEventTickerId !== null) {
    return;
  }
  miscTimedEventTickerId = window.setInterval(updateMiscTimedEventControls, 30000);
}

function syncHomeHeaderTimerState() {
  if (!homeHeaderDefaultEl || !homeHeaderTimersEl) {
    return;
  }
  const hasActiveTimer = Boolean(
    homeHeaderTimersEl.querySelector(".active-timer-banner.is-active"),
  );
  homeHeaderDefaultEl.hidden = hasActiveTimer;
  homeHeaderTimersEl.setAttribute("aria-hidden", hasActiveTimer ? "false" : "true");
}

function updateTimedEventBanner(startInfo, durationMinutes) {
  if (
    !timedEventBannerEl
    || !timedEventBannerTitleEl
    || !timedEventBannerTimerEl
    || !timedEventBannerMetaEl
  ) {
    return;
  }
  if (!startInfo) {
    timedEventBannerEl.classList.remove("is-active");
    timedEventBannerTitleEl.textContent = "Timed event active";
    timedEventBannerTimerEl.textContent = "-- min";
    timedEventBannerMetaEl.textContent = "Started by --";
    if (timedEventBannerActionEl) {
      timedEventBannerActionEl.disabled = false;
      timedEventBannerActionEl.removeAttribute("title");
      timedEventBannerActionEl.textContent = "End timed event";
    }
    syncHomeHeaderTimerState();
    return;
  }
  const label = formatEntryTypeLabel(startInfo.type);
  const startedBy = startInfo.startedBy || "--";
  const meta = state.userValid
    ? `Started by ${startedBy}`
    : `Started by ${startedBy} · Choose a user to stop`;
  timedEventBannerEl.classList.add("is-active");
  timedEventBannerTitleEl.textContent = `${label} active`;
  timedEventBannerTimerEl.textContent = `${durationMinutes} min`;
  timedEventBannerMetaEl.textContent = meta;
  if (timedEventBannerActionEl) {
    timedEventBannerActionEl.disabled = !state.userValid;
    timedEventBannerActionEl.textContent = `End ${label}`;
    timedEventBannerActionEl.title = state.userValid
      ? `End ${label.toLowerCase()}`
      : "Choose a user to log the event";
  }
  syncHomeHeaderTimerState();
}

function updateMiscTimedEventControls() {
  const startInfo = getTimedEventStart();
  if (!miscTimedEventTypeSelectEl || !miscTimedEventToggleBtn) {
    if (startInfo && startInfo.start) {
      const durationMinutes = Math.max(
        0,
        Math.round((Date.now() - startInfo.start.getTime()) / 60000),
      );
      updateTimedEventBanner(startInfo, durationMinutes);
      startMiscTimedEventTicker();
    } else {
      updateTimedEventBanner(null, 0);
      stopMiscTimedEventTicker();
    }
    return;
  }
  if (startInfo && startInfo.start) {
    const durationMinutes = Math.max(
      0,
      Math.round((Date.now() - startInfo.start.getTime()) / 60000),
    );
    const label = formatEntryTypeLabel(startInfo.type);
    miscTimedEventTypeSelectEl.value = startInfo.type;
    miscTimedEventTypeSelectEl.disabled = true;
    miscTimedEventToggleBtn.textContent = `End ${label} (${durationMinutes} min)`;
    miscTimedEventToggleBtn.disabled = !state.userValid;
    const starter = startInfo.startedBy ? ` by ${startInfo.startedBy}` : "";
    miscTimedEventToggleBtn.title = `Started${starter} ${formatTimestamp(startInfo.start.toISOString())}`;
    updateTimedEventBanner(startInfo, durationMinutes);
    startMiscTimedEventTicker();
    return;
  }
  miscTimedEventTypeSelectEl.disabled = false;
  if (!TIMED_EVENT_TYPES.includes(miscTimedEventTypeSelectEl.value)) {
    miscTimedEventTypeSelectEl.value = TIMED_EVENT_TYPES[0];
  }
  miscTimedEventToggleBtn.textContent = "Start timed event";
  miscTimedEventToggleBtn.disabled = !state.userValid;
  miscTimedEventToggleBtn.removeAttribute("title");
  updateTimedEventBanner(null, 0);
  stopMiscTimedEventTicker();
}

function stopBreastfeedTicker() {
  if (breastfeedTickerId === null) {
    return;
  }
  window.clearInterval(breastfeedTickerId);
  breastfeedTickerId = null;
}

function startBreastfeedTicker() {
  if (breastfeedTickerId !== null) {
    return;
  }
  breastfeedTickerId = window.setInterval(updateBreastfeedButton, 30000);
}

function updateBreastfeedBanner(startInfo, durationMinutes) {
  if (!breastfeedBannerEl || !breastfeedBannerTimerEl || !breastfeedBannerMetaEl) {
    return;
  }
  if (!startInfo) {
    breastfeedBannerEl.classList.remove("is-active");
    breastfeedBannerTimerEl.textContent = "-- min";
    breastfeedBannerMetaEl.textContent = "Started by --";
    if (breastfeedBannerActionEl) {
      breastfeedBannerActionEl.disabled = false;
      breastfeedBannerActionEl.removeAttribute("title");
    }
    syncHomeHeaderTimerState();
    return;
  }
  const startedBy = startInfo.startedBy || "--";
  const meta = state.userValid
    ? `Started by ${startedBy}`
    : `Started by ${startedBy} · Choose a user to stop`;
  breastfeedBannerEl.classList.add("is-active");
  breastfeedBannerTimerEl.textContent = `${durationMinutes} min`;
  breastfeedBannerMetaEl.textContent = meta;
  if (breastfeedBannerActionEl) {
    breastfeedBannerActionEl.disabled = !state.userValid;
    breastfeedBannerActionEl.title = state.userValid
      ? "End breastfeeding"
      : "Choose a user to log the feed";
  }
  syncHomeHeaderTimerState();
}

function updateBreastfeedButton() {
  if (!breastfeedBtn) {
    updateBreastfeedBanner(null, 0);
    return;
  }
  const startInfo = getBreastfeedStart();
  if (startInfo && startInfo.start) {
    const start = startInfo.start;
    const durationMinutes = Math.max(
      0,
      Math.round((Date.now() - start.getTime()) / 60000),
    );
    breastfeedBtn.textContent = `End breastfed (${durationMinutes} min)`;
    const starter = startInfo.startedBy ? ` by ${startInfo.startedBy}` : "";
    breastfeedBtn.title = `Started${starter} ${formatTimestamp(start.toISOString())} (${durationMinutes} min)`;
    updateBreastfeedBanner(startInfo, durationMinutes);
    startBreastfeedTicker();
  } else {
    breastfeedBtn.textContent = "Start breastfed";
    breastfeedBtn.removeAttribute("title");
    updateBreastfeedBanner(null, 0);
    stopBreastfeedTicker();
  }
}

function isBreastfeedInProgress(entry) {
  return entry
    && entry.type === "feed"
    && entry.notes === BREASTFEED_IN_PROGRESS_NOTE;
}

function selectActiveBreastfeedEntry(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return null;
  }
  let selected = null;
  let selectedTime = 0;
  entries.forEach((entry) => {
    if (!isBreastfeedInProgress(entry)) {
      return;
    }
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    const time = ts.getTime();
    if (!selected || time > selectedTime) {
      selected = entry;
      selectedTime = time;
    }
  });
  return selected;
}

function updateBreastfeedStateFromSync(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return;
  }
  const activeEntry = selectActiveBreastfeedEntry(entries);
  const current = getBreastfeedStart();
  if (activeEntry) {
    const start = new Date(activeEntry.timestamp_utc);
    if (!Number.isNaN(start.getTime())) {
      const startedBy = activeEntry.user_slug || null;
      const clientEventId = activeEntry.client_event_id || null;
      if (
        !current
        || current.clientEventId !== clientEventId
        || current.start.getTime() !== start.getTime()
        || current.startedBy !== startedBy
      ) {
        setBreastfeedStart(start, startedBy, clientEventId);
      }
      updateBreastfeedButton();
      return;
    }
  }
  if (current && current.clientEventId) {
    const completedMatch = entries.find((entry) => {
      return entry.client_event_id === current.clientEventId
        && !isBreastfeedInProgress(entry);
    });
    if (completedMatch) {
      clearBreastfeedStart();
      updateBreastfeedButton();
    }
  }
}

function isTimedEventInProgress(entry) {
  if (!entry) {
    return false;
  }
  const normalizedType = normalizeEntryType(entry.type);
  const duration = Number.parseFloat(entry.feed_duration_min);
  const hasDuration = Number.isFinite(duration) && duration >= 0;
  return TIMED_EVENT_TYPES.includes(normalizedType)
    && !entry.deleted_at_utc
    && !hasDuration;
}

function selectActiveTimedEventEntry(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return null;
  }
  let selected = null;
  let selectedTime = 0;
  entries.forEach((entry) => {
    if (!isTimedEventInProgress(entry)) {
      return;
    }
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    const time = ts.getTime();
    if (!selected || time > selectedTime) {
      selected = entry;
      selectedTime = time;
    }
  });
  return selected;
}

function updateTimedEventStateFromSync(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    return;
  }
  const activeEntry = selectActiveTimedEventEntry(entries);
  const current = getTimedEventStart();
  if (activeEntry) {
    const start = new Date(activeEntry.timestamp_utc);
    if (!Number.isNaN(start.getTime())) {
      const type = normalizeEntryType(activeEntry.type);
      const startedBy = activeEntry.user_slug || null;
      const clientEventId = activeEntry.client_event_id || null;
      if (
        !current
        || current.clientEventId !== clientEventId
        || current.start.getTime() !== start.getTime()
        || current.startedBy !== startedBy
        || current.type !== type
      ) {
        setTimedEventStart(start, type, startedBy, clientEventId);
      }
      updateMiscTimedEventControls();
      return;
    }
  }
  if (current && current.clientEventId) {
    const completedMatch = entries.find((entry) => {
      return entry.client_event_id === current.clientEventId
        && !isTimedEventInProgress(entry);
    });
    if (completedMatch) {
      clearTimedEventStart();
      updateMiscTimedEventControls();
    }
  }
}

async function hydrateBreastfeedFromLocalEntries() {
  if (breastfeedHydrated) {
    return;
  }
  breastfeedHydrated = true;
  if (getBreastfeedStart()) {
    return;
  }
  const entries = await listEntriesLocalSafe({ limit: 200 });
  if (!entries) {
    return;
  }
  const activeEntry = selectActiveBreastfeedEntry(entries);
  if (activeEntry) {
    const start = new Date(activeEntry.timestamp_utc);
    if (!Number.isNaN(start.getTime())) {
      setBreastfeedStart(
        start,
        activeEntry.user_slug || null,
        activeEntry.client_event_id || null,
      );
      updateBreastfeedButton();
    }
  }
}

async function hydrateTimedEventFromLocalEntries() {
  if (timedEventHydrated) {
    return;
  }
  timedEventHydrated = true;
  if (getTimedEventStart()) {
    return;
  }
  const entries = await listEntriesLocalSafe({ limit: 200 });
  if (!entries) {
    return;
  }
  const activeEntry = selectActiveTimedEventEntry(entries);
  if (activeEntry) {
    const start = new Date(activeEntry.timestamp_utc);
    const type = normalizeEntryType(activeEntry.type);
    if (!Number.isNaN(start.getTime()) && TIMED_EVENT_TYPES.includes(type)) {
      setTimedEventStart(
        start,
        type,
        activeEntry.user_slug || null,
        activeEntry.client_event_id || null,
      );
      updateMiscTimedEventControls();
    }
  }
}

function updateAgeDisplay() {
  if (!ageOutputEl) {
    return;
  }
  const dob = parseDob(dobInputEl ? dobInputEl.value : state.babyDob || "");
  ageOutputEl.textContent = formatAge(dob);
}

function setCustomTypeHint(message) {
  if (!customTypeHintEl) {
    return;
  }
  customTypeHintEl.textContent = message;
}

function normalizeCustomTypeInput(value) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || Array.from(trimmed).length > CUSTOM_TYPE_MAX_LENGTH) {
    return null;
  }
  const isAllowedChar = (char) => {
    if (char === " " || char === "/" || char === "-" || char === "\u200D" || char === "\uFE0F") {
      return true;
    }
    return /[\p{L}\p{N}\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Sk}]/u.test(char);
  };
  if (!Array.from(trimmed).every(isAllowedChar)) {
    return null;
  }
  return trimmed;
}

function renderCustomTypeList() {
  if (!customTypeListEl) {
    return;
  }
  customTypeListEl.innerHTML = "";
  if (!state.customEventTypes.length) {
    if (customTypeEmptyEl) {
      customTypeEmptyEl.style.display = "block";
    }
    return;
  }
  if (customTypeEmptyEl) {
    customTypeEmptyEl.style.display = "none";
  }
  state.customEventTypes.forEach((type) => {
    const item = document.createElement("li");
    item.className = "pill-item";
    const label = document.createElement("span");
    label.textContent = type;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "pill-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      if (!window.confirm(`Remove "${type}" from misc events?`)) {
        return;
      }
      const next = state.customEventTypes.filter((entry) => entry !== type);
      state.customEventTypes = next;
      renderCustomTypeList();
      renderMiscMenu();
      void saveBabySettings({ custom_event_types: state.customEventTypes });
    });
    item.appendChild(label);
    item.appendChild(removeBtn);
    customTypeListEl.appendChild(item);
  });
}

function renderMiscMenu() {
  if (!miscMenu) {
    return;
  }
  miscMenu.innerHTML = "";
  const timedWrap = document.createElement("div");
  timedWrap.className = "misc-timer-wrap";

  const timedTypeSelect = document.createElement("select");
  timedTypeSelect.className = "nappy-option misc-option";
  TIMED_EVENT_TYPES.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = formatEntryTypeLabel(type);
    timedTypeSelect.appendChild(option);
  });

  const timedToggleBtn = document.createElement("button");
  timedToggleBtn.type = "button";
  timedToggleBtn.className = "nappy-option misc-option";
  timedToggleBtn.addEventListener("click", () => {
    void handleTimedEventToggle(timedTypeSelect.value);
  });

  timedWrap.appendChild(timedTypeSelect);
  timedWrap.appendChild(timedToggleBtn);
  miscMenu.appendChild(timedWrap);

  miscTimedEventTypeSelectEl = timedTypeSelect;
  miscTimedEventToggleBtn = timedToggleBtn;
  updateMiscTimedEventControls();

  state.customEventTypes
    .filter((type) => !TIMED_EVENT_TYPES.includes(normalizeEntryType(type)))
    .forEach((type) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nappy-option misc-option";
    button.textContent = type;
    button.addEventListener("click", () => {
      closeMiscMenu();
      addEntry(type);
    });
    miscMenu.appendChild(button);
    });
  miscMenu.setAttribute("aria-hidden", "true");
}

function applyCustomEventTypes() {
  renderCustomTypeList();
  renderMiscMenu();
  renderSleepGanttTypeOptions(summaryEntries);
  renderSleepGantt(summaryGanttEntries.length ? summaryGanttEntries : summaryEntries);
  if (miscBtn) {
    toggleDisabled(miscBtn, !state.userValid);
  }
}

function updateUserDisplay() {
  if (userMessageEl) {
    if (pageType === "settings") {
      userMessageEl.textContent = state.userValid
        ? `Logging as ${state.activeUser}`
        : "Choose a user to log.";
    } else if (pageType === "goals") {
      userMessageEl.textContent = "Goals stay active until a later-dated entry is logged.";
    } else if (pageType === "timeline") {
      userMessageEl.textContent = "Event timeline";
    } else if (pageType === "calendar" || pageType === "calendar-form") {
      userMessageEl.textContent = "Shared calendar";
    } else if (pageType === "bottles") {
      userMessageEl.textContent = "Shared bottle library";
    } else if (pageType === "milk-express") {
      userMessageEl.textContent = "Last 48 hours • All milk express";
    } else {
      userMessageEl.textContent = state.userValid
        ? `Logging as ${state.activeUser}`
        : "Choose a user to log.";
    }
  }
  if (userChipEl) {
    userChipEl.textContent = state.activeUser ? state.activeUser.slice(0, 2).toUpperCase() : "BT";
  }
}

function toggleDisabled(element, disabled) {
  if (!element) {
    return;
  }
  element.classList.toggle("disabled", disabled);
  if (disabled) {
    element.setAttribute("aria-disabled", "true");
  } else {
    element.removeAttribute("aria-disabled");
  }
}

let homeInitialized = false;
let quickLogInitialized = false;
let logInitialized = false;
let settingsInitialized = false;
let summaryInitialized = false;
let timelineInitialized = false;
let rulerInitialized = false;
let nextFeedTimer = null;
let refreshTimer = null;
let summaryDate = null;
let summaryEntries = [];
let summaryGanttEntries = [];
let summaryWeightEntries = [];
let summaryInsightsEntries = [];
let summaryInsightsAnchor = null;
let summaryInsightsLoading = null;
let summaryInsightsLoadToken = 0;
let summaryInsightsComplete = false;
let sleepGanttOverlayTypes = new Set(SLEEP_GANTT_DEFAULT_OVERLAYS);
let milkExpressSparklineMode = "all";
let milkExpressAllEntries = [];
let milkExpressAllLoading = null;
let hasLoadedFeedingGoals = false;
let latestFeedTotalsMl = { today: 0, rolling24h: 0 };
let recentFeedVolumeEntries = [];
const HOME_STAT_VIEW_TODAY = "today";
const HOME_STAT_VIEW_24H = "24h";
const HOME_STAT_LABEL_BY_VIEW = {
  [HOME_STAT_VIEW_TODAY]: "today",
  [HOME_STAT_VIEW_24H]: "last 24 hours",
};
const HOME_STAT_LABEL_BY_KEY = {
  "feed-total": "feeding",
  nappies: "nappies",
};
const homeStatViews = {
  "feed-total": HOME_STAT_VIEW_TODAY,
  nappies: HOME_STAT_VIEW_TODAY,
};
let hasLoadedTimelineEntries = false;
let timelineEntryCount = 0;
let timelineOldestTimestamp = null;
let timelineHasMore = true;
let timelineLoading = false;
let timelineObserver = null;
const timelineDayMap = new Map();
const timelineHourMap = new Map();
const SUMMARY_INSIGHTS_PAGE_LIMIT = 250;
const SUMMARY_INSIGHTS_INITIAL_WINDOW_DAYS = 30;
const SUMMARY_INSIGHTS_MAX_PAGES = 120;
const BACKGROUND_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const SUMMARY_GANTT_LOOKBACK_HOURS = 24;
const RULER_DAYS_BACK = 7;
const RULER_WINDOW_MS = 24 * 60 * 60 * 1000;
const RULER_BUCKET_MS = 30 * 60 * 1000;
let rulerGoalMl = 700;
let rulerEntries = [];
let rulerAnchorTs = Date.now();
let rulerDragStartX = 0;
let rulerDragStartY = 0;
let rulerDragStartAnchor = 0;
let rulerDragging = false;
let rulerPointerId = null;
let rulerHasDragged = false;
let rulerStretch = 0;
let rulerMinTs = null;
let rulerMaxTs = null;
let rulerSnapToFeeds = true;
let rulerFeedHitTargets = [];

function initHomeHandlers() {
  if (homeInitialized || pageType !== "home") {
    return;
  }
  homeInitialized = true;
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (state.userValid) {
        void loadHomeEntries();
      }
    });
  }
  bindTimestampPopup(lastFeedEl);
  bindNextFeedPopup(nextFeedEl);
  bindTimestampPopup(lastWeeEl);
  bindTimestampPopup(lastPooEl);
  if (nextFeedBackdropEl) {
    nextFeedBackdropEl.addEventListener("click", closeNextFeedModal);
  }
  if (nextFeedCloseEl) {
    nextFeedCloseEl.addEventListener("click", closeNextFeedModal);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nextFeedModalEl && !nextFeedModalEl.hidden) {
      closeNextFeedModal();
    }
  });
  if (!nextFeedTimer) {
    nextFeedTimer = window.setInterval(updateNextFeed, 60000);
  }
  bindHomeStatCardFlips();
  bindStatCardNavigation();
  startAutoRefresh(loadHomeEntries);
}

function getHomeStatAriaLabel(statKey) {
  const currentView = homeStatViews[statKey] || HOME_STAT_VIEW_TODAY;
  const nextView = currentView === HOME_STAT_VIEW_TODAY ? HOME_STAT_VIEW_24H : HOME_STAT_VIEW_TODAY;
  const statLabel = HOME_STAT_LABEL_BY_KEY[statKey] || statKey.replace("-", " ");
  return `Show ${HOME_STAT_LABEL_BY_VIEW[nextView]} for ${statLabel}`;
}

function syncHomeStatCardState(card) {
  if (!card) {
    return;
  }
  const statKey = card.dataset.homeStatKey;
  if (!statKey) {
    return;
  }
  const currentView = homeStatViews[statKey] || HOME_STAT_VIEW_TODAY;
  const isFlipped = currentView === HOME_STAT_VIEW_24H;
  card.classList.toggle("is-flipped", isFlipped);
  card.setAttribute("aria-pressed", isFlipped ? "true" : "false");
  card.setAttribute("aria-label", getHomeStatAriaLabel(statKey));
}

function toggleHomeStatCard(card) {
  if (!card || !state.userValid || card.classList.contains("disabled")) {
    return;
  }
  const statKey = card.dataset.homeStatKey;
  if (!statKey) {
    return;
  }
  homeStatViews[statKey] = homeStatViews[statKey] === HOME_STAT_VIEW_24H
    ? HOME_STAT_VIEW_TODAY
    : HOME_STAT_VIEW_24H;
  syncHomeStatCardState(card);
}

function bindHomeStatCardFlips() {
  homeStatFlipCardEls.forEach((card) => {
    syncHomeStatCardState(card);
    card.addEventListener("click", (event) => {
      if (event.target && event.target.closest("a, button")) {
        return;
      }
      toggleHomeStatCard(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleHomeStatCard(card);
      }
    });
  });
}

function initQuickLogHandlers() {
  if (quickLogInitialized) {
    return;
  }
  quickLogInitialized = true;
  if (feedBtn) {
    feedBtn.addEventListener("click", toggleFeedMenu);
  }
  if (breastfeedBtn) {
    breastfeedBtn.addEventListener("click", handleBreastfeedToggle);
  }
  if (breastfeedBannerActionEl) {
    breastfeedBannerActionEl.addEventListener("click", handleBreastfeedToggle);
  }
  if (timedEventBannerActionEl) {
    timedEventBannerActionEl.addEventListener("click", () => {
      const active = getTimedEventStart();
      const type = active && active.type ? active.type : (miscTimedEventTypeSelectEl
        ? miscTimedEventTypeSelectEl.value
        : TIMED_EVENT_TYPES[0]);
      void handleTimedEventToggle(type);
    });
  }
  if (feedQuickBtns.length > 0) {
    feedQuickBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = btn.dataset.quickMl;
        const amount = Number.parseFloat(raw);
        if (!Number.isFinite(amount) || amount <= 0) {
          return;
        }
        handleQuickLog(amount);
      });
    });
  }
  if (feedManualToggleBtn) {
    feedManualToggleBtn.addEventListener("click", () => {
      if (!feedManualWrap) {
        return;
      }
      setManualVisible(feedManualWrap.hidden);
    });
  }
  if (manualFeedBtn) {
    manualFeedBtn.addEventListener("click", () => {
      if (!state.userValid) {
        setStatus("Choose a user below to start logging.");
        return;
      }
      const expressed = parseOptionalMlInput(expressedInput, "Expressed amount");
      if (!expressed.valid) {
        return;
      }
      const formula = parseOptionalMlInput(formulaInput, "Formula amount");
      if (!formula.valid) {
        return;
      }
      if (!expressed.hasValue && !formula.hasValue) {
        closeFeedMenu();
        addEntry("feed");
        return;
      }
      const payload = buildEntryPayload("feed");
      if (expressed.hasValue) {
        payload.expressed_ml = expressed.value;
      }
      if (formula.hasValue) {
        payload.formula_ml = formula.value;
      }
      if (expressedInput) {
        expressedInput.value = "";
      }
      if (formulaInput) {
        formulaInput.value = "";
      }
      closeFeedMenu();
      void saveEntry(payload);
    });
  }
  if (expressedBtn) {
    expressedBtn.addEventListener("click", () => {
      void handleMlEntry(expressedInput, "Expressed");
    });
  }
  if (formulaBtn) {
    formulaBtn.addEventListener("click", () => {
      void handleMlEntry(formulaInput, "Formula");
    });
  }
  if (expressedInput) {
    expressedInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleMlEntry(expressedInput, "Expressed");
      }
    });
  }
  if (formulaInput) {
    formulaInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleMlEntry(formulaInput, "Formula");
      }
    });
  }
  if (nappyBtn) {
    nappyBtn.addEventListener("click", toggleNappyMenu);
  }
  if (miscBtn) {
    miscBtn.addEventListener("click", toggleMiscMenu);
  }
  if (pooBtn) {
    pooBtn.addEventListener("click", () => {
      closeNappyMenu();
      addEntry("poo");
    });
  }
  if (weeBtn) {
    weeBtn.addEventListener("click", () => {
      closeNappyMenu();
      addEntry("wee");
    });
  }
  if (nappyBackdrop) {
    nappyBackdrop.addEventListener("click", closeNappyMenu);
  }
  if (miscBackdrop) {
    miscBackdrop.addEventListener("click", closeMiscMenu);
  }
  if (feedBackdrop) {
    feedBackdrop.addEventListener("click", closeFeedMenu);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNappyMenu();
      closeMiscMenu();
      closeFeedMenu();
    }
  });
}

function initLogHandlers() {
  if (logInitialized || pageType !== "log") {
    return;
  }
  logInitialized = true;
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (state.userValid) {
        void loadLogEntries();
      }
    });
  }
  if (csvFormEl) {
    csvFormEl.addEventListener("submit", handleCsvUpload);
  }
  initBackfillHandlers();
  initEditEntryModalHandlers();
  startAutoRefresh(loadLogEntries);
  updateLogEmptyMessage();
}

function setBackfillStatus(message) {
  if (backfillStatusEl) {
    backfillStatusEl.textContent = message || "";
  }
}

function getBackfillAllowedTypes() {
  return ["feed", "sleep", "wee", "poo", "cry", "weight", ...state.customEventTypes];
}

function normalizeBackfillNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateBackfillDraftClient(draft) {
  const errors = [];
  if (!getBackfillAllowedTypes().includes(draft.type)) {
    errors.push("Choose an allowed entry type.");
  }
  const timestamp = Date.parse(draft.timestamp_utc || "");
  if (!Number.isFinite(timestamp)) {
    errors.push("Choose a date and time.");
  } else if (timestamp > Date.now()) {
    errors.push("Date and time cannot be in the future.");
  }
  if (
    draft.type === "feed"
    && draft.amount_ml === null
    && draft.expressed_ml === null
    && draft.formula_ml === null
  ) {
    errors.push("Feed entries need an amount in ml.");
  }
  if (draft.type === "sleep" && draft.feed_duration_min === null) {
    errors.push("Sleep entries need a duration.");
  }
  if (draft.type === "weight" && draft.weight_kg === null) {
    errors.push("Weight entries need a weight.");
  }
  return errors;
}

function updateBackfillSaveState() {
  if (!backfillSaveBtn) {
    return;
  }
  const blocked = !backfillDrafts.length || backfillDrafts.some((draft) => (
    (draft.warnings || []).length > 0
    || validateBackfillDraftClient(draft).length > 0
  ));
  backfillSaveBtn.disabled = blocked;
}

function createBackfillField(labelText, input) {
  const wrapper = document.createElement("div");
  wrapper.className = "backfill-field";
  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.append(label, input);
  return wrapper;
}

function renderBackfillDrafts() {
  if (!backfillDraftsEl || !backfillSaveRowEl || !backfillClearBtn) {
    return;
  }
  backfillDraftsEl.innerHTML = "";
  backfillSaveRowEl.hidden = backfillDrafts.length === 0;
  backfillClearBtn.hidden = backfillDrafts.length === 0;

  backfillDrafts.forEach((draft, index) => {
    const clientErrors = validateBackfillDraftClient(draft);
    const serverErrors = Array.isArray(draft.errors) ? draft.errors : [];
    const errors = [...new Set([...serverErrors, ...clientErrors])];
    const warnings = Array.isArray(draft.warnings) ? draft.warnings : [];
    const card = document.createElement("article");
    card.className = "backfill-draft";
    if (warnings.length) {
      card.classList.add("has-warning");
    }
    if (errors.length) {
      card.classList.add("has-error");
    }

    const header = document.createElement("div");
    header.className = "backfill-draft-header";
    const title = document.createElement("div");
    title.className = "backfill-draft-title";
    title.textContent = `Draft ${index + 1}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      backfillDrafts.splice(index, 1);
      renderBackfillDrafts();
    });
    const headerActions = document.createElement("div");
    headerActions.className = "backfill-draft-actions";
    headerActions.appendChild(removeBtn);
    header.append(title, headerActions);

    const grid = document.createElement("div");
    grid.className = "backfill-draft-grid";
    const typeSelect = document.createElement("select");
    getBackfillAllowedTypes().forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = formatEntryTypeLabel(type);
      option.selected = type === draft.type;
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener("change", () => {
      draft.type = typeSelect.value;
      draft.errors = [];
      renderBackfillDrafts();
    });

    const timeInput = document.createElement("input");
    timeInput.type = "datetime-local";
    timeInput.step = "60";
    timeInput.value = draft.timestamp_utc
      ? toLocalDateTimeValue(draft.timestamp_utc)
      : "";
    timeInput.addEventListener("change", () => {
      const next = new Date(timeInput.value);
      draft.timestamp_utc = Number.isNaN(next.getTime()) ? null : next.toISOString();
      draft.errors = [];
      renderBackfillDrafts();
    });

    const numericFields = [
      ["Amount (ml)", "amount_ml"],
      ["Formula (ml)", "formula_ml"],
      ["Expressed (ml)", "expressed_ml"],
      ["Duration (min)", "feed_duration_min"],
      ["Weight (kg)", "weight_kg"],
    ];
    grid.append(
      createBackfillField("Type", typeSelect),
      createBackfillField("Date & time", timeInput),
    );
    numericFields.forEach(([label, field]) => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = field === "weight_kg" ? "0.01" : "0.1";
      input.inputMode = "decimal";
      input.value = draft[field] === null || draft[field] === undefined
        ? ""
        : String(draft[field]);
      input.addEventListener("change", () => {
        draft[field] = normalizeBackfillNumber(input.value);
        draft.errors = [];
        renderBackfillDrafts();
      });
      grid.appendChild(createBackfillField(label, input));
    });

    const notesInput = document.createElement("textarea");
    notesInput.value = draft.notes || "";
    notesInput.placeholder = "Optional notes";
    notesInput.addEventListener("change", () => {
      draft.notes = notesInput.value.trim() || null;
      draft.errors = [];
    });
    const notesField = createBackfillField("Notes", notesInput);
    notesField.classList.add("is-wide");
    grid.appendChild(notesField);

    card.append(header, grid);
    if (warnings.length) {
      const warningList = document.createElement("div");
      warningList.className = "backfill-messages";
      warnings.forEach((warning) => {
        const line = document.createElement("div");
        line.textContent = warning;
        warningList.appendChild(line);
      });
      const resolveBtn = document.createElement("button");
      resolveBtn.type = "button";
      resolveBtn.textContent = "Mark warnings reviewed";
      resolveBtn.addEventListener("click", () => {
        draft.warnings = [];
        draft.errors = [];
        renderBackfillDrafts();
      });
      const actions = document.createElement("div");
      actions.className = "backfill-draft-actions";
      actions.appendChild(resolveBtn);
      card.append(warningList, actions);
    }
    if (errors.length) {
      const errorList = document.createElement("div");
      errorList.className = "backfill-messages is-error";
      errors.forEach((error) => {
        const line = document.createElement("div");
        line.textContent = error;
        errorList.appendChild(line);
      });
      card.appendChild(errorList);
    }
    backfillDraftsEl.appendChild(card);
  });
  updateBackfillSaveState();
}

function clearBackfill() {
  backfillBatchId = null;
  backfillDrafts = [];
  if (backfillInputEl) {
    backfillInputEl.value = "";
  }
  setBackfillStatus("");
  renderBackfillDrafts();
}

async function parseBackfillText() {
  if (!state.userValid) {
    setStatus("Choose a user below before creating drafts.");
    return;
  }
  const text = backfillInputEl ? backfillInputEl.value.trim() : "";
  if (!text) {
    setBackfillStatus("Describe at least one previous event.");
    return;
  }
  backfillParseBtn.disabled = true;
  setBackfillStatus("Structuring with OpenAI...");
  try {
    const response = await fetch(
      buildUrl(`/api/users/${state.activeUser}/entries/backfill/parse`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          reference_time_utc: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBackfillStatus(payload.error || "Could not create drafts.");
      return;
    }
    backfillBatchId = payload.batch_id;
    backfillDrafts = Array.isArray(payload.drafts) ? payload.drafts : [];
    setBackfillStatus(
      payload.truncated
        ? "Created the first 10 drafts. Review them carefully."
        : `Created ${backfillDrafts.length} draft${backfillDrafts.length === 1 ? "" : "s"}.`,
    );
    renderBackfillDrafts();
  } catch (error) {
    setBackfillStatus("Could not reach the backfill service.");
  } finally {
    backfillParseBtn.disabled = false;
  }
}

async function saveBackfillEntries() {
  if (!backfillBatchId || !backfillDrafts.length || !state.userValid) {
    return;
  }
  updateBackfillSaveState();
  if (backfillSaveBtn.disabled) {
    setBackfillStatus("Correct errors and review warnings before saving.");
    return;
  }
  backfillSaveBtn.disabled = true;
  setBackfillStatus("Saving entries...");
  try {
    const response = await fetch(
      buildUrl(`/api/users/${state.activeUser}/entries/backfill/commit`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: backfillBatchId,
          entries: backfillDrafts,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = Array.isArray(payload.details) ? payload.details : [];
      details.forEach((detail) => {
        const draft = backfillDrafts.find((item) => item.draft_id === detail.draft_id);
        if (draft) {
          draft.errors = detail.errors || [];
        }
      });
      setBackfillStatus(payload.error || "Could not save entries.");
      renderBackfillDrafts();
      return;
    }
    const saved = (payload.created || 0) + (payload.duplicates || 0);
    clearBackfill();
    setBackfillStatus(`Saved ${saved} entr${saved === 1 ? "y" : "ies"}.`);
    await loadLogEntries();
  } catch (error) {
    setBackfillStatus("Could not reach the backfill service.");
  } finally {
    updateBackfillSaveState();
  }
}

function initBackfillHandlers() {
  if (!backfillParseBtn || !backfillSaveBtn || !backfillClearBtn) {
    return;
  }
  backfillParseBtn.addEventListener("click", () => {
    void parseBackfillText();
  });
  backfillSaveBtn.addEventListener("click", () => {
    void saveBackfillEntries();
  });
  backfillClearBtn.addEventListener("click", clearBackfill);
}

function initSummaryHandlers() {
  if (summaryInitialized || pageType !== "summary") {
    return;
  }
  summaryInitialized = true;
  renderSleepGanttTypeOptions(summaryEntries);
  if (!summaryDate) {
    setSummaryDate(new Date());
  }
  if (summaryPrevBtn) {
    summaryPrevBtn.addEventListener("click", () => {
      const base = summaryDate ? new Date(summaryDate) : new Date();
      base.setDate(base.getDate() - 1);
      setSummaryDate(base);
      if (state.userValid) {
        void loadSummaryEntries();
      }
    });
  }
  if (summaryNextBtn) {
    summaryNextBtn.addEventListener("click", () => {
      const base = summaryDate ? new Date(summaryDate) : new Date();
      base.setDate(base.getDate() + 1);
      setSummaryDate(base);
      if (state.userValid) {
        void loadSummaryEntries();
      }
    });
  }
  if (summaryDateInputEl) {
    summaryDateInputEl.addEventListener("change", () => {
      const selected = parseDateInputValue(summaryDateInputEl.value);
      if (selected) {
        setSummaryDate(selected);
        if (state.userValid) {
          void loadSummaryEntries();
        }
      }
    });
  }
  if (sleepGanttTypeOptionsEl) {
    sleepGanttTypeOptionsEl.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement
        ? event.target.closest("[data-sleep-gantt-type]")
        : null;
      if (!target) {
        return;
      }
      const type = normalizeEntryType(target.dataset.sleepGanttType || "");
      if (!type) {
        return;
      }
      if (sleepGanttOverlayTypes.has(type)) {
        sleepGanttOverlayTypes.delete(type);
      } else {
        sleepGanttOverlayTypes.add(type);
      }
      renderSleepGanttTypeOptions(summaryEntries);
      renderSleepGantt(summaryGanttEntries.length ? summaryGanttEntries : summaryEntries);
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (state.userValid) {
        resetAiSummaryPanel();
        resetAiChatPanel();
        void loadSummaryEntries();
        void loadRulerFeeds({ reset: true });
      }
    });
  }
  if (aiSummaryGenerateBtn) {
    aiSummaryGenerateBtn.addEventListener("click", () => {
      void generateAiSummary();
    });
    resetAiSummaryPanel();
  }
  if (aiChatFormEl) {
    aiChatFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      void sendAiChatQuestion();
    });
    resetAiChatPanel();
  }
  if (aiChatPromptBtns.length) {
    aiChatPromptBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const question = btn.dataset.aiChatQuestion || "";
        const presetWindow = btn.dataset.aiChatPreset || "";
        if (aiChatInputEl) {
          aiChatInputEl.value = question;
        }
        void sendAiChatQuestion(question, presetWindow);
      });
    });
  }
  if (milkExpressSparklineToggleEls.length) {
    milkExpressSparklineToggleEls.forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.milkSparklineMode;
        if (!mode || mode === milkExpressSparklineMode) {
          return;
        }
        milkExpressSparklineMode = mode;
        milkExpressSparklineToggleEls.forEach((toggle) => {
          toggle.classList.toggle("is-active", toggle.dataset.milkSparklineMode === mode);
        });
        renderMilkExpressSparkline(
          summaryEntries.filter((entry) => {
            return normalizeEntryType(entry.type) === MILK_EXPRESS_TYPE;
          }),
        );
      });
    });
  }
  initRulerHandlers();
}

function initSettingsHandlers() {
  if (settingsInitialized || pageType !== "settings") {
    return;
  }
  settingsInitialized = true;
  if (dobInputEl) {
    dobInputEl.addEventListener("change", () => {
      const value = dobInputEl.value;
      updateAgeDisplay();
      void saveBabySettings({ dob: value || null });
    });
  }
  if (intervalInputEl) {
    intervalInputEl.addEventListener("change", () => {
      const nextValue = Number.parseFloat(intervalInputEl.value);
      if (Number.isNaN(nextValue) || nextValue <= 0) {
        intervalInputEl.value = "";
        void saveBabySettings({ feed_interval_min: null });
      } else {
        const minutes = Math.round(nextValue * 60);
        void saveBabySettings({ feed_interval_min: minutes });
      }
    });
  }
  if (feedSizeSmallInputEl) {
    feedSizeSmallInputEl.addEventListener("change", () => {
      const nextValue = Number.parseFloat(feedSizeSmallInputEl.value);
      if (Number.isNaN(nextValue) || nextValue <= 0) {
        feedSizeSmallInputEl.value = String(state.feedSizeSmallMl);
        return;
      }
      void saveBabySettings({ feed_size_small_ml: nextValue });
    });
  }
  if (feedSizeMediumInputEl) {
    feedSizeMediumInputEl.addEventListener("change", () => {
      const nextValue = Number.parseFloat(feedSizeMediumInputEl.value);
      if (Number.isNaN(nextValue) || nextValue <= 0) {
        feedSizeMediumInputEl.value = String(state.feedSizeMediumMl);
        return;
      }
      void saveBabySettings({ feed_size_medium_ml: nextValue });
    });
  }
  if (feedSizeBigInputEl) {
    feedSizeBigInputEl.addEventListener("change", () => {
      const nextValue = Number.parseFloat(feedSizeBigInputEl.value);
      if (Number.isNaN(nextValue) || nextValue <= 0) {
        feedSizeBigInputEl.value = String(state.feedSizeBigMl);
        return;
      }
      void saveBabySettings({ feed_size_big_ml: nextValue });
    });
  }
  if (customTypeAddBtn && customTypeInputEl) {
    const handleAdd = () => {
      const normalized = normalizeCustomTypeInput(customTypeInputEl.value);
      if (!normalized) {
        setCustomTypeHint("Use letters, numbers, spaces, /, -, or emoji (max 32 chars).");
        customTypeInputEl.focus();
        return;
      }
      const exists = state.customEventTypes.some(
        (entry) => entry.toLowerCase() === normalized.toLowerCase(),
      );
      if (exists) {
        setCustomTypeHint("That type already exists.");
        return;
      }
      state.customEventTypes = [...state.customEventTypes, normalized];
      customTypeInputEl.value = "";
      setCustomTypeHint("Added.");
      renderCustomTypeList();
      renderMiscMenu();
      void saveBabySettings({ custom_event_types: state.customEventTypes });
    };
    customTypeAddBtn.addEventListener("click", handleAdd);
    customTypeInputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAdd();
      }
    });
  }
  if (entryWebhookInputEl) {
    entryWebhookInputEl.addEventListener("change", () => {
      const value = entryWebhookInputEl.value;
      void saveBabySettings({ entry_webhook_url: value || null });
    });
  }
  if (homeKpisWebhookInputEl) {
    homeKpisWebhookInputEl.addEventListener("change", () => {
      const value = homeKpisWebhookInputEl.value;
      void saveBabySettings({ home_kpis_webhook_url: value || null });
    });
  }
  if (defaultUserInputEl) {
    defaultUserInputEl.addEventListener("change", () => {
      const value = defaultUserInputEl.value;
      void saveBabySettings({ default_user_slug: value || null });
    });
  }
  if (openaiModelInputEl) {
    openaiModelInputEl.addEventListener("change", () => {
      const value = openaiModelInputEl.value;
      void saveBabySettings({ openai_model: value || null });
    });
  }
  if (openaiTimeoutInputEl) {
    openaiTimeoutInputEl.addEventListener("change", () => {
      const nextValue = Number.parseInt(openaiTimeoutInputEl.value, 10);
      if (!Number.isInteger(nextValue) || nextValue <= 0) {
        openaiTimeoutInputEl.value = "45";
        return;
      }
      void saveBabySettings({ openai_timeout_seconds: nextValue });
    });
  }
  if (openaiPromptInputEl) {
    openaiPromptInputEl.addEventListener("change", () => {
      void saveBabySettings({ openai_prompt_template: openaiPromptInputEl.value || null });
    });
  }
  if (enablePushRemindersBtn) {
    enablePushRemindersBtn.addEventListener("click", () => {
      void enablePushReminders();
    });
  }
  if (disablePushRemindersBtn) {
    disablePushRemindersBtn.addEventListener("click", () => {
      void disablePushReminders();
    });
  }
  if (settingsFormEl) {
    settingsFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      void handleCsvExport();
    });
    toggleDisabled(exportCsvBtn, !state.userValid);
  }
  void refreshPushReminderState();
}

function applyUserState() {
  initQuickLogHandlers();
  toggleDisabled(feedBtn, !state.userValid);
  toggleDisabled(nappyBtn, !state.userValid);
  toggleDisabled(miscBtn, !state.userValid);
  toggleDisabled(pooBtn, !state.userValid);
  toggleDisabled(weeBtn, !state.userValid);

  if (pageType === "settings") {
    initSettingsHandlers();
    updateUserDisplay();
    void refreshPushReminderState();
    if (exportCsvBtn) {
      toggleDisabled(exportCsvBtn, !state.userValid);
    }
    return;
  }
  const allowTimeline = pageType === "timeline";
  const allowSharedPage = allowTimeline
    || pageType === "calendar"
    || pageType === "calendar-form"
    || pageType === "bottles"
    || pageType === "goals"
    || pageType === "milk-express";
  toggleDisabled(refreshBtn, false);
  if (csvFileEl) {
    csvFileEl.disabled = !state.userValid;
  }
  if (csvUploadBtn) {
    csvUploadBtn.disabled = !state.userValid;
  }
  statCardEls.forEach((card) => {
    card.classList.toggle("is-clickable", state.userValid);
    toggleDisabled(card, !state.userValid);
  });
  homeStatFlipCardEls.forEach((card) => {
    toggleDisabled(card, !state.userValid);
    syncHomeStatCardState(card);
  });
  initLinks();
  updateUserDisplay();
  void hydrateBreastfeedFromLocalEntries();
  void hydrateTimedEventFromLocalEntries();
  updateBreastfeedButton();
  updateMiscTimedEventControls();
  if (userFormEl) {
    userFormEl.hidden = state.userValid || allowSharedPage;
  }
  if (!state.userValid && !allowSharedPage) {
    closeFeedMenu();
    setStatus("Choose a user below to start logging.");
  } else {
    setStatus("");
  }
  if (pageType === "home") {
    initHomeHandlers();
    loadHomeEntries();
  }
  if (pageType === "log") {
    initLogHandlers();
    loadLogEntries();
  }
  if (pageType === "summary") {
    initSummaryHandlers();
    loadSummaryEntries();
  }
  if (pageType === "weight") {
    void loadWeightPercentileEntries();
  }
  if (pageType === "timeline") {
    initTimelineHandlers();
    loadTimelineEntries({ reset: true });
  }
}

function setActiveUser(value, persist = true) {
  const normalized = normalizeUserSlug(value);
  state.activeUser = normalized;
  state.userValid = Boolean(normalized);
  bodyEl.dataset.user = state.activeUser;
  bodyEl.dataset.userValid = state.userValid ? "true" : "false";
  if (persist) {
    if (state.userValid) {
      window.localStorage.setItem(USER_KEY, state.activeUser);
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  }
  applyUserState();
}

function initializeUser() {
  const initialUser = normalizeUserSlug(state.activeUser);
  if (state.userValid && !initialUser) {
    state.userValid = false;
  }
  state.activeUser = initialUser;
  if (!state.userValid) {
    const stored = normalizeUserSlug(window.localStorage.getItem(USER_KEY));
    if (stored && !RESERVED_USER_SLUGS.has(stored)) {
      state.activeUser = stored;
      state.userValid = true;
    }
  }
  if (state.userValid) {
    window.localStorage.setItem(USER_KEY, state.activeUser);
  }
  bodyEl.dataset.user = state.activeUser;
  bodyEl.dataset.userValid = state.userValid ? "true" : "false";
  applyUserState();
}

function handleUserSave(event) {
  if (event) {
    event.preventDefault();
  }
  if (!userInputEl) {
    return;
  }
  const normalized = normalizeUserSlug(userInputEl.value);
  if (!normalized) {
    setStatus("User must be 1-24 chars: a-z, 0-9, hyphen.");
    userInputEl.focus();
    return;
  }
  setActiveUser(normalized);
}

function openNappyMenu() {
  if (!nappyMenu || !nappyBtn) {
    return;
  }
  nappyMenu.classList.add("open");
  nappyMenu.setAttribute("aria-hidden", "false");
  nappyBtn.setAttribute("aria-expanded", "true");
  if (nappyBackdrop) {
    nappyBackdrop.classList.add("open");
  }
}

function closeNappyMenu() {
  if (!nappyMenu || !nappyBtn) {
    return;
  }
  nappyMenu.classList.remove("open");
  nappyMenu.setAttribute("aria-hidden", "true");
  nappyBtn.setAttribute("aria-expanded", "false");
  if (nappyBackdrop) {
    nappyBackdrop.classList.remove("open");
  }
}

function toggleNappyMenu() {
  if (!nappyMenu) {
    return;
  }
  if (nappyMenu.classList.contains("open")) {
    closeNappyMenu();
  } else {
    closeFeedMenu();
    closeMiscMenu();
    openNappyMenu();
  }
}

function openMiscMenu() {
  if (!miscMenu || !miscBtn) {
    return;
  }
  if (!state.customEventTypes.length) {
    return;
  }
  miscMenu.classList.add("open");
  miscMenu.setAttribute("aria-hidden", "false");
  miscBtn.setAttribute("aria-expanded", "true");
  if (miscBackdrop) {
    miscBackdrop.classList.add("open");
  }
}

function closeMiscMenu() {
  if (!miscMenu || !miscBtn) {
    return;
  }
  miscMenu.classList.remove("open");
  miscMenu.setAttribute("aria-hidden", "true");
  miscBtn.setAttribute("aria-expanded", "false");
  if (miscBackdrop) {
    miscBackdrop.classList.remove("open");
  }
}

function toggleMiscMenu() {
  if (!miscMenu) {
    return;
  }
  if (miscMenu.classList.contains("open")) {
    closeMiscMenu();
  } else {
    closeFeedMenu();
    closeNappyMenu();
    openMiscMenu();
  }
}

function openFeedMenu() {
  if (!feedMenu || !feedBtn || !state.userValid) {
    return;
  }
  feedMenu.classList.add("open");
  feedMenu.setAttribute("aria-hidden", "false");
  feedBtn.setAttribute("aria-expanded", "true");
  if (feedBackdrop) {
    feedBackdrop.classList.add("open");
  }
  updateBreastfeedButton();
}

function setManualVisible(visible) {
  if (!feedManualWrap) {
    return;
  }
  feedManualWrap.hidden = !visible;
  if (visible) {
    if (formulaInput) {
      formulaInput.focus();
    } else if (expressedInput) {
      expressedInput.focus();
    }
  }
}

function syncQuickFeedButtons() {
  if (!feedQuickBtns.length) {
    return;
  }
  const quickFeedValues = {
    small: state.feedSizeSmallMl,
    medium: state.feedSizeMediumMl,
    big: state.feedSizeBigMl,
  };
  feedQuickBtns.forEach((btn) => {
    const size = btn.dataset.quickSize;
    if (!size || !Object.hasOwn(quickFeedValues, size)) {
      return;
    }
    const amount = quickFeedValues[size];
    btn.dataset.quickMl = String(amount);
    const label = size.charAt(0).toUpperCase() + size.slice(1);
    btn.textContent = `${label} ${formatMl(amount)}`;
    btn.setAttribute("aria-label", `${size} quick feed ${formatMl(amount)}`);
  });
}

function closeFeedMenu() {
  if (!feedMenu || !feedBtn) {
    return;
  }
  feedMenu.classList.remove("open");
  feedMenu.setAttribute("aria-hidden", "true");
  feedBtn.setAttribute("aria-expanded", "false");
  if (feedBackdrop) {
    feedBackdrop.classList.remove("open");
  }
  setManualVisible(false);
}

function toggleFeedMenu() {
  if (!feedMenu) {
    return;
  }
  if (feedMenu.classList.contains("open")) {
    closeFeedMenu();
  } else {
    closeNappyMenu();
    closeMiscMenu();
    openFeedMenu();
  }
}

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message || "";
  }
}

function handleQuickLog(amountMl) {
  if (!state.userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const payload = buildEntryPayload("feed");
  payload.formula_ml = amountMl;
  closeFeedMenu();
  void saveEntry(payload);
}

function setLoadingState(isLoading) {
  if (!bodyEl) {
    return;
  }
  bodyEl.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    bodyEl.setAttribute("aria-busy", "true");
  } else {
    bodyEl.removeAttribute("aria-busy");
  }
}

async function handleCsvUpload(event) {
  event.preventDefault();
  if (!state.userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  if (!csvFileEl || !csvFileEl.files || !csvFileEl.files.length) {
    setStatus("Choose a CSV file to upload.");
    return;
  }
  const file = csvFileEl.files[0];
  const formData = new FormData();
  formData.append("file", file);
  setStatus("Uploading CSV...");
  try {
    const response = await fetch(buildUrl(`/api/users/${state.activeUser}/entries/import`), {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error || "Upload failed.");
      return;
    }
    const created = payload.created ?? 0;
    const suffix = created === 1 ? "entry" : "entries";
    setStatus(`Imported ${created} ${suffix}.`);
    if (csvFormEl) {
      csvFormEl.reset();
    }
    await loadLogEntries();
  } catch (error) {
    setStatus("Upload failed.");
  }
}

async function handleCsvExport() {
  if (!state.userValid || !state.activeUser) {
    setStatus("Choose a user below to export entries.");
    return;
  }
  setStatus("Preparing CSV...");
  try {
    const response = await fetch(buildUrl("/api/entries/export"));
    if (!response.ok) {
      let detail = "";
      try {
        const err = await response.json();
        detail = err.error || JSON.stringify(err);
      } catch (parseError) {
        detail = await response.text();
      }
      setStatus(`Error: ${detail || response.status}`);
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `baby-tracker-events-${state.activeUser}-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setStatus("CSV downloaded");
  } catch (error) {
    setStatus("Error: network issue exporting CSV");
  }
}

function urlBase64ToUint8Array(value) {
  const base64 = `${value}`.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob(`${base64}${padding}`);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function isPushSupported() {
  return (
    "serviceWorker" in navigator
    && "PushManager" in window
    && typeof Notification !== "undefined"
  );
}

async function getCurrentPushSubscription() {
  if (!isPushSupported()) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

function renderPushReminderState() {
  if (pushReminderUserEl) {
    if (state.userValid && state.activeUser) {
      pushReminderUserEl.textContent = `Current user: ${state.activeUser}`;
    } else {
      pushReminderUserEl.textContent = "Choose a user to enable confirmations.";
    }
  }
  if (!pushReminderStatusEl) {
    return;
  }
  if (!pushReminderState.supported) {
    pushReminderStatusEl.textContent = "This browser does not support native push notifications.";
  } else if (!pushReminderState.configured) {
    pushReminderStatusEl.textContent = "Push notifications are not configured on the server yet.";
  } else if (!state.userValid || !state.activeUser) {
    pushReminderStatusEl.textContent = "Choose a user to enable confirmations on this device.";
  } else if (pushReminderState.permission === "denied") {
    pushReminderStatusEl.textContent = "Notifications are blocked in this browser. Allow them in browser settings to continue.";
  } else if (pushReminderState.enabled && pushReminderState.isCurrentDevice) {
    pushReminderStatusEl.textContent = "Active on this device.";
  } else if (pushReminderState.enabled) {
    pushReminderStatusEl.textContent = "Active on another device for this user.";
  } else {
    pushReminderStatusEl.textContent = "Not enabled on this device.";
  }
  if (enablePushRemindersBtn) {
    enablePushRemindersBtn.disabled = (
      !pushReminderState.supported
      || !pushReminderState.configured
      || !state.userValid
      || pushReminderState.permission === "denied"
    );
  }
  if (disablePushRemindersBtn) {
    disablePushRemindersBtn.disabled = !state.userValid || !pushReminderState.supported;
  }
}

async function refreshPushReminderState() {
  pushReminderState.supported = isPushSupported();
  pushReminderState.permission = typeof Notification === "undefined"
    ? "default"
    : Notification.permission;
  pushReminderState.configured = false;
  pushReminderState.enabled = false;
  pushReminderState.endpoint = "";
  pushReminderState.isCurrentDevice = false;
  renderPushReminderState();
  if (!pushReminderState.supported || !state.userValid || !state.activeUser) {
    return;
  }
  try {
    const [registration, response] = await Promise.all([
      getCurrentPushSubscription(),
      fetch(buildUrl(`/api/push/subscription?user_slug=${encodeURIComponent(state.activeUser)}`)),
    ]);
    pushReminderState.configured = response.status !== 404;
    if (!response.ok) {
      renderPushReminderState();
      return;
    }
    const payload = await response.json().catch(() => ({}));
    pushReminderState.configured = Boolean(payload.configured);
    pushReminderState.enabled = Boolean(payload.enabled);
    pushReminderState.endpoint = payload.endpoint || "";
    pushReminderState.isCurrentDevice = Boolean(
      registration && payload.endpoint && registration.endpoint === payload.endpoint,
    );
  } catch (error) {
    console.error("Failed to refresh push confirmations", error);
  }
  renderPushReminderState();
}

async function enablePushReminders() {
  if (!state.userValid || !state.activeUser) {
    setStatus("Choose a user before enabling confirmations");
    return;
  }
  if (!isPushSupported()) {
    setStatus("This browser does not support push notifications");
    return;
  }
  setStatus("Enabling confirmations on this device...");
  try {
    const permission = await Notification.requestPermission();
    pushReminderState.permission = permission;
    if (permission !== "granted") {
      renderPushReminderState();
      setStatus("Notification permission was not granted");
      return;
    }
    const keyResponse = await fetch(buildUrl("/api/push/vapid-public-key"));
    if (!keyResponse.ok) {
      pushReminderState.configured = false;
      renderPushReminderState();
      setStatus("Error: push notifications are not configured on the server");
      return;
    }
    const keyPayload = await keyResponse.json();
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyPayload.public_key),
      });
    }
    const response = await fetch(buildUrl("/api/push/subscription"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_slug: state.activeUser,
        subscription: subscription.toJSON(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(`Error: ${payload.error || response.status}`);
      return;
    }
    pushReminderState.configured = true;
    pushReminderState.enabled = true;
    pushReminderState.endpoint = payload.endpoint || subscription.endpoint || "";
    pushReminderState.isCurrentDevice = true;
    renderPushReminderState();
    setStatus("Entry confirmations enabled on this device");
  } catch (error) {
    console.error("Failed to enable push confirmations", error);
    setStatus("Error: could not enable push confirmations");
  }
}

async function disablePushReminders() {
  if (!state.userValid || !state.activeUser) {
    setStatus("Choose a user before disabling confirmations");
    return;
  }
  setStatus("Disabling confirmations on this device...");
  try {
    const subscription = await getCurrentPushSubscription();
    await fetch(buildUrl("/api/push/subscription"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_slug: state.activeUser }),
    });
    if (subscription) {
      await subscription.unsubscribe().catch(() => false);
    }
    pushReminderState.enabled = false;
    pushReminderState.endpoint = "";
    pushReminderState.isCurrentDevice = false;
    renderPushReminderState();
    setStatus("Entry confirmations disabled on this device");
  } catch (error) {
    console.error("Failed to disable push confirmations", error);
    setStatus("Error: could not disable push confirmations");
  }
}

function startAutoRefresh(refreshFn) {
  if (refreshTimer) {
    return;
  }
  let autoRefreshInFlight = false;
  refreshTimer = window.setInterval(() => {
    if (!state.userValid || !navigator.onLine || document.visibilityState === "hidden" || autoRefreshInFlight) {
      return;
    }
    autoRefreshInFlight = true;
    Promise.resolve(refreshFn()).finally(() => {
      autoRefreshInFlight = false;
    });
  }, AUTO_REFRESH_INTERVAL_MS);
}

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB not supported"));
  }
  if (openDb.cached) {
    return openDb.cached;
  }
  openDb.cached = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    const openTimeoutId = window.setTimeout(() => {
      openDb.cached = null;
      reject(new Error("IndexedDB open timed out"));
    }, 3000);
    request.onupgradeneeded = () => {
      const db = request.result;
      let entriesStore;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        entriesStore = db.createObjectStore(STORE_ENTRIES, { keyPath: "client_event_id" });
      } else {
        entriesStore = request.transaction.objectStore(STORE_ENTRIES);
      }
      if (!entriesStore.indexNames.contains(INDEX_ENTRIES_TS)) {
        entriesStore.createIndex(INDEX_ENTRIES_TS, "timestamp_utc", { unique: false });
      }
      if (!entriesStore.indexNames.contains(INDEX_ENTRIES_USER)) {
        entriesStore.createIndex(INDEX_ENTRIES_USER, "user_slug", { unique: false });
      }
      if (!entriesStore.indexNames.contains(INDEX_ENTRIES_USER_TS)) {
        entriesStore.createIndex(INDEX_ENTRIES_USER_TS, ["user_slug", "timestamp_utc"], { unique: false });
      }
      if (!entriesStore.indexNames.contains(INDEX_ENTRIES_TYPE_TS)) {
        entriesStore.createIndex(INDEX_ENTRIES_TYPE_TS, ["type", "timestamp_utc"], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    request.onblocked = () => {
      window.clearTimeout(openTimeoutId);
      openDb.cached = null;
      reject(new Error("IndexedDB upgrade blocked by another tab or worker"));
    };
    request.onsuccess = () => {
      window.clearTimeout(openTimeoutId);
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        openDb.cached = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      window.clearTimeout(openTimeoutId);
      openDb.cached = null;
      reject(request.error);
    };
  });
  return openDb.cached;
}

async function getMetaValue(key) {
  const db = await openDb();
  const tx = db.transaction(STORE_META, "readonly");
  const store = tx.objectStore(STORE_META);
  const record = await requestToPromise(store.get(key));
  return record ? record.value : null;
}

async function setMetaValue(key, value) {
  const db = await openDb();
  const tx = db.transaction(STORE_META, "readwrite");
  const store = tx.objectStore(STORE_META);
  await requestToPromise(store.put({ key, value }));
}

async function getDeviceId() {
  let deviceId = await getMetaValue(META_DEVICE_ID);
  if (!deviceId) {
    deviceId = generateId();
    await setMetaValue(META_DEVICE_ID, deviceId);
  }
  return deviceId;
}

async function getSyncCursor() {
  return getMetaValue(META_SYNC_CURSOR);
}

async function setSyncCursor(cursor) {
  await setMetaValue(META_SYNC_CURSOR, cursor);
}

async function upsertEntryLocal(entry) {
  const db = await openDb();
  const tx = db.transaction(STORE_ENTRIES, "readwrite");
  const store = tx.objectStore(STORE_ENTRIES);
  await requestToPromise(store.put(entry));
}

async function getEntryLocal(clientEventId) {
  const db = await openDb();
  const tx = db.transaction(STORE_ENTRIES, "readonly");
  const store = tx.objectStore(STORE_ENTRIES);
  return requestToPromise(store.get(clientEventId));
}

function toComparableIso(value) {
  if (typeof value !== "string") {
    return null;
  }
  if (!value.trim()) {
    return null;
  }
  return value;
}

function toComparableTimestampMs(value) {
  if (typeof value !== "string") {
    return null;
  }
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getTime();
}

function createIsoNowMinusDays(days) {
  return new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
}

function maxIso(left, right) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return left > right ? left : right;
}

function shouldIncludeLocalEntry(entry, params, lowerBoundIso, upperBoundIso) {
  if (!entry || entry.deleted_at_utc) {
    return false;
  }
  if (params.user_slug && entry.user_slug !== params.user_slug) {
    return false;
  }
  if (params.type && entry.type !== params.type) {
    return false;
  }
  const timestampMs = toComparableTimestampMs(entry.timestamp_utc);
  if (timestampMs === null) {
    return false;
  }
  const lowerBoundMs = toComparableTimestampMs(lowerBoundIso);
  if (lowerBoundMs !== null && timestampMs < lowerBoundMs) {
    return false;
  }
  const upperBoundMs = toComparableTimestampMs(upperBoundIso);
  if (upperBoundMs !== null && timestampMs > upperBoundMs) {
    return false;
  }
  return true;
}

function schedulePruneEntriesLocal(cutoffIso) {
  if (pruneScheduled || pruneInFlight) {
    return;
  }
  pruneScheduled = true;
  window.setTimeout(() => {
    pruneScheduled = false;
    void pruneEntriesLocal(cutoffIso);
  }, 0);
}

async function pruneEntriesLocal(cutoffIso) {
  if (pruneInFlight) {
    return;
  }
  if (!("indexedDB" in window) || typeof window.IDBKeyRange === "undefined") {
    return;
  }
  pruneInFlight = true;
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ENTRIES, "readwrite");
      const store = tx.objectStore(STORE_ENTRIES);
      const index = store.index(INDEX_ENTRIES_TS);
      const range = window.IDBKeyRange.upperBound(cutoffIso, true);
      const request = index.openCursor(range, "next");

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve();
          return;
        }
        store.delete(cursor.primaryKey);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    pruneInFlight = false;
  }
}

async function listEntriesLocal(params = {}) {
  if (typeof window.IDBKeyRange === "undefined") {
    return [];
  }
  try {
    return await listEntriesLocalIndexed(params);
  } catch (err) {
    return listEntriesLocalLegacy(params);
  }
}

async function listEntriesLocalIndexed(params = {}) {
  const db = await openDb();
  const tx = db.transaction(STORE_ENTRIES, "readonly");
  const store = tx.objectStore(STORE_ENTRIES);
  const cutoffIso = createIsoNowMinusDays(OFFLINE_WINDOW_DAYS);
  schedulePruneEntriesLocal(cutoffIso);

  const sinceIso = toComparableIso(params.since);
  const untilIso = toComparableIso(params.until);
  const lowerBoundIso = maxIso(cutoffIso, sinceIso);
  const upperBoundIso = untilIso;
  const limit = Number.isFinite(params.limit)
    ? Math.max(1, Number.parseInt(String(params.limit), 10))
    : null;
  const allEntries = await requestToPromise(store.getAll());
  const filtered = sortEntriesByTimestampDesc(allEntries.filter((entry) => (
    shouldIncludeLocalEntry(entry, params, lowerBoundIso, upperBoundIso)
  )));
  if (limit) {
    return filtered.slice(0, limit);
  }
  return filtered;
}

async function listEntriesLocalLegacy(params = {}) {
  const db = await openDb();
  const tx = db.transaction(STORE_ENTRIES, "readonly");
  const store = tx.objectStore(STORE_ENTRIES);
  const allEntries = await requestToPromise(store.getAll());
  const cutoffIso = createIsoNowMinusDays(OFFLINE_WINDOW_DAYS);
  schedulePruneEntriesLocal(cutoffIso);
  const sinceIso = toComparableIso(params.since);
  const untilIso = toComparableIso(params.until);
  const lowerBoundIso = maxIso(cutoffIso, sinceIso);
  const upperBoundIso = untilIso;

  const filtered = sortEntriesByTimestampDesc(allEntries.filter((entry) => (
    shouldIncludeLocalEntry(entry, params, lowerBoundIso, upperBoundIso)
  )));
  if (Number.isFinite(params.limit)) {
    return filtered.slice(0, Math.max(1, Number.parseInt(String(params.limit), 10)));
  }
  return filtered;
}

async function enqueueOutbox(change) {
  const db = await openDb();
  const tx = db.transaction(STORE_OUTBOX, "readwrite");
  const store = tx.objectStore(STORE_OUTBOX);
  await requestToPromise(
    store.add({ ...change, queued_at: new Date().toISOString() }),
  );
}

async function drainOutbox(limit = 100) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readonly");
    const store = tx.objectStore(STORE_OUTBOX);
    const items = [];
    let count = 0;
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor || count >= limit) {
        resolve(items);
        return;
      }
      items.push({ key: cursor.key, value: cursor.value });
      count += 1;
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearOutbox(keys) {
  if (!keys.length) {
    return;
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    const store = tx.objectStore(STORE_OUTBOX);
    keys.forEach((key) => store.delete(key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function applyServerEntries(entries) {
  if (!entries || !entries.length) {
    return;
  }
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, "readwrite");
    const store = tx.objectStore(STORE_ENTRIES);
    entries.forEach((entry) => store.put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function syncNow() {
  if (!navigator.onLine) {
    return null;
  }
  if (syncInFlight) {
    return syncInFlight;
  }
  syncInFlight = (async () => {
    const deviceId = await getDeviceId();
    const cursor = await getSyncCursor();
    const outbox = await drainOutbox();
    const changes = outbox.map((item) => item.value);

    if (changes.length) {
      setStatus("Syncing...");
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    let response;
    try {
      response = await fetch(buildUrl("/api/sync/entries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, cursor, changes }),
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    await applyServerEntries(data.entries || []);
    updateBreastfeedStateFromSync(data.entries || []);
    updateTimedEventStateFromSync(data.entries || []);
    await setSyncCursor(data.cursor);
    await clearOutbox(outbox.map((item) => item.key));
    if (changes.length) {
      setStatus("Synced");
    }
    return data;
  })()
    .catch((err) => {
      console.warn("Sync failed", err);
      if (!navigator.onLine) {
        setStatus("Offline - changes will sync when online");
      } else if (statusEl) {
        setStatus("Sync failed");
      }
      return null;
    })
    .finally(() => {
      syncInFlight = null;
    });
  return syncInFlight;
}

function scheduleSync() {
  if (syncTimerId) {
    return;
  }
  syncTimerId = window.setInterval(() => {
    if (!navigator.onLine || document.visibilityState === "hidden") {
      return;
    }
    void syncNow();
  }, BACKGROUND_SYNC_INTERVAL_MS);
}

function setNextFeedShortcut(enabled, href) {
  if (!nextFeedShortcutEl) {
    return;
  }
  nextFeedShortcutEl.classList.toggle("is-disabled", !enabled);
  if (enabled && href) {
    nextFeedShortcutEl.href = href;
    nextFeedShortcutEl.removeAttribute("aria-disabled");
  } else {
    nextFeedShortcutEl.removeAttribute("href");
    nextFeedShortcutEl.setAttribute("aria-disabled", "true");
  }
}

function updateNextFeed() {
  if (!nextFeedEl) {
    return;
  }
  const intervalMinutes = getFeedIntervalMinutes();
  const lastTimestamp = lastFeedEl ? lastFeedEl.dataset.timestamp : null;
  if (!intervalMinutes || !lastTimestamp) {
    if (nextFeedEl) {
      nextFeedEl.textContent = "--";
      nextFeedEl.removeAttribute("data-timestamp");
    }
    // nextFeedCard removed
    setNextFeedShortcut(false, "");
    return;
  }
  const lastDate = new Date(lastTimestamp);
  if (Number.isNaN(lastDate.getTime())) {
    if (nextFeedEl) {
      nextFeedEl.textContent = "--";
      nextFeedEl.removeAttribute("data-timestamp");
    }
    // nextFeedCard removed
    setNextFeedShortcut(false, "");
    return;
  }
  const nextDate = new Date(lastDate.getTime() + intervalMinutes * 60000);
  if (nextFeedEl) {
    nextFeedEl.textContent = formatTimeUntil(nextDate);
    nextFeedEl.dataset.timestamp = nextDate.toISOString();
  }
  const shortcutUrl = buildFeedShortcutUrl(nextDate);
  setNextFeedShortcut(Boolean(shortcutUrl), shortcutUrl);
}

function bindNextFeedPopup(element) {
  if (!element) {
    return;
  }
  if (nextFeedShowPreviousEl) {
    nextFeedShowPreviousEl.addEventListener("click", () => {
      if (!nextFeedListEl) {
        return;
      }
      nextFeedListEl.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  element.addEventListener("click", () => {
    const intervalMinutes = getFeedIntervalMinutes();
    const lastTimestamp = lastFeedEl ? lastFeedEl.dataset.timestamp : null;
    const showEmpty = () => {
      if (nextFeedListEl) {
        nextFeedListEl.innerHTML = "";
        nextFeedListEl.scrollTop = 0;
      }
      if (nextFeedSubEl) {
        nextFeedSubEl.textContent = "Every -- minutes";
      }
      if (nextFeedEmptyEl) {
        nextFeedEmptyEl.hidden = false;
      }
      if (nextFeedShowPreviousEl) {
        nextFeedShowPreviousEl.hidden = true;
      }
      openNextFeedModal();
    };
    if (!intervalMinutes || !lastTimestamp) {
      showEmpty();
      return;
    }
    const lastDate = new Date(lastTimestamp);
    if (Number.isNaN(lastDate.getTime())) {
      showEmpty();
      return;
    }
    if (nextFeedListEl) {
      nextFeedListEl.innerHTML = "";
      nextFeedListEl.scrollTop = 0;
    }
    if (nextFeedEmptyEl) {
      nextFeedEmptyEl.hidden = true;
    }
    if (nextFeedSubEl) {
      nextFeedSubEl.textContent = `Every ${intervalMinutes} minutes`;
    }
    if (nextFeedShowPreviousEl) {
      nextFeedShowPreviousEl.hidden = false;
    }

    const nowTs = Date.now();
    const previousEntries = getPrevious24hFeedEntries(nowTs);
    if (nextFeedListEl && previousEntries.length) {
      const previousLabel = document.createElement("div");
      previousLabel.className = "next-feed-section-label";
      previousLabel.textContent = "Previous 24h feeds";
      nextFeedListEl.appendChild(previousLabel);

      previousEntries.forEach((entry) => {
        const row = buildNextFeedRow({
          date: new Date(entry.ts),
          detail: `Fed ${formatMl(entry.ml)}`,
          meta: `${formatRelativeTime(new Date(entry.ts))} ago`,
          itemClass: "next-feed-item next-feed-item--previous",
          dotClass: "next-feed-dot next-feed-dot--previous",
        });
        nextFeedListEl.appendChild(row);
      });
    }

    let nextAnchorEl = null;
    const suggestionPlan = getUpcomingFeedSuggestionPlan({
      nowTs,
      firstFeedTs: lastDate.getTime() + intervalMinutes * 60000,
      intervalMinutes,
      feedCount: 6,
    });
    const suggestionByTs = new Map(
      suggestionPlan.map((entry) => [entry.ts, entry]),
    );
    if (nextFeedListEl) {
      const upcomingLabel = document.createElement("div");
      upcomingLabel.className = "next-feed-section-label";
      upcomingLabel.textContent = "Next 6 feeds";
      nextFeedListEl.appendChild(upcomingLabel);
      nextAnchorEl = upcomingLabel;
    }

    for (let i = 1; i <= 6; i += 1) {
      const nextDate = new Date(lastDate.getTime() + intervalMinutes * 60000 * i);
      const suggestion = suggestionByTs.get(nextDate.getTime());
      const detail = suggestion
        ? [
          `Suggested: ${suggestion.category === "small" ? "Small" : "Big"} (${formatMl(suggestion.ml)})`,
          `Rolling total: ${formatMl(suggestion.rollingTotalMl)}`,
        ].join(" · ")
        : "";
      const item = buildNextFeedRow({
        date: nextDate,
        detail,
        meta: formatTimeUntil(nextDate),
      });
      if (nextFeedListEl) {
        nextFeedListEl.appendChild(item);
      }
    }
    openNextFeedModal();
    if (nextFeedListEl && nextAnchorEl) {
      window.requestAnimationFrame(() => {
        const offset = Math.max(0, nextAnchorEl.offsetTop - 8);
        nextFeedListEl.scrollTo({ top: offset, behavior: "auto" });
      });
    }
  });
}

function openNextFeedModal() {
  if (nextFeedModalEl) {
    nextFeedModalEl.hidden = false;
    nextFeedModalEl.setAttribute("aria-hidden", "false");
  }
  if (nextFeedBackdropEl) {
    nextFeedBackdropEl.classList.add("open");
    nextFeedBackdropEl.hidden = false;
  }
}

function closeNextFeedModal() {
  if (nextFeedModalEl) {
    nextFeedModalEl.hidden = true;
    nextFeedModalEl.setAttribute("aria-hidden", "true");
  }
  if (nextFeedBackdropEl) {
    nextFeedBackdropEl.classList.remove("open");
    nextFeedBackdropEl.hidden = true;
  }
}

function bindTimestampPopup(element) {
  if (!element) {
    return;
  }
  element.addEventListener("click", () => {
    const timestamp = element.dataset.timestamp;
    if (timestamp) {
      window.alert(formatTimestamp(timestamp));
    }
  });
}

function computeWindow(hours) {
  const until = new Date();
  const since = new Date(until.getTime() - hours * 60 * 60 * 1000);
  return {
    since,
    until,
    sinceIso: since.toISOString(),
    untilIso: until.toISOString(),
  };
}

function createWindow(since, until) {
  return {
    since,
    until,
    sinceIso: since.toISOString(),
    untilIso: until.toISOString(),
  };
}

function buildChartWindows(totalHours, chunkHours, until = new Date()) {
  const windows = [];
  const totalChunks = Math.ceil(totalHours / chunkHours);
  for (let index = totalChunks; index > 0; index -= 1) {
    const chunkUntil = new Date(until.getTime() - (index - 1) * chunkHours * 60 * 60 * 1000);
    const chunkSince = new Date(chunkUntil.getTime() - chunkHours * 60 * 60 * 1000);
    windows.push({
      ...createWindow(chunkSince, chunkUntil),
      startHoursAgo: index * chunkHours,
      endHoursAgo: (index - 1) * chunkHours,
    });
  }
  return windows;
}

function formatChartTickTime(date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatChartPanelLabel(windowBounds) {
  if (windowBounds.endHoursAgo === 0) {
    return `Last ${windowBounds.startHoursAgo}h`;
  }
  return `${windowBounds.startHoursAgo}-${windowBounds.endHoursAgo}h ago`;
}

function formatChartPanelTime(windowBounds) {
  return `${formatChartTickTime(windowBounds.since)}-${formatChartTickTime(windowBounds.until)}`;
}

function getCssVar(name, fallback) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name);
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeFeedEntry(entry) {
  if (!entry || entry.type !== "feed") {
    return null;
  }
  const timestamp = new Date(entry.timestamp_utc);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }
  const amount = Number.isFinite(entry.amount_ml) ? entry.amount_ml : 0;
  const expressed = Number.isFinite(entry.expressed_ml) ? entry.expressed_ml : 0;
  const formula = Number.isFinite(entry.formula_ml) ? entry.formula_ml : 0;
  const total = amount + expressed + formula;
  if (!total) {
    return null;
  }
  return {
    ts: timestamp.getTime(),
    total,
    expressed,
    formula,
  };
}

function buildRulerBuckets() {
  const buckets = new Map();
  rulerEntries.forEach((entry) => {
    const bucketTs = Math.round(entry.ts / RULER_BUCKET_MS) * RULER_BUCKET_MS;
    const key = bucketTs.toString();
    if (!buckets.has(key)) {
      buckets.set(key, { ts: bucketTs, total: 0, expressed: 0, formula: 0 });
    }
    const bucket = buckets.get(key);
    bucket.total += entry.total;
    bucket.expressed += entry.expressed;
    bucket.formula += entry.formula;
  });
  return Array.from(buckets.values());
}

function computeRulerWindow(anchor, stretch = 0) {
  const windowMs = RULER_WINDOW_MS * (1 + stretch);
  const start = anchor - windowMs;
  let total = 0;
  let expressed = 0;
  let formula = 0;
  rulerEntries.forEach((entry) => {
    if (entry.ts >= start && entry.ts <= anchor) {
      total += entry.total;
      expressed += entry.expressed;
      formula += entry.formula;
    }
  });
  return {
    start,
    end: anchor,
    total,
    expressed,
    formula,
    windowMs,
  };
}

function nearestRulerFeedTs(ts) {
  if (!rulerEntries.length) {
    return ts;
  }
  let nearest = rulerEntries[0].ts;
  let minDiff = Math.abs(ts - nearest);
  rulerEntries.forEach((entry) => {
    const diff = Math.abs(ts - entry.ts);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = entry.ts;
    }
  });
  return nearest;
}

function clampRulerAnchor() {
  if (!Number.isFinite(rulerMinTs) || !Number.isFinite(rulerMaxTs)) {
    return;
  }
  const minAnchor = rulerMinTs + RULER_WINDOW_MS;
  const maxAnchor = Math.max(rulerMaxTs, Date.now());
  if (rulerAnchorTs < minAnchor) {
    rulerAnchorTs = minAnchor;
  }
  if (rulerAnchorTs > maxAnchor) {
    rulerAnchorTs = maxAnchor;
  }
}

function resizeRulerCanvas() {
  if (!rulerCanvasEl) {
    return;
  }
  const rect = rulerCanvasEl.getBoundingClientRect();
  rulerCanvasEl.width = rect.width * window.devicePixelRatio;
  rulerCanvasEl.height = rect.height * window.devicePixelRatio;
  drawRuler();
}

function updateRulerReadout(data, anchorX) {
  if (!rulerReadoutEl) {
    return;
  }
  if (rulerTotalEl) {
    rulerTotalEl.textContent = formatMl(data.total);
  }
  if (rulerDetailEl) {
    rulerDetailEl.textContent = "Total feed volume in trailing 24h window";
  }
  const goalValue = Number.isFinite(rulerGoalMl) && rulerGoalMl > 0 ? rulerGoalMl : 0;
  const goalPct = goalValue ? Math.min(200, Math.round((data.total / goalValue) * 100)) : 0;
  if (rulerGoalEl) {
    rulerGoalEl.textContent = `${goalPct}% of ${goalValue || "--"} ml goal`;
  }
  if (rulerStartEl) {
    rulerStartEl.textContent = formatTimestamp(new Date(data.start).toISOString());
  }
  if (rulerEndEl) {
    rulerEndEl.textContent = formatTimestamp(new Date(data.end).toISOString());
  }
  if (!rulerBodyEl) {
    return;
  }
  const rect = rulerBodyEl.getBoundingClientRect();
  const halfReadout = rulerReadoutEl.offsetWidth / 2;
  const minX = Math.max(8, halfReadout + 8);
  const maxX = Math.min(rect.width - 8, rect.width - halfReadout - 8);
  const clamped = Math.max(minX, Math.min(maxX, anchorX));
  rulerReadoutEl.style.left = `${clamped}px`;
}

function pickRulerAnchorFromCanvasX(canvasX) {
  if (!rulerCanvasEl) {
    return null;
  }
  const rect = rulerCanvasEl.getBoundingClientRect();
  if (!rect.width) {
    return null;
  }
  const hitRadiusPx = 12;
  let nearestHit = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  rulerFeedHitTargets.forEach((target) => {
    const dist = Math.abs(target.x - canvasX);
    if (dist <= hitRadiusPx && dist < nearestDist) {
      nearestDist = dist;
      nearestHit = target;
    }
  });
  if (nearestHit) {
    return nearestHit.ts;
  }
  const ratio = Math.max(0, Math.min(1, canvasX / rect.width));
  const span = (rulerMaxTs || Date.now()) - (rulerMinTs || Date.now() - RULER_DAYS_BACK * 24 * 60 * 60 * 1000);
  return (rulerMinTs || Date.now() - RULER_DAYS_BACK * 24 * 60 * 60 * 1000) + ratio * span;
}

function drawRuler() {
  if (!rulerCanvasEl || !rulerEntries || !rulerEntries.length) {
    if (rulerCanvasEl) {
      const ctx = rulerCanvasEl.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, rulerCanvasEl.width, rulerCanvasEl.height);
      }
    }
    if (rulerEmptyEl) {
      rulerEmptyEl.style.display = "flex";
    }
    if (rulerReadoutEl) {
      rulerReadoutEl.style.display = "none";
    }
    return;
  }
  if (rulerEmptyEl) {
    rulerEmptyEl.style.display = "none";
  }
  if (rulerReadoutEl) {
    rulerReadoutEl.style.display = "block";
  }
  const ctx = rulerCanvasEl.getContext("2d");
  if (!ctx) {
    return;
  }
  const data = computeRulerWindow(rulerAnchorTs, rulerStretch);
  const { width, height } = rulerCanvasEl;
  const scale = window.devicePixelRatio;
  ctx.clearRect(0, 0, width, height);

  const padding = 18 * scale;
  const trackY = height * 0.62;
  const trackWidth = width - padding * 2;
  const trackHeight = 6 * scale;
  const minTs = rulerMinTs || Date.now() - RULER_DAYS_BACK * 24 * 60 * 60 * 1000;
  const maxTs = rulerMaxTs || Date.now();
  const span = Math.max(1, maxTs - minTs);

  const expressedColor = getCssVar("--ruler-expressed", "#13ec5b");
  const trackColor = getCssVar("--ruler-track", "#e0e7e1");
  const windowColor = getCssVar("--ruler-window", "rgba(19, 236, 91, 0.12)");
  const anchorColor = getCssVar("--ruler-anchor", "#0f1a12");

  ctx.fillStyle = trackColor;
  ctx.fillRect(padding, trackY, trackWidth, trackHeight);

  const windowStartRatio = (data.start - minTs) / span;
  const windowEndRatio = (data.end - minTs) / span;
  const windowX = padding + windowStartRatio * trackWidth;
  const windowW = (windowEndRatio - windowStartRatio) * trackWidth;
  ctx.fillStyle = windowColor;
  ctx.fillRect(windowX, trackY - 26 * scale, windowW, trackHeight + 52 * scale);

  const buckets = buildRulerBuckets().filter((bucket) => (
    bucket.ts >= minTs && bucket.ts <= maxTs
  ));
  rulerFeedHitTargets = [];

  buckets.forEach((bucket) => {
    const ratio = (bucket.ts - minTs) / span;
    const x = padding + ratio * trackWidth;
    rulerFeedHitTargets.push({ x: x / scale, ts: bucket.ts });
    const baseHeight = 10 * scale;
    const totalH = baseHeight + Math.min(44 * scale, bucket.total * 0.22 * scale);

    if (bucket.total > 0) {
      // Draw total volume as a single metric line to align with rolling total readout.
      ctx.strokeStyle = expressedColor;
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(x, trackY - baseHeight * 0.2);
      ctx.lineTo(x, trackY - totalH);
      ctx.stroke();
    }
  });

  const anchorRatio = (data.end - minTs) / span;
  const anchorX = padding + anchorRatio * trackWidth;
  ctx.strokeStyle = anchorColor;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(anchorX, trackY - 40 * scale);
  ctx.lineTo(anchorX, trackY + 48 * scale);
  ctx.stroke();

  updateRulerReadout(data, anchorX / scale);
}

async function loadRulerFeeds({ reset } = {}) {
  if (!rulerCanvasEl) {
    return;
  }
  if (reset) {
    rulerEntries = [];
  }
  const windowHours = RULER_DAYS_BACK * 24;
  const window = computeWindow(windowHours);
  rulerMinTs = window.since.getTime();
  rulerMaxTs = window.until.getTime();
  try {
    const [serverEntries, localEntries, currentGoal] = await Promise.all([
      fetchEntriesInWindow({
        since: window.sinceIso,
        until: window.untilIso,
        type: "feed",
      }),
      listEntriesLocalSafe({
        since: window.sinceIso,
        until: window.untilIso,
        type: "feed",
      }),
      loadCurrentGoal(),
    ]);
    const entries = serverEntries.length ? serverEntries : (localEntries || []);
    rulerGoalMl = currentGoal && Number.isFinite(currentGoal.goal_ml)
      ? currentGoal.goal_ml
      : rulerGoalMl;
    rulerEntries = entries
      .map(normalizeFeedEntry)
      .filter((entry) => Boolean(entry));
    rulerAnchorTs = window.until.getTime();
    if (rulerEntries.length) {
      rulerAnchorTs = nearestRulerFeedTs(rulerAnchorTs);
    }
    clampRulerAnchor();
    drawRuler();
  } catch (err) {
    if (rulerEmptyEl) {
      rulerEmptyEl.style.display = "flex";
      rulerEmptyEl.textContent = "Unable to load feed history.";
    }
  }
}

function onRulerPointerDown(event) {
  if (!rulerCanvasEl || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }
  rulerPointerId = event.pointerId;
  rulerDragging = true;
  rulerHasDragged = false;
  rulerDragStartX = event.clientX;
  rulerDragStartY = event.clientY;
  rulerDragStartAnchor = rulerAnchorTs;
  try {
    rulerCanvasEl.setPointerCapture(event.pointerId);
  } catch (err) {
    // Ignore capture failures and continue with best-effort dragging.
  }
}

function onRulerPointerMove(event) {
  if (!rulerDragging || !rulerCanvasEl || event.pointerId !== rulerPointerId) {
    return;
  }
  const dx = event.clientX - rulerDragStartX;
  const dy = event.clientY - rulerDragStartY;
  const dragDistance = Math.hypot(dx, dy);
  if (!rulerHasDragged && dragDistance < 8) {
    return;
  }
  rulerHasDragged = true;
  const rect = rulerCanvasEl.getBoundingClientRect();
  const ratio = dx / rect.width;
  const span = (rulerMaxTs || Date.now()) - (rulerMinTs || Date.now() - RULER_DAYS_BACK * 24 * 60 * 60 * 1000);
  const delta = ratio * span;
  rulerAnchorTs = rulerDragStartAnchor - delta;
  rulerStretch = Math.min(0.1, Math.abs(dx) / rect.width * 0.18);
  clampRulerAnchor();
  drawRuler();
}

function onRulerPointerUp() {
  if (!rulerDragging || !rulerCanvasEl) {
    return;
  }
  if (rulerPointerId !== null) {
    try {
      rulerCanvasEl.releasePointerCapture(rulerPointerId);
    } catch (err) {
      // Ignore capture release failures.
    }
  }
  const pointerId = rulerPointerId;
  rulerDragging = false;
  rulerStretch = 0;
  if (rulerHasDragged && rulerSnapToFeeds) {
    rulerAnchorTs = nearestRulerFeedTs(rulerAnchorTs);
  } else if (!rulerHasDragged && pointerId !== null) {
    // Treat a short movement as a tap/click.
    const canvasRect = rulerCanvasEl.getBoundingClientRect();
    const canvasX = rulerDragStartX - canvasRect.left;
    const targetTs = pickRulerAnchorFromCanvasX(canvasX);
    if (Number.isFinite(targetTs)) {
      rulerAnchorTs = rulerSnapToFeeds ? nearestRulerFeedTs(targetTs) : targetTs;
    }
  }
  rulerPointerId = null;
  rulerHasDragged = false;
  clampRulerAnchor();
  drawRuler();
}

function jumpRulerToNow() {
  rulerAnchorTs = Date.now();
  clampRulerAnchor();
  drawRuler();
}

function onRulerClick(event) {
  // Kept for backwards compatibility with existing call-sites; pointerup handles tap/click.
  onRulerPointerUp(event);
}

function initRulerHandlers() {
  const supportsRuler = pageType === "timeline" || pageType === "summary";
  if (rulerInitialized || !supportsRuler || !rulerCanvasEl) {
    return;
  }
  rulerInitialized = true;
  rulerCanvasEl.addEventListener("pointerdown", onRulerPointerDown);
  rulerCanvasEl.addEventListener("pointermove", onRulerPointerMove);
  rulerCanvasEl.addEventListener("pointerup", onRulerPointerUp);
  rulerCanvasEl.addEventListener("pointercancel", onRulerPointerUp);
  if (rulerSnapToggleEl) {
    rulerSnapToggleEl.addEventListener("click", () => {
      rulerSnapToFeeds = !rulerSnapToFeeds;
      rulerSnapToggleEl.classList.toggle("active", rulerSnapToFeeds);
      rulerSnapToggleEl.textContent = rulerSnapToFeeds ? "Snap to feeds" : "Free scroll";
    });
  }
  if (rulerNowBtnEl) {
    rulerNowBtnEl.addEventListener("click", () => {
      jumpRulerToNow();
    });
  }
  window.addEventListener("resize", resizeRulerCanvas);
  resizeRulerCanvas();
  void loadRulerFeeds({ reset: true });
}

function computeFeedTotalMl(entries) {
  let totalMl = 0;
  entries.forEach((entry) => {
    if (entry.type !== "feed") {
      return;
    }
    if (typeof entry.amount_ml === "number" && Number.isFinite(entry.amount_ml)) {
      totalMl += entry.amount_ml;
    }
    if (typeof entry.expressed_ml === "number" && Number.isFinite(entry.expressed_ml)) {
      totalMl += entry.expressed_ml;
    }
    if (typeof entry.formula_ml === "number" && Number.isFinite(entry.formula_ml)) {
      totalMl += entry.formula_ml;
    }
  });
  return totalMl;
}

function renderSummaryEventList(entries) {
  if (!summaryEventsListEl || !summaryEventsEmptyEl || !summaryEventsCountEl) {
    return;
  }
  summaryEventsListEl.replaceChildren();
  const sortedEntries = [...entries].sort((a, b) => {
    return new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime();
  });
  const count = sortedEntries.length;
  summaryEventsCountEl.textContent = `${count} event${count === 1 ? "" : "s"} · selected day`;
  summaryEventsEmptyEl.style.display = count ? "none" : "block";

  sortedEntries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "summary-event-item";

    const main = document.createElement("div");
    main.className = "summary-event-main";
    const title = document.createElement("div");
    title.className = "summary-event-title";
    title.textContent = formatEntryTypeLabel(entry.type);
    main.appendChild(title);

    const details = [];
    if (entry.amount_ml !== null && entry.amount_ml !== undefined) {
      details.push(`Amount ${formatMl(entry.amount_ml)}`);
    }
    if (entry.expressed_ml !== null && entry.expressed_ml !== undefined) {
      details.push(`Expressed ${formatMl(entry.expressed_ml)}`);
    }
    if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
      details.push(`Formula ${formatMl(entry.formula_ml)}`);
    }
    if (entry.weight_kg !== null && entry.weight_kg !== undefined) {
      details.push(`${Number(entry.weight_kg).toFixed(2)} kg`);
    }
    if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
      details.push(`Duration ${formatDurationMinutes(entry.feed_duration_min)}`);
    }
    if (details.length) {
      const detail = document.createElement("div");
      detail.className = "summary-event-detail";
      detail.textContent = details.join(" · ");
      main.appendChild(detail);
    }
    if (entry.notes) {
      const notes = document.createElement("div");
      notes.className = "summary-event-detail";
      notes.textContent = entry.notes;
      main.appendChild(notes);
    }
    if (entry.user_slug) {
      const byline = document.createElement("div");
      byline.className = "summary-event-byline";
      byline.textContent = `Logged by ${entry.user_slug}`;
      main.appendChild(byline);
    }

    const time = document.createElement("time");
    time.className = "summary-event-time";
    time.dateTime = entry.timestamp_utc;
    time.textContent = formatSummaryTime(entry.timestamp_utc);
    item.append(main, time);
    summaryEventsListEl.appendChild(item);
  });
}

function setSummaryDate(date) {
  summaryDate = date;
  if (summaryDateInputEl) {
    summaryDateInputEl.value = formatDateInputValue(date);
  }
  if (summaryDateLabelEl) {
    summaryDateLabelEl.textContent = formatSummaryDateLabel(date);
  }
  if (summaryNextBtn) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);
    summaryNextBtn.disabled = candidate >= today;
  }
  resetAiSummaryPanel();
}

function setAiSummaryLoading(isLoading) {
  if (!aiSummaryGenerateBtn) {
    return;
  }
  aiSummaryGenerateBtn.disabled = isLoading || !state.userValid;
  aiSummaryGenerateBtn.textContent = isLoading ? "Generating..." : "Generate handover";
}

function resetAiSummaryPanel() {
  if (!aiSummaryGenerateBtn && !aiSummaryMetaEl && !aiSummaryOutputEl) {
    return;
  }
  setAiSummaryLoading(false);
  if (aiSummaryMetaEl) {
    aiSummaryMetaEl.textContent = state.userValid
      ? "Uses notes and events from this date."
      : "Choose a user to generate a handover.";
  }
  if (aiSummaryOutputEl) {
    aiSummaryOutputEl.replaceChildren();
  }
}

function setAiChatLoading(isLoading) {
  if (aiChatSubmitBtn) {
    aiChatSubmitBtn.disabled = isLoading || !state.userValid;
    aiChatSubmitBtn.textContent = isLoading ? "Asking..." : "Ask";
  }
  aiChatPromptBtns.forEach((btn) => {
    btn.disabled = isLoading || !state.userValid;
  });
}

function resetAiChatPanel() {
  if (!aiChatFormEl && !aiChatMetaEl && !aiChatOutputEl) {
    return;
  }
  setAiChatLoading(false);
  if (aiChatMetaEl) {
    aiChatMetaEl.textContent = state.userValid
      ? "Ask about the selected day or use a suggested question."
      : "Choose a user to ask about tracker data.";
  }
  if (aiChatOutputEl) {
    aiChatOutputEl.replaceChildren();
  }
}

function appendInlineMarkdown(parent, text) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.appendChild(strong);
    } else if (token.startsWith("*")) {
      const em = document.createElement("em");
      em.textContent = token.slice(1, -1);
      parent.appendChild(em);
    } else if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        const anchor = document.createElement("a");
        anchor.textContent = linkMatch[1];
        anchor.href = linkMatch[2];
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        parent.appendChild(anchor);
      } else {
        parent.appendChild(document.createTextNode(token));
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    parent.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function makeMarkdownParagraph(text) {
  const paragraph = document.createElement("p");
  appendInlineMarkdown(paragraph, text);
  return paragraph;
}

function makeMarkdownHeading(text, level) {
  const heading = document.createElement(`h${level}`);
  appendInlineMarkdown(heading, text);
  return heading;
}

function renderMarkdownInto(target, markdown) {
  target.replaceChildren();
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  let paragraphLines = [];
  let listEl = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    target.appendChild(makeMarkdownParagraph(paragraphLines.join(" ")));
    paragraphLines = [];
  };
  const closeList = () => {
    listEl = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      closeList();
      return;
    }
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      target.appendChild(makeMarkdownHeading(headingMatch[2], headingMatch[1].length));
      return;
    }
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!listEl) {
        listEl = document.createElement("ul");
        target.appendChild(listEl);
      }
      const item = document.createElement("li");
      appendInlineMarkdown(item, listMatch[1]);
      listEl.appendChild(item);
      return;
    }
    closeList();
    paragraphLines.push(line);
  });
  flushParagraph();
}

function renderAiSummary(summary, thinking) {
  if (!aiSummaryOutputEl) {
    return;
  }
  renderMarkdownInto(aiSummaryOutputEl, summary || "");
  if (thinking) {
    const details = document.createElement("details");
    details.className = "ai-summary-thinking";
    const summaryEl = document.createElement("summary");
    summaryEl.textContent = "Thinking";
    const body = document.createElement("div");
    body.className = "ai-summary-thinking-body";
    renderMarkdownInto(body, thinking);
    details.append(summaryEl, body);
    aiSummaryOutputEl.appendChild(details);
  }
}

async function generateAiSummary() {
  if (!state.userValid) {
    resetAiSummaryPanel();
    return;
  }
  if (!summaryDate) {
    setSummaryDate(new Date());
  }
  const dayWindow = getSummaryDayWindow(summaryDate || new Date());
  setAiSummaryLoading(true);
  if (aiSummaryMetaEl) {
    aiSummaryMetaEl.textContent = "Generating with OpenAI...";
  }
  if (aiSummaryOutputEl) {
    aiSummaryOutputEl.replaceChildren();
  }
  try {
    const response = await fetch(buildUrl("/api/entries/llm-summary"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        since_utc: dayWindow.sinceIso,
        until_utc: dayWindow.untilIso,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "summary failed");
    }
    if (!data.event_count) {
      if (aiSummaryMetaEl) {
        aiSummaryMetaEl.textContent = "No events found for this date.";
      }
      return;
    }
    if (aiSummaryOutputEl) {
      renderAiSummary(data.summary || "", data.thinking || "");
    }
    if (aiSummaryMetaEl) {
      const provider = data.provider || "openai";
      const contextLabel = Number.isInteger(data.context_event_count)
        ? ` · ${data.context_event_count} events incl. 7-day context`
        : "";
      aiSummaryMetaEl.textContent = `${data.event_count} selected-day events${contextLabel} · ${data.model || provider}`;
    }
  } catch (err) {
    if (aiSummaryMetaEl) {
      aiSummaryMetaEl.textContent = `Failed: ${err.message || "unknown error"}`;
    }
  } finally {
    setAiSummaryLoading(false);
  }
}

async function sendAiChatQuestion(questionOverride, presetWindowOverride) {
  if (!state.userValid) {
    resetAiChatPanel();
    return;
  }
  if (!summaryDate) {
    setSummaryDate(new Date());
  }
  const question = String(
    questionOverride || (aiChatInputEl ? aiChatInputEl.value : ""),
  ).trim();
  if (!question) {
    if (aiChatMetaEl) {
      aiChatMetaEl.textContent = "Type a question first.";
    }
    return;
  }
  const presetWindow = String(presetWindowOverride || "").trim();
  const dayWindow = getSummaryDayWindow(summaryDate || new Date());
  const body = presetWindow
    ? { question, preset_window: presetWindow }
    : {
        question,
        since_utc: dayWindow.sinceIso,
        until_utc: dayWindow.untilIso,
      };
  setAiChatLoading(true);
  if (aiChatMetaEl) {
    aiChatMetaEl.textContent = "Asking OpenAI with tracker data...";
  }
  if (aiChatOutputEl) {
    aiChatOutputEl.replaceChildren();
  }
  try {
    const response = await fetch(buildUrl("/api/entries/llm-chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "chat failed");
    }
    if (aiChatOutputEl) {
      renderMarkdownInto(aiChatOutputEl, data.answer || "");
    }
    if (aiChatMetaEl) {
      const windowLabel = data.window && data.window.label ? data.window.label : "selected window";
      const provider = data.provider || "openai";
      aiChatMetaEl.textContent = `${data.event_count || 0} events from ${windowLabel} · ${data.model || provider}`;
    }
  } catch (err) {
    if (aiChatMetaEl) {
      aiChatMetaEl.textContent = `Failed: ${err.message || "unknown error"}`;
    }
  } finally {
    setAiChatLoading(false);
  }
}

function getSummaryGanttWindow(date) {
  const dayWindow = getSummaryDayWindow(date);
  const lookbackSince = new Date(dayWindow.since);
  lookbackSince.setHours(lookbackSince.getHours() - SUMMARY_GANTT_LOOKBACK_HOURS);
  return {
    ...dayWindow,
    lookbackSince,
    lookbackSinceIso: lookbackSince.toISOString(),
  };
}

function isMilkExpressType(value) {
  return normalizeEntryType(value) === MILK_EXPRESS_TYPE;
}

function isFeedType(value) {
  return normalizeEntryType(value) === "feed";
}

function isSleepType(value) {
  return normalizeEntryType(value) === "sleep";
}

function getMilkExpressAmounts(entry) {
  const expressed = Number.parseFloat(entry.expressed_ml);
  const minutes = Number.parseFloat(entry.feed_duration_min);
  const hasExpressed = Number.isFinite(expressed);
  const hasMinutes = Number.isFinite(minutes);
  if (hasExpressed || hasMinutes) {
    return {
      ml: hasExpressed ? expressed : 0,
      minutes: hasMinutes ? minutes : 0,
    };
  }
  return parseMilkExpressNotes(entry.notes);
}

function formatMilkExpressDetails(entry) {
  const { ml, minutes } = getMilkExpressAmounts(entry);
  const parts = [];
  if (Number.isFinite(ml) && ml > 0) {
    parts.push(formatMl(ml));
  }
  if (Number.isFinite(minutes) && minutes > 0) {
    parts.push(formatDurationMinutes(minutes));
  }
  return parts.join(" • ");
}

function renderLatestEntry(entry) {
  if (
    !latestBodyEl
    || !latestEmptyEl
    || !latestTypeEl
    || !latestTimeEl
    || !latestRelativeEl
    || !latestDetailsEl
  ) {
    return;
  }
  if (!entry) {
    latestBodyEl.hidden = true;
    latestEmptyEl.hidden = false;
    latestRelativeEl.textContent = "--";
    if (latestEditBtn) {
      latestEditBtn.disabled = true;
    }
    if (latestDeleteBtn) {
      latestDeleteBtn.disabled = true;
    }
    return;
  }
  latestBodyEl.hidden = false;
  latestEmptyEl.hidden = true;
  latestTypeEl.textContent = formatEntryTypeLabel(entry.type);
  latestTimeEl.textContent = formatTimestamp(entry.timestamp_utc);
  latestRelativeEl.textContent = formatRelativeTime(entry.timestamp_utc);
  latestTypeEl.classList.remove("skeleton-text", "skeleton-mid");
  latestTimeEl.classList.remove("skeleton-text", "skeleton-wide");

  latestDetailsEl.innerHTML = "";
  const details = [];
  if (entry.type === "feed") {
    if (entry.amount_ml !== null && entry.amount_ml !== undefined) {
      details.push({ label: "Amount", value: formatMl(entry.amount_ml) });
    }
    if (entry.expressed_ml !== null && entry.expressed_ml !== undefined) {
      details.push({ label: "Expressed", value: formatMl(entry.expressed_ml) });
    }
    if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
      details.push({ label: "Formula", value: formatMl(entry.formula_ml) });
    }
    if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
      details.push({
        label: "Duration",
        value: formatDurationMinutes(entry.feed_duration_min),
      });
    }
  } else if (isMilkExpressType(entry.type)) {
    const { ml, minutes } = getMilkExpressAmounts(entry);
    if (Number.isFinite(ml) && ml > 0) {
      details.push({ label: "Expressed", value: formatMl(ml) });
    }
    if (Number.isFinite(minutes) && minutes > 0) {
      details.push({ label: "Duration", value: formatDurationMinutes(minutes) });
    }
  } else if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
    details.push({
      label: "Duration",
      value: formatDurationMinutes(entry.feed_duration_min),
    });
  }
  details.forEach(({ label, value }) => {
    const chip = document.createElement("span");
    chip.className = "latest-chip";
    chip.textContent = `${label} ${value}`;
    latestDetailsEl.appendChild(chip);
  });

  if (latestNotesEl) {
    if (entry.notes) {
      latestNotesEl.textContent = entry.notes;
      latestNotesEl.hidden = false;
    } else {
      latestNotesEl.hidden = true;
    }
  }
  if (latestEditBtn) {
    latestEditBtn.disabled = false;
    latestEditBtn.onclick = () => editEntry(entry);
  }
  if (latestDeleteBtn) {
    latestDeleteBtn.disabled = false;
    latestDeleteBtn.onclick = () => deleteEntry(entry);
  }
}

function getNextSleepSplitBoundaryMs(currentMs) {
  const current = new Date(currentMs);
  const midnight = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + 1,
    0,
    0,
    0,
    0,
  ).getTime();
  const morning = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    7,
    0,
    0,
    0,
  ).getTime();
  const evening = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
    19,
    0,
    0,
    0,
  ).getTime();
  return [morning, evening, midnight].find((boundaryMs) => boundaryMs > currentMs) || midnight;
}

function isDaySleepMs(valueMs) {
  const date = new Date(valueMs);
  const hour = date.getHours();
  return hour >= 7 && hour < 19;
}

function getSplitSleepMinutesForDay(entries, date) {
  const dayWindow = getSummaryDayWindow(date || new Date());
  const dayStartMs = dayWindow.since.getTime();
  const dayEndMs = dayWindow.until.getTime();
  return (entries || []).reduce((totals, entry) => {
    if (!entry || !isSleepType(entry.type) || entry.deleted_at_utc) {
      return totals;
    }
    const startMs = Date.parse(entry.timestamp_utc || "");
    const durationMin = Number.parseFloat(entry.feed_duration_min);
    if (!Number.isFinite(startMs) || !Number.isFinite(durationMin) || durationMin <= 0) {
      return totals;
    }
    const endMs = startMs + durationMin * 60000;
    let segmentStartMs = Math.max(dayStartMs, startMs);
    const clippedEndMs = Math.min(dayEndMs, endMs);
    if (clippedEndMs <= segmentStartMs) {
      return totals;
    }
    while (segmentStartMs < clippedEndMs) {
      const nextBoundaryMs = Math.min(
        clippedEndMs,
        getNextSleepSplitBoundaryMs(segmentStartMs),
      );
      const segmentMinutes = (nextBoundaryMs - segmentStartMs) / 60000;
      if (isDaySleepMs(segmentStartMs)) {
        totals.dayMinutes += segmentMinutes;
      } else {
        totals.nightMinutes += segmentMinutes;
      }
      segmentStartMs = nextBoundaryMs;
    }
    return totals;
  }, {
    dayMinutes: 0,
    nightMinutes: 0,
  });
}

function getMedian(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2) {
    return sorted[midpoint];
  }
  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function formatNapEstimateTime(valueMs) {
  return new Date(valueMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildNextNapEstimate(entries, now = new Date()) {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) {
    return {
      time: "Estimate unavailable",
      detail: "Could not read the current time",
    };
  }
  const sleepEntries = (entries || [])
    .filter((entry) => entry && isSleepType(entry.type) && !entry.deleted_at_utc)
    .map((entry) => {
      const startMs = Date.parse(entry.timestamp_utc || "");
      const durationMin = Number.parseFloat(entry.feed_duration_min);
      return {
        startMs,
        durationMin,
        endMs: Number.isFinite(startMs) && Number.isFinite(durationMin)
          ? startMs + durationMin * 60000
          : null,
      };
    })
    .filter((entry) => Number.isFinite(entry.startMs) && entry.startMs <= nowMs)
    .sort((left, right) => left.startMs - right.startMs);
  const completed = sleepEntries.filter((entry) => (
    Number.isFinite(entry.durationMin)
    && entry.durationMin > 0
    && Number.isFinite(entry.endMs)
    && entry.endMs <= nowMs
  ));
  const latestCompleted = completed[completed.length - 1] || null;
  const latestActive = [...sleepEntries]
    .reverse()
    .find((entry) => !Number.isFinite(entry.durationMin));
  if (latestActive && (!latestCompleted || latestActive.startMs > latestCompleted.startMs)) {
    return {
      time: "Asleep now",
      detail: "Next estimate appears after wake-up",
    };
  }
  if (!latestCompleted || nowMs - latestCompleted.endMs > 12 * 60 * 60000) {
    return {
      time: "Learning pattern",
      detail: "Log a recent wake-up to anchor the estimate",
    };
  }

  const lookbackStartMs = nowMs - NAP_ESTIMATE_LOOKBACK_DAYS * 24 * 60 * 60000;
  const wakeWindows = [];
  completed.forEach((session, index) => {
    if (session.startMs < lookbackStartMs || index === 0) {
      return;
    }
    const napStart = new Date(session.startMs);
    const napStartHour = napStart.getHours();
    if (napStartHour < 6 || napStartHour >= 19) {
      return;
    }
    const previousSession = completed[index - 1];
    const wakeMinutes = (session.startMs - previousSession.endMs) / 60000;
    if (wakeMinutes >= NAP_WAKE_MIN_MINUTES && wakeMinutes <= NAP_WAKE_MAX_MINUTES) {
      wakeWindows.push(wakeMinutes);
    }
  });
  if (wakeWindows.length < NAP_ESTIMATE_MIN_SAMPLES) {
    return {
      time: "Learning pattern",
      detail: `Need ${NAP_ESTIMATE_MIN_SAMPLES} recent daytime wake windows`,
    };
  }

  const typicalWakeMinutes = getMedian(wakeWindows);
  const estimateMs = latestCompleted.endMs + typicalWakeMinutes * 60000;
  const estimateHour = new Date(estimateMs).getHours();
  const currentHour = now.getHours();
  if (currentHour < 5 || currentHour >= 20 || estimateHour < 5 || estimateHour >= 20) {
    return {
      time: "Daytime only",
      detail: `Typical wake window ${formatDurationMinutes(typicalWakeMinutes)}`,
    };
  }
  const minutesUntil = Math.round((estimateMs - nowMs) / 60000);
  const timingText = minutesUntil <= 0
    ? "likely due now"
    : `in ${formatDurationMinutes(minutesUntil)}`;
  const sampleLabel = `${wakeWindows.length} recent nap${wakeWindows.length === 1 ? "" : "s"}`;
  return {
    time: `~${formatNapEstimateTime(estimateMs)}`,
    detail: `${timingText} · ${formatDurationMinutes(typicalWakeMinutes)} median from ${sampleLabel}`,
  };
}

function renderNextNapEstimate(entries) {
  if (!homeNextNapTimeEl || !homeNextNapDetailEl) {
    return;
  }
  const estimate = buildNextNapEstimate(entries);
  homeNextNapTimeEl.textContent = estimate.time;
  homeNextNapDetailEl.textContent = estimate.detail;
  homeNextNapTimeEl.classList.remove("skeleton-text", "skeleton-mid");
  homeNextNapDetailEl.classList.remove("skeleton-text", "skeleton-wide");
}

function renderSummaryStats(entries) {
  if (!summaryTotalIntakeEl && !summarySleepDurationEl && !summarySleepDayNightEl) {
    return;
  }
  let feedCount = 0;
  let durationTotal = 0;
  let amountTotal = 0;
  let expressedTotal = 0;
  let formulaTotal = 0;
  let sleepCount = 0;
  let sleepDurationTotal = 0;
  entries.forEach((entry) => {
    if (isFeedType(entry.type)) {
      if (isBreastfeedInProgress(entry)) {
        return;
      }
      feedCount += 1;
      const duration = Number.parseFloat(entry.feed_duration_min);
      if (Number.isFinite(duration)) {
        durationTotal += duration;
      }
      const amount = Number.parseFloat(entry.amount_ml);
      if (Number.isFinite(amount)) {
        amountTotal += amount;
      }
      const expressed = Number.parseFloat(entry.expressed_ml);
      if (Number.isFinite(expressed)) {
        expressedTotal += expressed;
      }
      const formula = Number.parseFloat(entry.formula_ml);
      if (Number.isFinite(formula)) {
        formulaTotal += formula;
      }
    }
    if (isSleepType(entry.type)) {
      const sleepDuration = Number.parseFloat(entry.feed_duration_min);
      if (Number.isFinite(sleepDuration) && sleepDuration > 0) {
        sleepCount += 1;
        sleepDurationTotal += sleepDuration;
      }
    }
  });
  const totalIntake = amountTotal + expressedTotal + formulaTotal;
  if (summaryFeedDurationEl) {
    summaryFeedDurationEl.textContent = formatDurationMinutes(durationTotal);
  }
  if (summaryExpressedEl) {
    summaryExpressedEl.textContent = formatMl(expressedTotal);
  }
  if (summaryFormulaEl) {
    summaryFormulaEl.textContent = formatMl(formulaTotal);
  }
  if (summaryTotalIntakeEl) {
    summaryTotalIntakeEl.textContent = formatMl(totalIntake);
  }
  if (summarySleepDurationEl) {
    const summarySleepSplit = pageType === "summary"
      ? getSplitSleepMinutesForDay(summaryGanttEntries.length ? summaryGanttEntries : entries, summaryDate)
      : null;
    const displayedSleepDuration = summarySleepSplit
      ? summarySleepSplit.dayMinutes + summarySleepSplit.nightMinutes
      : sleepDurationTotal;
    summarySleepDurationEl.textContent = formatDurationMinutes(displayedSleepDuration);
    if (summarySleepDayNightEl) {
      if (summarySleepSplit) {
        summarySleepDayNightEl.textContent = `Day ${formatDurationMinutes(summarySleepSplit.dayMinutes)} · Night ${formatDurationMinutes(summarySleepSplit.nightMinutes)}`;
      } else {
        summarySleepDayNightEl.textContent = "Day -- · Night --";
      }
    }
  }
  if (summaryFeedDurationAvgEl) {
    summaryFeedDurationAvgEl.textContent = `Avg / feed: ${formatAverageDuration(
      durationTotal,
      feedCount,
    )}`;
  }
  if (summaryExpressedAvgEl) {
    summaryExpressedAvgEl.textContent = `Avg / feed: ${formatAverageMl(
      expressedTotal,
      feedCount,
    )}`;
  }
  if (summaryFormulaAvgEl) {
    summaryFormulaAvgEl.textContent = `Avg / feed: ${formatAverageMl(
      formulaTotal,
      feedCount,
    )}`;
  }
  if (summaryTotalIntakeAvgEl) {
    summaryTotalIntakeAvgEl.textContent = `Avg / feed: ${formatAverageMl(
      totalIntake,
      feedCount,
    )}`;
  }
  if (summarySleepDurationAvgEl) {
    summarySleepDurationAvgEl.textContent = `Avg / sleep: ${formatAverageDuration(
      sleepDurationTotal,
      sleepCount,
    )}`;
  }
}

function renderMilkExpressSummary(entries) {
  if (!milkExpressCountEl || !milkExpressListEl || !milkExpressEmptyEl) {
    return;
  }
  const matches = entries.filter((entry) => {
    return isMilkExpressType(entry.type);
  });
  milkExpressListEl.innerHTML = "";
  let totalMl = 0;
  let totalMinutes = 0;
  matches.forEach((entry) => {
    const { ml, minutes } = getMilkExpressAmounts(entry);
    totalMl += ml;
    totalMinutes += minutes;
  });
  if (milkExpressTotalsEl) {
    milkExpressTotalsEl.textContent = `${formatMl(totalMl)} • ${formatDurationMinutes(totalMinutes)}`;
  }
  renderMilkExpressSparkline(matches);
  if (!matches.length) {
    milkExpressCountEl.textContent = "0 events";
    milkExpressEmptyEl.style.display = "block";
    return;
  }
  milkExpressEmptyEl.style.display = "none";
  milkExpressCountEl.textContent = `${matches.length} ${matches.length === 1 ? "event" : "events"}`;
  const sorted = [...matches].sort((a, b) => {
    return new Date(a.timestamp_utc) - new Date(b.timestamp_utc);
  });
  sorted.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "milk-item";

    const time = document.createElement("div");
    time.className = "milk-time";
    time.textContent = formatSummaryTime(entry.timestamp_utc);
    item.appendChild(time);

    const detailsText = formatMilkExpressDetails(entry);
    if (detailsText) {
      const details = document.createElement("div");
      details.className = "milk-meta";
      details.textContent = detailsText;
      item.appendChild(details);
    }

    if (entry.notes) {
      const notes = document.createElement("div");
      notes.className = "milk-notes";
      notes.textContent = entry.notes;
      item.appendChild(notes);
    }
    milkExpressListEl.appendChild(item);
  });
}

function renderMilkExpressSparkline(dayMatches) {
  if (!milkExpressSparklineWrapEl || !milkExpressSparklineEl) {
    return;
  }
  const useAll = milkExpressSparklineMode === "all";
  const sourceEntries = useAll ? milkExpressAllEntries : dayMatches;
  if (!sourceEntries.length) {
    milkExpressSparklineWrapEl.style.display = "none";
    return;
  }
  milkExpressSparklineWrapEl.style.display = "block";
  milkExpressSparklineEl.innerHTML = "";

  if (milkExpressSparklineRangeEl) {
    milkExpressSparklineRangeEl.textContent = formatMilkExpressSparklineRange(
      sourceEntries,
      useAll,
    );
  }
  if (milkExpressSparklineTotalEl) {
    milkExpressSparklineTotalEl.textContent = formatMl(
      sumMilkExpressMl(sourceEntries),
    );
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 320;
  const height = 64;
  const padding = 6;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const track = document.createElementNS(svgNS, "line");
  track.setAttribute("x1", padding);
  track.setAttribute("x2", width - padding);
  track.setAttribute("y1", height - padding);
  track.setAttribute("y2", height - padding);
  track.setAttribute("class", "milk-sparkline-track");
  milkExpressSparklineEl.appendChild(track);

  const points = useAll
    ? buildAllTimeSparklinePoints(sourceEntries, {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
    })
    : buildTodaySparklinePoints(sourceEntries, {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
    });

  if (!points.length) {
    return;
  }
  const path = document.createElementNS(svgNS, "path");
  const d = points
    .map((point, index) => {
      const cmd = index === 0 ? "M" : "L";
      return `${cmd}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
  path.setAttribute("d", d);
  path.setAttribute("class", "milk-sparkline-path");
  milkExpressSparklineEl.appendChild(path);

  const lastPoint = points[points.length - 1];
  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", lastPoint.x.toFixed(1));
  dot.setAttribute("cy", lastPoint.y.toFixed(1));
  dot.setAttribute("r", "3.2");
  dot.setAttribute("class", "milk-sparkline-dot");
  milkExpressSparklineEl.appendChild(dot);
}

function renderSleepTrendChartInto(
  entries,
  {
    chartEl,
    labelsEl,
    averageChipEl,
    baseDate,
    showGoalBand = false,
    showSplitSeries = false,
  },
) {
  if (!chartEl || !labelsEl || !averageChipEl) {
    return;
  }
  chartEl.innerHTML = "";
  labelsEl.innerHTML = "";
  averageChipEl.textContent = "";

  const today = baseDate ? new Date(baseDate) : new Date();
  const daysShown = 8;
  const averageWindowDays = 7;
  const dailyTotals = [];

  for (let i = daysShown - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const split = getSplitSleepMinutesForDay(entries, date);
    dailyTotals.push({
      date,
      dayMinutes: split.dayMinutes,
      nightMinutes: split.nightMinutes,
      totalMinutes: split.dayMinutes + split.nightMinutes,
    });
  }

  const averageWindowTotals = dailyTotals.slice(0, averageWindowDays);
  const goalMinMinutes = 12 * 60;
  const goalMaxMinutes = 15 * 60;
  const maxMinutes = Math.max(
    ...dailyTotals.map((day) => day.totalMinutes),
    showGoalBand ? goalMaxMinutes : 0,
    1,
  );
  const averageMinutes = averageWindowTotals.reduce((sum, day) => sum + day.totalMinutes, 0)
    / averageWindowDays;
  const svgNS = "http://www.w3.org/2000/svg";
  const width = 320;
  const height = showSplitSeries ? 112 : 80;
  const paddingX = 8;
  const paddingY = 8;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const getY = (minutes) => {
    return height - paddingY - (minutes / maxMinutes) * plotHeight;
  };

  if (showGoalBand) {
    const goalTopY = getY(goalMaxMinutes);
    const goalBottomY = getY(goalMinMinutes);
    const goalBand = document.createElementNS(svgNS, "rect");
    goalBand.setAttribute("x", paddingX);
    goalBand.setAttribute("y", goalTopY.toFixed(1));
    goalBand.setAttribute("width", plotWidth.toFixed(1));
    goalBand.setAttribute("height", Math.max(1, goalBottomY - goalTopY).toFixed(1));
    goalBand.setAttribute("class", "sleep-trend-goal-band");
    chartEl.appendChild(goalBand);
  }

  const gridLine = document.createElementNS(svgNS, "line");
  gridLine.setAttribute("x1", paddingX);
  gridLine.setAttribute("x2", width - paddingX);
  gridLine.setAttribute("y1", height - paddingY);
  gridLine.setAttribute("y2", height - paddingY);
  gridLine.setAttribute("class", "sleep-trend-grid");
  chartEl.appendChild(gridLine);

  if (averageMinutes > 0) {
    averageChipEl.textContent = `Avg last 7 complete days: ${formatDurationMinutes(averageMinutes)}`;
    const averageY = getY(averageMinutes);
    const averageLine = document.createElementNS(svgNS, "line");
    averageLine.setAttribute("x1", paddingX);
    averageLine.setAttribute("x2", width - paddingX);
    averageLine.setAttribute("y1", averageY.toFixed(1));
    averageLine.setAttribute("y2", averageY.toFixed(1));
    averageLine.setAttribute("class", "sleep-trend-average-line");
    chartEl.appendChild(averageLine);
  } else {
    averageChipEl.textContent = "Avg last 7 complete days: --";
  }

  const buildPoints = (field) => dailyTotals.map((day, index) => {
    const x = paddingX + (index / (daysShown - 1)) * plotWidth;
    const y = getY(day[field]);
    return { x, y };
  });
  const totalPoints = buildPoints("totalMinutes");

  const appendTrendPath = (points, className) => {
    if (points.length <= 1) {
      return;
    }
    const path = document.createElementNS(svgNS, "path");
    const d = points
      .map((point, index) => {
        const cmd = index === 0 ? "M" : "L";
        return `${cmd}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      })
      .join(" ");
    path.setAttribute("d", d);
    path.setAttribute("class", className);
    chartEl.appendChild(path);
  };

  if (showSplitSeries) {
    appendTrendPath(buildPoints("dayMinutes"), "sleep-trend-line-day");
    appendTrendPath(buildPoints("nightMinutes"), "sleep-trend-line-night");
  }
  appendTrendPath(totalPoints, "sleep-trend-line");

  totalPoints.forEach((point, index) => {
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", point.x.toFixed(1));
    dot.setAttribute("cy", point.y.toFixed(1));
    dot.setAttribute("r", "3");
    dot.setAttribute("class", "sleep-trend-dot");
    chartEl.appendChild(dot);

    const label = dailyTotals[index].date.toLocaleDateString(undefined, { weekday: "short" });
    appendChartAxisLabel(labelsEl, label, point.x, width);
  });
}

function appendChartAxisLabel(labelsEl, label, x, chartWidth) {
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.left = `${(x / chartWidth) * 100}%`;
  labelsEl.appendChild(labelEl);
}

function renderSleepTrendChart(entries) {
  renderSleepTrendChartInto(entries, {
    chartEl: sleepTrendChartEl,
    labelsEl: sleepTrendLabelsEl,
    averageChipEl: sleepTrendAverageChipEl,
    baseDate: summaryDate || new Date(),
    showGoalBand: true,
    showSplitSeries: true,
  });
}

function interpolateBoyWeightLms(ageMonths) {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) {
    return null;
  }
  const last = WHO_BOY_WEIGHT_LMS_BY_MONTH[WHO_BOY_WEIGHT_LMS_BY_MONTH.length - 1];
  if (ageMonths > last.month) {
    return null;
  }
  const lowerIndex = Math.floor(ageMonths);
  const upperIndex = Math.min(lowerIndex + 1, last.month);
  const lower = WHO_BOY_WEIGHT_LMS_BY_MONTH[lowerIndex];
  const upper = WHO_BOY_WEIGHT_LMS_BY_MONTH[upperIndex];
  if (!lower || !upper) {
    return null;
  }
  const ratio = upper.month === lower.month ? 0 : (ageMonths - lower.month);
  return {
    l: lower.l + ((upper.l - lower.l) * ratio),
    m: lower.m + ((upper.m - lower.m) * ratio),
    s: lower.s + ((upper.s - lower.s) * ratio),
  };
}

function weightForBoyZ(ageMonths, zScore) {
  const lms = interpolateBoyWeightLms(ageMonths);
  if (!lms) {
    return null;
  }
  if (Math.abs(lms.l) < 0.000001) {
    return lms.m * Math.exp(lms.s * zScore);
  }
  const base = 1 + (lms.l * lms.s * zScore);
  if (base <= 0) {
    return null;
  }
  return lms.m * (base ** (1 / lms.l));
}

function erfApprox(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + (p * x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t
    * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(value) {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

function formatOrdinal(value) {
  const rounded = Math.round(value);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rounded}th`;
  }
  const mod10 = rounded % 10;
  if (mod10 === 1) {
    return `${rounded}st`;
  }
  if (mod10 === 2) {
    return `${rounded}nd`;
  }
  if (mod10 === 3) {
    return `${rounded}rd`;
  }
  return `${rounded}th`;
}

function boyWeightPercentile(ageMonths, weightKg) {
  const lms = interpolateBoyWeightLms(ageMonths);
  if (!lms || !Number.isFinite(weightKg) || weightKg <= 0) {
    return null;
  }
  const zScore = Math.abs(lms.l) < 0.000001
    ? Math.log(weightKg / lms.m) / lms.s
    : (((weightKg / lms.m) ** lms.l) - 1) / (lms.l * lms.s);
  return normalCdf(zScore) * 100;
}

function getWeightLogPoints(entries) {
  return getWeightLogPointsForDob(entries, state.babyDob || "");
}

function formatCompletedWeeks(ageWeeks) {
  if (!Number.isFinite(ageWeeks)) {
    return "--";
  }
  return String(Math.max(0, Math.floor(ageWeeks)));
}

function getWeightLogPointsForDob(entries, dobValue) {
  const dob = parseDob(dobValue || "");
  if (!dob) {
    return [];
  }
  return entries
    .filter((entry) => (
      entry
      && entry.type === "weight"
    ))
    .map((entry) => {
      const loggedAt = new Date(entry.timestamp_utc);
      const weightKg = Number.parseFloat(entry.weight_kg);
      if (Number.isNaN(loggedAt.getTime()) || !Number.isFinite(weightKg) || weightKg <= 0) {
        return null;
      }
      const ageDays = (loggedAt.getTime() - dob.getTime()) / (24 * 60 * 60 * 1000);
      const ageWeeks = ageDays / 7;
      const ageMonths = ageDays / 30.4375;
      const percentile = boyWeightPercentile(ageMonths, weightKg);
      if (ageWeeks < 0 || percentile === null) {
        return null;
      }
      return {
        entryId: entry.id,
        timestamp: loggedAt,
        ageWeeks,
        ageMonths,
        weightKg,
        percentile,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.ageWeeks - right.ageWeeks);
}

window.BabyTrackerWeightPercentiles = {
  formatOrdinal,
  getWeightLogPointsForDob,
};

function renderWeightPercentileChart(entries = summaryWeightEntries) {
  if (
    !weightPercentileChartEl
    || !weightPercentileLabelsEl
    || !weightPercentileLatestEl
    || !weightPercentileRangeEl
    || !weightPercentileEmptyEl
  ) {
    return;
  }
  weightPercentileChartEl.innerHTML = "";
  weightPercentileLabelsEl.innerHTML = "";
  weightPercentileLatestEl.textContent = "--";
  weightPercentileRangeEl.textContent = "Logged weights by age";

  const points = getWeightLogPoints(entries);
  const hasDob = Boolean(parseDob(state.babyDob || ""));
  const hasAnyWeight = entries.some((entry) => entry && entry.type === "weight");
  const shouldShowEmpty = !hasDob || !hasAnyWeight || points.length === 0;
  weightPercentileEmptyEl.style.display = shouldShowEmpty ? "block" : "none";
  weightPercentileChartEl.style.display = shouldShowEmpty ? "none" : "block";
  weightPercentileLabelsEl.style.display = "none";
  if (shouldShowEmpty) {
    weightPercentileRangeEl.textContent = !hasDob
      ? "Add date of birth in Settings"
      : "No usable weight logs yet";
    return;
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 640;
  const height = 430;
  const paddingLeft = 56;
  const paddingRight = 58;
  const paddingTop = 18;
  const paddingBottom = 62;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxLoggedWeeks = Math.max(...points.map((point) => point.ageWeeks), 1);
  const xMaxWeeks = Math.min(104, Math.max(52, Math.ceil(maxLoggedWeeks / 4) * 4));
  const xMaxMonths = xMaxWeeks * 7 / 30.4375;
  const curveSamples = [];
  const sampleCount = Math.max(52, Math.ceil(xMaxWeeks));
  for (let index = 0; index <= sampleCount; index++) {
    const ageWeeks = (index / sampleCount) * xMaxWeeks;
    const ageMonths = (ageWeeks * 7) / 30.4375;
    if (ageMonths <= WHO_BOY_WEIGHT_LMS_BY_MONTH[WHO_BOY_WEIGHT_LMS_BY_MONTH.length - 1].month) {
      curveSamples.push({ ageWeeks, ageMonths });
    }
  }
  const curveWeights = curveSamples.flatMap((sample) => (
    WHO_WEIGHT_PERCENTILE_LINES
      .map((line) => weightForBoyZ(sample.ageMonths, line.z))
      .filter((weight) => weight !== null)
  ));
  const allWeights = points.map((point) => point.weightKg).concat(curveWeights);
  const yMinKg = 0.5;
  const yMaxKg = Math.max(13, Math.ceil((Math.max(...allWeights, 1) + 0.5) * 2) / 2);
  const kgSpan = Math.max(1, yMaxKg - yMinKg);
  const xForWeeks = (ageWeeks) => paddingLeft + (ageWeeks / xMaxWeeks) * plotWidth;
  const yForKg = (weightKg) => paddingTop + ((yMaxKg - weightKg) / kgSpan) * plotHeight;

  const appendSvgText = (text, attributes = {}) => {
    const label = document.createElementNS(svgNS, "text");
    label.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => {
      label.setAttribute(name, value);
    });
    weightPercentileChartEl.appendChild(label);
    return label;
  };

  for (let ageWeeks = 0; ageWeeks <= xMaxWeeks; ageWeeks += 2) {
    const x = xForWeeks(ageWeeks);
    const gridLine = document.createElementNS(svgNS, "line");
    gridLine.setAttribute("x1", x.toFixed(1));
    gridLine.setAttribute("x2", x.toFixed(1));
    gridLine.setAttribute("y1", paddingTop);
    gridLine.setAttribute("y2", paddingTop + plotHeight);
    gridLine.setAttribute("class", ageWeeks % 4 === 0
      ? "weight-percentile-grid is-major"
      : "weight-percentile-grid");
    weightPercentileChartEl.appendChild(gridLine);

    appendSvgText(String(ageWeeks), {
      x: x.toFixed(1),
      y: String(height - 18),
      class: "weight-percentile-axis-label",
      "text-anchor": "middle",
    });
  }

  for (let weightKg = yMinKg; weightKg <= yMaxKg + 0.001; weightKg += 0.5) {
    const y = yForKg(weightKg);
    const gridLine = document.createElementNS(svgNS, "line");
    gridLine.setAttribute("x1", paddingLeft);
    gridLine.setAttribute("x2", width - paddingRight);
    gridLine.setAttribute("y1", y.toFixed(1));
    gridLine.setAttribute("y2", y.toFixed(1));
    gridLine.setAttribute("class", Number.isInteger(weightKg)
      ? "weight-percentile-grid is-major"
      : "weight-percentile-grid");
    weightPercentileChartEl.appendChild(gridLine);

    const kgLabel = Number.isInteger(weightKg) ? String(weightKg) : weightKg.toFixed(1);
    appendSvgText(weightKg === yMinKg ? `${kgLabel}kg` : kgLabel, {
      x: String(paddingLeft - 8),
      y: (y + 4).toFixed(1),
      class: "weight-percentile-axis-label",
      "text-anchor": "end",
    });
  }

  const axisLine = document.createElementNS(svgNS, "rect");
  axisLine.setAttribute("x", paddingLeft);
  axisLine.setAttribute("y", paddingTop);
  axisLine.setAttribute("width", plotWidth);
  axisLine.setAttribute("height", plotHeight);
  axisLine.setAttribute("class", "weight-percentile-plot-border");
  weightPercentileChartEl.appendChild(axisLine);

  WHO_WEIGHT_PERCENTILE_LINES.forEach((line) => {
    const pathPoints = curveSamples
      .map((sample) => {
        const weightKg = weightForBoyZ(sample.ageMonths, line.z);
        if (weightKg === null) {
          return null;
        }
        return {
          x: xForWeeks(sample.ageWeeks),
          y: yForKg(weightKg),
        };
      })
      .filter(Boolean);
    if (pathPoints.length < 2) {
      return;
    }
    const path = document.createElementNS(svgNS, "path");
    const d = pathPoints
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
    path.setAttribute("d", d);
    path.setAttribute("class", line.label === "50th"
      ? "weight-percentile-line is-median"
      : `weight-percentile-line is-${line.style}`);
    weightPercentileChartEl.appendChild(path);

    const lastPoint = pathPoints[pathPoints.length - 1];
    appendSvgText(line.label, {
      x: (lastPoint.x + 5).toFixed(1),
      y: (lastPoint.y + 3).toFixed(1),
      class: "weight-percentile-centile-label",
    });
  });

  if (points.length > 1) {
    const path = document.createElementNS(svgNS, "path");
    const d = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${xForWeeks(point.ageWeeks).toFixed(1)} ${yForKg(point.weightKg).toFixed(1)}`)
      .join(" ");
    path.setAttribute("d", d);
    path.setAttribute("class", "weight-percentile-log-line");
    weightPercentileChartEl.appendChild(path);
  }

  points.forEach((point) => {
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", xForWeeks(point.ageWeeks).toFixed(1));
    dot.setAttribute("cy", yForKg(point.weightKg).toFixed(1));
    dot.setAttribute("r", "3.6");
    dot.setAttribute("class", "weight-percentile-dot");
    weightPercentileChartEl.appendChild(dot);
  });

  for (let month = 1; month <= Math.floor(xMaxMonths); month++) {
    const ageWeeks = (month * 30.4375) / 7;
    if (ageWeeks > xMaxWeeks) {
      break;
    }
    const x = xForWeeks(ageWeeks);
    const marker = document.createElementNS(svgNS, "line");
    marker.setAttribute("x1", x.toFixed(1));
    marker.setAttribute("x2", x.toFixed(1));
    marker.setAttribute("y1", String(height - 28));
    marker.setAttribute("y2", String(height - 8));
    marker.setAttribute("class", "weight-percentile-month-marker");
    weightPercentileChartEl.appendChild(marker);

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x.toFixed(1));
    circle.setAttribute("cy", String(height - 38));
    circle.setAttribute("r", "10");
    circle.setAttribute("class", "weight-percentile-month-circle");
    weightPercentileChartEl.appendChild(circle);

    appendSvgText(String(month), {
      x: x.toFixed(1),
      y: String(height - 34),
      class: "weight-percentile-month-label",
      "text-anchor": "middle",
    });
  }

  appendSvgText("Age in weeks / months", {
    x: String(paddingLeft + (plotWidth / 2)),
    y: String(height - 50),
    class: "weight-percentile-axis-title",
    "text-anchor": "middle",
  });

  const latest = points[points.length - 1];
  weightPercentileLatestEl.textContent = `${latest.weightKg.toFixed(2)} kg at ${formatCompletedWeeks(latest.ageWeeks)}w, ${formatOrdinal(latest.percentile)}`;
  weightPercentileRangeEl.textContent = `${points.length} weight ${points.length === 1 ? "log" : "logs"} · WHO boys 0-${Math.round(xMaxMonths)} months`;
}

function renderSummaryWeightCard(entries = summaryWeightEntries) {
  if (!summaryCurrentWeightEl || !summaryWeightPercentileEl) {
    return;
  }
  const points = getWeightLogPoints(entries);
  const hasDob = Boolean(parseDob(state.babyDob || ""));
  const hasAnyWeight = entries.some((entry) => entry && entry.type === "weight");
  if (!hasAnyWeight) {
    summaryCurrentWeightEl.textContent = "--";
    summaryWeightPercentileEl.textContent = "No weight logged";
    return;
  }
  if (!hasDob) {
    const latestEntry = entries
      .filter((entry) => entry && entry.type === "weight")
      .sort((left, right) => Date.parse(right.timestamp_utc || "") - Date.parse(left.timestamp_utc || ""))[0];
    const weightKg = latestEntry ? Number.parseFloat(latestEntry.weight_kg) : Number.NaN;
    summaryCurrentWeightEl.textContent = Number.isFinite(weightKg)
      ? `${weightKg.toFixed(2)} kg`
      : "--";
    summaryWeightPercentileEl.textContent = "Set DOB for percentile";
    return;
  }
  if (!points.length) {
    summaryCurrentWeightEl.textContent = "--";
    summaryWeightPercentileEl.textContent = "No usable weight logs";
    return;
  }
  const latest = points[points.length - 1];
  summaryCurrentWeightEl.textContent = `${latest.weightKg.toFixed(2)} kg`;
  summaryWeightPercentileEl.textContent = `${formatOrdinal(latest.percentile)} · ${formatCompletedWeeks(latest.ageWeeks)} weeks`;
}

function renderWeightPercentileSurfaces(entries = summaryWeightEntries) {
  renderWeightPercentileChart(entries);
  renderSummaryWeightCard(entries);
}

async function loadWeightPercentileEntries() {
  try {
    const entries = await loadEntriesWithFallback({
      limit: 500,
      type: "weight",
    });
    summaryWeightEntries = entries;
    renderWeightPercentileSurfaces(entries);
  } catch (err) {
    renderWeightPercentileSurfaces(summaryWeightEntries);
  }
}

function renderHomeSleepTrendChart(entries) {
  renderSleepTrendChartInto(entries, {
    chartEl: homeSleepTrendChartEl,
    labelsEl: homeSleepTrendLabelsEl,
    averageChipEl: homeSleepTrendAverageChipEl,
    baseDate: new Date(),
  });
}

function renderHomeFeedVolumeChart(entries) {
  if (!homeFeedVolumeChartEl || !homeFeedVolumeLabelsEl || !homeFeedVolumeAverageChipEl) {
    return;
  }
  homeFeedVolumeChartEl.innerHTML = "";
  homeFeedVolumeLabelsEl.innerHTML = "";
  homeFeedVolumeAverageChipEl.textContent = "";

  const today = new Date();
  const daysShown = 7;
  const dailyTotals = [];

  for (let i = daysShown - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const totalMl = entries.reduce((sum, entry) => {
      if (!isFeedType(entry.type) || isBreastfeedInProgress(entry)) {
        return sum;
      }
      const entryDate = new Date(entry.timestamp_utc);
      if (Number.isNaN(entryDate.getTime()) || entryDate < date || entryDate >= nextDate) {
        return sum;
      }
      return sum + getFeedEntryTotalMl(entry);
    }, 0);

    dailyTotals.push({ date, totalMl });
  }

  const sevenDayTotalMl = dailyTotals.reduce((sum, day) => sum + day.totalMl, 0);
  const averageMl = sevenDayTotalMl / daysShown;
  const maxMl = Math.max(...dailyTotals.map((day) => day.totalMl), averageMl, 1);
  const svgNS = "http://www.w3.org/2000/svg";
  const width = 320;
  const height = 80;
  const paddingX = 8;
  const paddingY = 8;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const barGap = 5;
  const barWidth = (plotWidth - (barGap * (daysShown - 1))) / daysShown;

  const gridLine = document.createElementNS(svgNS, "line");
  gridLine.setAttribute("x1", paddingX);
  gridLine.setAttribute("x2", width - paddingX);
  gridLine.setAttribute("y1", height - paddingY);
  gridLine.setAttribute("y2", height - paddingY);
  gridLine.setAttribute("class", "sleep-trend-grid");
  homeFeedVolumeChartEl.appendChild(gridLine);

  if (averageMl > 0) {
    homeFeedVolumeAverageChipEl.textContent = `7-day total: ${formatMl(sevenDayTotalMl)} · Avg ${formatMl(averageMl)}/day`;
    const averageY = height - paddingY - (averageMl / maxMl) * plotHeight;
    const averageLine = document.createElementNS(svgNS, "line");
    averageLine.setAttribute("x1", paddingX);
    averageLine.setAttribute("x2", width - paddingX);
    averageLine.setAttribute("y1", averageY.toFixed(1));
    averageLine.setAttribute("y2", averageY.toFixed(1));
    averageLine.setAttribute("class", "sleep-trend-average-line");
    homeFeedVolumeChartEl.appendChild(averageLine);
  } else {
    homeFeedVolumeAverageChipEl.textContent = "7-day total: --";
  }

  dailyTotals.forEach((day, index) => {
    const barHeight = (day.totalMl / maxMl) * plotHeight;
    const x = paddingX + index * (barWidth + barGap);
    const y = height - paddingY - barHeight;
    const bar = document.createElementNS(svgNS, "rect");
    bar.setAttribute("x", x.toFixed(1));
    bar.setAttribute("y", y.toFixed(1));
    bar.setAttribute("width", Math.max(1, barWidth).toFixed(1));
    bar.setAttribute("height", Math.max(0, barHeight).toFixed(1));
    bar.setAttribute("rx", "3");
    bar.setAttribute("class", "feed-volume-bar");
    homeFeedVolumeChartEl.appendChild(bar);

    if (day.totalMl > 0) {
      const value = document.createElementNS(svgNS, "text");
      value.setAttribute("x", (x + barWidth / 2).toFixed(1));
      value.setAttribute("y", Math.max(9, y - 3).toFixed(1));
      value.setAttribute("class", "feed-volume-value");
      value.textContent = `${Math.round(day.totalMl)}`;
      homeFeedVolumeChartEl.appendChild(value);
    }

    appendChartAxisLabel(
      homeFeedVolumeLabelsEl,
      day.date.toLocaleDateString(undefined, { weekday: "short" }),
      x + barWidth / 2,
      width,
    );
  });
}

function sumMilkExpressMl(entries) {
  return entries.reduce((total, entry) => {
    const { ml } = getMilkExpressAmounts(entry);
    return total + (Number.isFinite(ml) ? ml : 0);
  }, 0);
}

function formatMilkExpressSparklineRange(entries, isAllTime) {
  if (!isAllTime) {
    const base = summaryDate ? new Date(summaryDate) : new Date();
    return formatSummaryDateLabel(base);
  }
  if (!entries.length) {
    if (insightAnchorLabelEl && anchorEnd) {
      const anchorLabel = formatSummaryDateLabel(anchorEnd);
      const anchorShort = anchorEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      insightAnchorLabelEl.textContent = `${anchorLabel} • ${anchorShort}`;
    }
    return "All time";
  }
  const sorted = [...entries].sort((a, b) => {
    return new Date(a.timestamp_utc) - new Date(b.timestamp_utc);
  });
  const start = new Date(sorted[0].timestamp_utc);
  const end = new Date(sorted[sorted.length - 1].timestamp_utc);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "All time";
  }
  if (isSameDay(start, end)) {
    return formatSummaryDateLabel(start);
  }
  const formatShortDate = (date) => date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function buildTodaySparklinePoints(entries, config) {
  const { width, height, padding, plotWidth, plotHeight } = config;
  const dayBase = summaryDate ? new Date(summaryDate) : new Date();
  const dayStart = new Date(dayBase.getFullYear(), dayBase.getMonth(), dayBase.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const totalMl = sumMilkExpressMl(entries);

  const sorted = [...entries].sort((a, b) => {
    return new Date(a.timestamp_utc) - new Date(b.timestamp_utc);
  });
  let cumulative = 0;
  const points = [{ x: padding, y: height - padding }];
  sorted.forEach((entry) => {
    const { ml } = getMilkExpressAmounts(entry);
    if (!Number.isFinite(ml) || ml <= 0) {
      return;
    }
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    cumulative += ml;
    const ratio = (ts.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime());
    const clamped = Math.min(Math.max(ratio, 0), 1);
    const x = padding + clamped * plotWidth;
    const yRatio = totalMl > 0 ? cumulative / totalMl : 0;
    const y = height - padding - yRatio * plotHeight;
    points.push({ x, y });
  });
  const finalYRatio = totalMl > 0 ? cumulative / totalMl : 0;
  points.push({
    x: width - padding,
    y: height - padding - finalYRatio * plotHeight,
  });
  return points;
}

function buildAllTimeSparklinePoints(entries, config) {
  const { width, height, padding, plotWidth, plotHeight } = config;
  const dailyTotals = new Map();
  entries.forEach((entry) => {
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    const key = formatDateInputValue(ts);
    const { ml } = getMilkExpressAmounts(entry);
    if (!Number.isFinite(ml) || ml <= 0) {
      return;
    }
    dailyTotals.set(key, (dailyTotals.get(key) || 0) + ml);
  });
  const days = [...dailyTotals.entries()]
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => new Date(`${a.key}T00:00:00`) - new Date(`${b.key}T00:00:00`));

  if (!days.length) {
    return [];
  }
  const maxMl = Math.max(...days.map((day) => day.total), 1);
  const start = new Date(`${days[0].key}T00:00:00`);
  const end = new Date(`${days[days.length - 1].key}T00:00:00`);
  const spanMs = Math.max(end.getTime() - start.getTime(), 1);

  return days.map((day) => {
    const dayDate = new Date(`${day.key}T00:00:00`);
    const ratio = (dayDate.getTime() - start.getTime()) / spanMs;
    const x = padding + ratio * plotWidth;
    const y = height - padding - (day.total / maxMl) * plotHeight;
    return { x, y };
  });
}

function formatRelativeTimeFrom(baseDate, value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || !baseDate || Number.isNaN(baseDate.getTime())) {
    return "--";
  }
  const diffMs = baseDate.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"}`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function getInsightAnchor(date) {
  const base = date ? new Date(date) : new Date();
  const window = getSummaryDayWindow(base);
  const now = new Date();
  const anchorEnd = isSameDay(base, now) ? now : window.until;
  return {
    base,
    anchorEnd,
    anchorIso: anchorEnd.toISOString(),
  };
}

function filterEntriesByWindow(entries, sinceMs, untilMs) {
  return entries.filter((entry) => {
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return false;
    }
    const time = ts.getTime();
    if (sinceMs && time < sinceMs) {
      return false;
    }
    if (untilMs && time > untilMs) {
      return false;
    }
    return true;
  });
}

function computeFeedStats(entries) {
  const feedEntries = entries.filter((entry) => entry.type === "feed");
  const sorted = [...feedEntries].sort((a, b) => {
    return new Date(a.timestamp_utc) - new Date(b.timestamp_utc);
  });
  let durationTotal = 0;
  let expressedTotal = 0;
  let formulaTotal = 0;
  sorted.forEach((entry) => {
    const duration = Number.parseFloat(entry.feed_duration_min);
    if (Number.isFinite(duration)) {
      durationTotal += duration;
    }
    const expressed = Number.parseFloat(entry.expressed_ml);
    if (Number.isFinite(expressed)) {
      expressedTotal += expressed;
    }
    const formula = Number.parseFloat(entry.formula_ml);
    if (Number.isFinite(formula)) {
      formulaTotal += formula;
    }
  });
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1].timestamp_utc);
    const next = new Date(sorted[i].timestamp_utc);
    if (Number.isNaN(prev.getTime()) || Number.isNaN(next.getTime())) {
      continue;
    }
    const diffMinutes = (next.getTime() - prev.getTime()) / 60000;
    if (diffMinutes > 0) {
      gaps.push(diffMinutes);
    }
  }
  const avgGap = gaps.length
    ? gaps.reduce((sum, value) => sum + value, 0) / gaps.length
    : null;
  const medianGap = gaps.length
    ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
    : null;
  return {
    count: feedEntries.length,
    durationTotal,
    expressedTotal,
    formulaTotal,
    avgGap,
    medianGap,
    entries: sorted,
  };
}

function computeExpressStats(entries) {
  const expressEntries = entries.filter((entry) => isMilkExpressType(entry.type));
  const sorted = [...expressEntries].sort((a, b) => {
    return new Date(a.timestamp_utc) - new Date(b.timestamp_utc);
  });
  let totalMl = 0;
  let totalMinutes = 0;
  sorted.forEach((entry) => {
    const { ml, minutes } = getMilkExpressAmounts(entry);
    totalMl += Number.isFinite(ml) ? ml : 0;
    totalMinutes += Number.isFinite(minutes) ? minutes : 0;
  });
  return {
    count: expressEntries.length,
    totalMl,
    totalMinutes,
    entries: sorted,
  };
}

function computeDiaperStats(entries) {
  let weeCount = 0;
  let pooCount = 0;
  entries.forEach((entry) => {
    if (entry.type === "wee") {
      weeCount += 1;
    } else if (entry.type === "poo") {
      pooCount += 1;
    }
  });
  return {
    wee: weeCount,
    poo: pooCount,
    total: weeCount + pooCount,
  };
}

function computeSleepStats(entries) {
  let durationTotal = 0;
  let count = 0;
  entries.forEach((entry) => {
    if (!isSleepType(entry.type)) {
      return;
    }
    const duration = Number.parseFloat(entry.feed_duration_min);
    if (Number.isFinite(duration) && duration > 0) {
      durationTotal += duration;
      count += 1;
    }
  });
  return {
    count,
    durationTotal,
  };
}

function computeWindowDaySpan(windowEntries, sinceMs, untilMs) {
  if (Number.isFinite(sinceMs)) {
    return Math.max(1, Math.ceil((untilMs - sinceMs) / 86400000));
  }
  if (!Array.isArray(windowEntries) || !windowEntries.length) {
    return 1;
  }
  let earliestMs = Number.POSITIVE_INFINITY;
  windowEntries.forEach((entry) => {
    const ts = new Date(entry.timestamp_utc);
    const ms = ts.getTime();
    if (!Number.isNaN(ms) && ms < earliestMs) {
      earliestMs = ms;
    }
  });
  if (!Number.isFinite(earliestMs)) {
    return 1;
  }
  return Math.max(1, Math.ceil((untilMs - earliestMs) / 86400000));
}

function renderSummaryInsights(entries, anchorEnd) {
  if (!entries.length) {
    if (insightLastFeedEl) {
      insightLastFeedEl.textContent = "--";
    }
    if (insightLastFeedSubEl) {
      insightLastFeedSubEl.textContent = "No feed logged";
    }
    if (insightLastExpressEl) {
      insightLastExpressEl.textContent = "--";
    }
    if (insightLastExpressSubEl) {
      insightLastExpressSubEl.textContent = "No express logged";
    }
    if (insightFeedInterval24El) {
      insightFeedInterval24El.textContent = "--";
    }
    if (insightFeedInterval24SubEl) {
      insightFeedInterval24SubEl.textContent = "--";
    }
    if (insightFeedInterval7dEl) {
      insightFeedInterval7dEl.textContent = "--";
    }
    if (insightFeedInterval7dSubEl) {
      insightFeedInterval7dSubEl.textContent = "--";
    }
    if (insightExpressTotal24El) {
      insightExpressTotal24El.textContent = "--";
    }
    if (insightExpressTotal24SubEl) {
      insightExpressTotal24SubEl.textContent = "--";
    }
    if (insightExpressTotal7El) {
      insightExpressTotal7El.textContent = "--";
    }
    if (insightExpressTotal7SubEl) {
      insightExpressTotal7SubEl.textContent = "--";
    }
    if (insightDiaper24El) {
      insightDiaper24El.textContent = "--";
    }
    if (insightDiaper24SubEl) {
      insightDiaper24SubEl.textContent = "--";
    }
    if (insightDiaper7El) {
      insightDiaper7El.textContent = "--";
    }
    if (insightDiaper7SubEl) {
      insightDiaper7SubEl.textContent = "--";
    }
    if (insightTimeframeBodyEl) {
      insightTimeframeBodyEl.innerHTML = "";
    }
    return;
  }
  const anchorLabel = formatSummaryDateLabel(anchorEnd);
  const anchorShort = anchorEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (insightAnchorLabelEl) {
    insightAnchorLabelEl.textContent = `${anchorLabel} • ${anchorShort}`;
  }

  const allFeedStats = computeFeedStats(entries);
  const allExpressStats = computeExpressStats(entries);
  const lastFeed = allFeedStats.entries[allFeedStats.entries.length - 1];
  const lastExpress = allExpressStats.entries[allExpressStats.entries.length - 1];

  if (insightLastFeedEl) {
    if (lastFeed) {
      insightLastFeedEl.textContent = formatSummaryTime(lastFeed.timestamp_utc);
    } else {
      insightLastFeedEl.textContent = "--";
    }
  }
  if (insightLastFeedSubEl) {
    if (lastFeed) {
      const date = new Date(lastFeed.timestamp_utc);
      insightLastFeedSubEl.textContent = `${formatSummaryDateLabel(date)} • ${formatRelativeTimeFrom(anchorEnd, date)}`;
    } else {
      insightLastFeedSubEl.textContent = "No feed logged";
    }
  }
  if (insightLastExpressEl) {
    if (lastExpress) {
      insightLastExpressEl.textContent = formatSummaryTime(lastExpress.timestamp_utc);
    } else {
      insightLastExpressEl.textContent = "--";
    }
  }
  if (insightLastExpressSubEl) {
    if (lastExpress) {
      const date = new Date(lastExpress.timestamp_utc);
      insightLastExpressSubEl.textContent = `${formatSummaryDateLabel(date)} • ${formatRelativeTimeFrom(anchorEnd, date)}`;
    } else {
      insightLastExpressSubEl.textContent = "No express logged";
    }
  }

  const timeframeSpecs = [
    { key: "24h", label: "Last 24h", hours: 24 },
    { key: "3d", label: "Last 3d", hours: 72 },
    { key: "7d", label: "Last 7d", hours: 168 },
    { key: "30d", label: "Last 30d", hours: 720 },
    { key: "all", label: "All time", hours: null },
  ];
  if (insightTimeframeBodyEl) {
    insightTimeframeBodyEl.innerHTML = "";
  }
  timeframeSpecs.forEach((spec) => {
    const untilMs = anchorEnd.getTime();
    const sinceMs = spec.hours ? untilMs - spec.hours * 3600000 : null;
    const windowEntries = filterEntriesByWindow(entries, sinceMs, untilMs);
    const feedStats = computeFeedStats(windowEntries);
    const expressStats = computeExpressStats(windowEntries);
    const diaperStats = computeDiaperStats(windowEntries);
    const sleepStats = computeSleepStats(windowEntries);
    const daySpan = computeWindowDaySpan(windowEntries, sinceMs, untilMs);
    const avgGapText = feedStats.avgGap ? formatDurationMinutes(feedStats.avgGap) : "--";
    const avgFeedTotalText = feedStats.count
      ? formatMl((feedStats.expressedTotal + feedStats.formulaTotal) / feedStats.count)
      : "--";
    const sleepAvgPerDayText = formatDurationMinutes(sleepStats.durationTotal / daySpan);
    const expressAvgText = expressStats.count
      ? formatMl(expressStats.totalMl / expressStats.count)
      : "--";

    if (spec.key === "24h") {
      if (insightFeedInterval24El) {
        insightFeedInterval24El.textContent = avgGapText;
      }
      if (insightFeedInterval24SubEl) {
        insightFeedInterval24SubEl.textContent = feedStats.medianGap
          ? `Median ${formatDurationMinutes(feedStats.medianGap)} • ${feedStats.count} feeds`
          : `${feedStats.count} feeds`;
      }
      if (insightExpressTotal24El) {
        insightExpressTotal24El.textContent = formatMl(expressStats.totalMl);
      }
      if (insightExpressTotal24SubEl) {
        insightExpressTotal24SubEl.textContent = expressStats.count
          ? `${expressStats.count} sessions • avg ${expressAvgText}`
          : "No express sessions";
      }
      if (insightDiaper24El) {
        insightDiaper24El.textContent = `${diaperStats.total} changes`;
      }
      if (insightDiaper24SubEl) {
        insightDiaper24SubEl.textContent = `Wee ${diaperStats.wee} • Poo ${diaperStats.poo}`;
      }
    }
    if (spec.key === "7d") {
      if (insightFeedInterval7dEl) {
        insightFeedInterval7dEl.textContent = avgGapText;
      }
      if (insightFeedInterval7dSubEl) {
        insightFeedInterval7dSubEl.textContent = feedStats.medianGap
          ? `Median ${formatDurationMinutes(feedStats.medianGap)} • ${feedStats.count} feeds`
          : `${feedStats.count} feeds`;
      }
      if (insightExpressTotal7El) {
        insightExpressTotal7El.textContent = formatMl(expressStats.totalMl);
      }
      if (insightExpressTotal7SubEl) {
        insightExpressTotal7SubEl.textContent = expressStats.count
          ? `${expressStats.count} sessions • avg ${expressAvgText}`
          : "No express sessions";
      }
      if (insightDiaper7El) {
        insightDiaper7El.textContent = `${diaperStats.total} changes`;
      }
      if (insightDiaper7SubEl) {
        insightDiaper7SubEl.textContent = `Wee ${diaperStats.wee} • Poo ${diaperStats.poo}`;
      }
    }

    if (insightTimeframeBodyEl) {
      const row = document.createElement("div");
      row.className = "insight-row";
      const cells = [
        spec.label,
        `${feedStats.count}`,
        avgGapText,
        avgFeedTotalText,
        sleepAvgPerDayText,
        formatDurationMinutes(feedStats.durationTotal),
        `${formatMl(expressStats.totalMl)} • ${expressStats.count}x`,
        expressAvgText,
      ];
      cells.forEach((text, idx) => {
        const cell = document.createElement("div");
        cell.className = "insight-cell";
        cell.textContent = text;
        if (idx === 0) {
          const strong = document.createElement("strong");
          strong.textContent = text;
          cell.textContent = "";
          cell.appendChild(strong);
        }
        row.appendChild(cell);
      });
      insightTimeframeBodyEl.appendChild(row);
    }
  });
}

function getSleepGanttTypeColor(type) {
  const normalized = normalizeEntryType(type);
  if (SLEEP_GANTT_TYPE_COLORS[normalized]) {
    return SLEEP_GANTT_TYPE_COLORS[normalized];
  }
  return "#60a5fa";
}

function getSleepGanttOverlayTypeOptions(entries) {
  const options = [];
  const seen = new Set();
  const pushType = (type) => {
    const normalized = normalizeEntryType(type);
    if (!normalized || normalized === "sleep" || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    options.push(normalized);
  };

  ["feed", "cry", "sick", "wee", "poo"].forEach(pushType);
  TIMED_EVENT_TYPES.forEach(pushType);
  state.customEventTypes.forEach(pushType);
  (entries || []).forEach((entry) => pushType(entry.type));
  return options;
}

function renderSleepGanttTypeOptions(entries) {
  if (!sleepGanttTypeOptionsEl) {
    return;
  }
  const options = getSleepGanttOverlayTypeOptions(entries);
  sleepGanttTypeOptionsEl.innerHTML = "";

  const allowed = new Set(options);
  sleepGanttOverlayTypes.forEach((type) => {
    if (!allowed.has(type)) {
      sleepGanttOverlayTypes.delete(type);
    }
  });
  if (!sleepGanttOverlayTypes.size) {
    options.forEach((type) => {
      if (SLEEP_GANTT_DEFAULT_OVERLAYS.has(type)) {
        sleepGanttOverlayTypes.add(type);
      }
    });
  }

  options.forEach((type) => {
    const active = sleepGanttOverlayTypes.has(type);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sleep-gantt-toggle";
    button.dataset.sleepGanttType = type;
    button.textContent = formatEntryTypeLabel(type);
    button.classList.toggle("active", active);
    if (active) {
      button.style.background = getSleepGanttTypeColor(type);
    }
    sleepGanttTypeOptionsEl.appendChild(button);
  });
}

function formatSleepGanttTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function setSleepGanttReadout(text) {
  if (!sleepGanttReadoutEl) {
    return;
  }
  sleepGanttReadoutEl.textContent = text;
}

function renderSleepGantt(entries) {
  if (!sleepGanttChartEl || !sleepGanttEmptyEl) {
    return;
  }
  sleepGanttChartEl.innerHTML = "";

  const dayWindow = getSummaryDayWindow(summaryDate || new Date());
  const dayStartMs = dayWindow.since.getTime();
  const dayEndExclusiveMs = dayStartMs + 86400000;
  const daySpanMs = dayEndExclusiveMs - dayStartMs;
  const activeEntries = (entries || []).filter((entry) => {
    if (!entry || entry.deleted_at_utc) {
      return false;
    }
    const ts = Date.parse(entry.timestamp_utc || "");
    return Number.isFinite(ts);
  });
  const sleepBars = [];
  const overlays = [];
  activeEntries.forEach((entry) => {
    const type = normalizeEntryType(entry.type);
    const startMs = Date.parse(entry.timestamp_utc || "");
    if (!Number.isFinite(startMs)) {
      return;
    }
    if (type === "sleep") {
      const durationMin = Number.parseFloat(entry.feed_duration_min);
      if (!Number.isFinite(durationMin) || durationMin <= 0) {
        return;
      }
      const endMs = startMs + durationMin * 60000;
      const clippedStartMs = Math.max(dayStartMs, startMs);
      const clippedEndMs = Math.min(dayEndExclusiveMs, endMs);
      if (clippedEndMs <= clippedStartMs) {
        return;
      }
      sleepBars.push({
        entry,
        startMs,
        endMs,
        clippedStartMs,
        clippedEndMs,
        durationMin,
      });
      return;
    }
    if (!sleepGanttOverlayTypes.has(type) || startMs < dayStartMs || startMs >= dayEndExclusiveMs) {
      return;
    }
    overlays.push({ entry, type, startMs });
  });

  const hasData = sleepBars.length > 0 || overlays.length > 0;
  sleepGanttEmptyEl.style.display = hasData ? "none" : "block";
  if (!hasData) {
    setSleepGanttReadout("No sleep or selected events for this day.");
    return;
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 360;
  const height = 168;
  const paddingLeft = 20;
  const paddingRight = 14;
  const plotLeft = paddingLeft;
  const plotRight = width - paddingRight;
  const plotWidth = plotRight - plotLeft;
  const sleepY = 34;
  const sleepHeight = 28;
  const markerY = 97;
  const axisY = 131;

  const track = document.createElementNS(svgNS, "rect");
  track.setAttribute("x", String(plotLeft));
  track.setAttribute("y", String(sleepY));
  track.setAttribute("width", String(plotWidth));
  track.setAttribute("height", String(sleepHeight));
  track.setAttribute("fill", "rgba(124, 131, 255, 0.12)");
  sleepGanttChartEl.appendChild(track);

  const markerTrack = document.createElementNS(svgNS, "line");
  markerTrack.setAttribute("x1", String(plotLeft));
  markerTrack.setAttribute("x2", String(plotRight));
  markerTrack.setAttribute("y1", String(markerY));
  markerTrack.setAttribute("y2", String(markerY));
  markerTrack.setAttribute("stroke", "rgba(125, 127, 123, 0.35)");
  markerTrack.setAttribute("stroke-width", "1.5");
  sleepGanttChartEl.appendChild(markerTrack);

  for (let hour = 0; hour <= 24; hour += 3) {
    const x = plotLeft + (hour / 24) * plotWidth;
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", String(x));
    tick.setAttribute("x2", String(x));
    tick.setAttribute("y1", String(sleepY - 10));
    tick.setAttribute("y2", String(axisY));
    tick.setAttribute("stroke", "rgba(125, 127, 123, 0.2)");
    tick.setAttribute("stroke-width", hour % 6 === 0 ? "1" : "0.7");
    sleepGanttChartEl.appendChild(tick);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(axisY + 14));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#7d7f7b");
    label.setAttribute("font-size", "10");
    label.textContent = String(hour).padStart(2, "0");
    sleepGanttChartEl.appendChild(label);
  }

  const sleepLabel = document.createElementNS(svgNS, "text");
  sleepLabel.setAttribute("x", String(plotLeft));
  sleepLabel.setAttribute("y", String(sleepY - 6));
  sleepLabel.setAttribute("fill", "#7d7f7b");
  sleepLabel.setAttribute("font-size", "10");
  sleepLabel.setAttribute("text-anchor", "start");
  sleepLabel.textContent = "Sleep";
  sleepGanttChartEl.appendChild(sleepLabel);

  const eventsLabel = document.createElementNS(svgNS, "text");
  eventsLabel.setAttribute("x", String(plotLeft));
  eventsLabel.setAttribute("y", String(markerY - 8));
  eventsLabel.setAttribute("fill", "#7d7f7b");
  eventsLabel.setAttribute("font-size", "10");
  eventsLabel.setAttribute("text-anchor", "start");
  eventsLabel.textContent = "Events";
  sleepGanttChartEl.appendChild(eventsLabel);

  sleepBars.forEach((bar) => {
    const startRatio = (bar.clippedStartMs - dayStartMs) / daySpanMs;
    const endRatio = (bar.clippedEndMs - dayStartMs) / daySpanMs;
    const x = plotLeft + startRatio * plotWidth;
    const widthPx = Math.max(2, (endRatio - startRatio) * plotWidth);
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(sleepY + 3));
    rect.setAttribute("width", String(widthPx));
    rect.setAttribute("height", String(sleepHeight - 6));
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", getSleepGanttTypeColor("sleep"));
    rect.setAttribute("fill-opacity", "0.6");
    rect.setAttribute("stroke", getSleepGanttTypeColor("sleep"));
    rect.setAttribute("stroke-width", "1");
    const startLabel = formatSleepGanttTime(new Date(bar.startMs));
    const endLabel = formatSleepGanttTime(new Date(bar.endMs));
    const detail = `Sleep ${startLabel} to ${endLabel} (${formatDurationMinutes(bar.durationMin)})`;
    rect.addEventListener("mouseenter", () => setSleepGanttReadout(detail));
    rect.addEventListener("click", () => setSleepGanttReadout(detail));
    const title = document.createElementNS(svgNS, "title");
    title.textContent = detail;
    rect.appendChild(title);
    sleepGanttChartEl.appendChild(rect);
  });

  overlays.forEach((overlay, idx) => {
    const ratio = (overlay.startMs - dayStartMs) / daySpanMs;
    const x = plotLeft + ratio * plotWidth;
    const marker = document.createElementNS(svgNS, "circle");
    marker.setAttribute("cx", String(x));
    marker.setAttribute("cy", String(markerY - (idx % 3) * 3));
    marker.setAttribute("r", "4.2");
    marker.setAttribute("fill", getSleepGanttTypeColor(overlay.type));
    marker.setAttribute("stroke", "#ffffff");
    marker.setAttribute("stroke-width", "1");
    const detail = `${formatEntryTypeLabel(overlay.type)} at ${formatSleepGanttTime(new Date(overlay.startMs))}`;
    marker.addEventListener("mouseenter", () => setSleepGanttReadout(detail));
    marker.addEventListener("click", () => setSleepGanttReadout(detail));
    const title = document.createElementNS(svgNS, "title");
    title.textContent = detail;
    marker.appendChild(title);
    sleepGanttChartEl.appendChild(marker);
  });

  const sleepMinutes = sleepBars.reduce(
    (total, bar) => total + ((bar.clippedEndMs - bar.clippedStartMs) / 60000),
    0,
  );
  setSleepGanttReadout(
    `${formatDurationMinutes(sleepMinutes)} sleep across ${sleepBars.length} session${sleepBars.length === 1 ? "" : "s"} • ${overlays.length} selected event${overlays.length === 1 ? "" : "s"}.`,
  );
}

function updateLogEmptyMessage() {
  if (!logEmptyEl) {
    return;
  }
  const hasWindow = Number.isFinite(logWindowHours);
  if (!logFilterType && !hasWindow) {
    return;
  }
  const windowLabel = hasWindow ? ` in the last ${logWindowHours} hours` : "";
  const typeLabel = logFilterType ? logFilterType : "entries";
  const prefix = logFilterType ? `No ${typeLabel} entries` : "No entries";
  logEmptyEl.textContent = `${prefix}${windowLabel}.`;
}

function normalizeEntriesResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.entries)) {
    return data.entries;
  }
  return [];
}

function normalizeGoalsResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.goals)) {
    return data.goals;
  }
  return [];
}

async function listEntriesLocalSafe(params) {
  try {
    return await listEntriesLocal(params);
  } catch (err) {
    return null;
  }
}

async function loadEntriesWithFallback(params) {
  const localEntriesPromise = listEntriesLocalSafe(params);
  try {
    if (syncInFlight) {
      await syncInFlight;
    }
    const serverEntries = await fetchEntries(params);
    try {
      await applyServerEntries(serverEntries);
    } catch (err) {
      // Ignore cache failures and return server data.
    }
    return serverEntries;
  } catch (err) {
    const localEntries = await localEntriesPromise;
    if (localEntries) {
      return localEntries;
    }
    if (localEntries === null) {
      throw err;
    }
    return [];
  }
}

async function loadLatestEntryWithFallback() {
  const localEntriesPromise = listEntriesLocalSafe({ limit: 1 });
  try {
    if (syncInFlight) {
      await syncInFlight;
    }
    const serverEntries = await fetchEntries({ limit: 1 });
    try {
      await applyServerEntries(serverEntries);
    } catch (err) {
      // Ignore cache failures and return server data.
    }
    const localEntries = await localEntriesPromise;
    const localLatest = localEntries && localEntries.length ? localEntries[0] : null;
    return serverEntries && serverEntries.length ? serverEntries[0] : localLatest;
  } catch (err) {
    const localEntries = await localEntriesPromise;
    const localLatest = localEntries && localEntries.length ? localEntries[0] : null;
    return localLatest;
  }
}

function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function fetchEntries(params) {
  const response = await fetch(
    buildUrl(`/api/entries${buildQuery(params)}`),
  );
  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err.error || JSON.stringify(err);
    } catch (parseError) {
      detail = await response.text();
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return normalizeEntriesResponse(data);
}

function sortEntriesByTimestampDesc(entries) {
  return entries.slice().sort((left, right) => {
    const leftMs = Date.parse(left.timestamp_utc || "");
    const rightMs = Date.parse(right.timestamp_utc || "");
    if (Number.isNaN(leftMs) && Number.isNaN(rightMs)) {
      return 0;
    }
    if (Number.isNaN(leftMs)) {
      return 1;
    }
    if (Number.isNaN(rightMs)) {
      return -1;
    }
    return rightMs - leftMs;
  });
}

function mergeEntriesUnique(existingEntries, incomingEntries) {
  const deduped = new Map();
  existingEntries.forEach((entry) => {
    const key = entry.client_event_id || `id:${entry.id || ""}:${entry.timestamp_utc || ""}`;
    deduped.set(key, entry);
  });
  incomingEntries.forEach((entry) => {
    const key = entry.client_event_id || `id:${entry.id || ""}:${entry.timestamp_utc || ""}`;
    deduped.set(key, entry);
  });
  return sortEntriesByTimestampDesc(Array.from(deduped.values()));
}

function formatSummaryCoverageDate(isoValue) {
  const parsed = new Date(isoValue || "");
  if (Number.isNaN(parsed.getTime())) {
    return "unknown date";
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildSummaryInsightProgressText(entries, anchorEnd, complete) {
  if (complete) {
    return "All-time metrics fully loaded.";
  }
  if (!entries.length) {
    return "Loading all-time metrics...";
  }
  const oldest = entries[entries.length - 1];
  const oldestDateLabel = formatSummaryCoverageDate(oldest.timestamp_utc);
  const oldestMs = Date.parse(oldest.timestamp_utc || "");
  const anchorMs = anchorEnd.getTime();
  const coverageDays = Number.isNaN(oldestMs)
    ? "--"
    : String(Math.max(1, Math.ceil((anchorMs - oldestMs) / 86400000)));
  return `All-time metrics are partial: loaded ${entries.length} entries through ${oldestDateLabel} (${coverageDays}d coverage).`;
}

function setSummaryInsightProgressText(text) {
  if (!insightProgressLabelEl) {
    return;
  }
  insightProgressLabelEl.textContent = text || "";
}

async function yieldForUi() {
  await new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: 150 });
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

async function fetchEntriesInWindow(params) {
  const limit = 500;
  const since = params && params.since ? params.since : undefined;
  const type = params && params.type ? params.type : undefined;
  let batchUntil = params && params.until ? params.until : undefined;
  let entries = [];
  for (let page = 0; page < 100; page += 1) {
    const batch = await fetchEntries({
      limit,
      since,
      until: batchUntil,
      type,
    });
    entries = entries.concat(batch);
    if (batch.length < limit) {
      break;
    }
    const oldest = batch[batch.length - 1];
    if (!oldest || !oldest.timestamp_utc) {
      break;
    }
    const nextUntil = decrementIsoTimestamp(oldest.timestamp_utc);
    if (!nextUntil || nextUntil === batchUntil) {
      break;
    }
    batchUntil = nextUntil;
  }
  return entries;
}

async function fetchFeedingGoals(params) {
  const response = await fetch(buildUrl(`/api/feeding-goals${buildQuery(params || {})}`));
  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err.error || JSON.stringify(err);
    } catch (parseError) {
      detail = await response.text();
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return normalizeGoalsResponse(data);
}

async function fetchCurrentGoal() {
  const response = await fetch(buildUrl("/api/feeding-goals/current"));
  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err.error || JSON.stringify(err);
    } catch (parseError) {
      detail = await response.text();
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json();
}

async function loadFeedingGoals(limit) {
  const goals = await fetchFeedingGoals({ limit });
  hasLoadedFeedingGoals = true;
  return goals;
}

async function loadCurrentGoal() {
  try {
    return await fetchCurrentGoal();
  } catch (err) {
    return null;
  }
}

function renderChartInto(chartSvgEl, chartEmptyStateEl, entries, windowBounds) {
  if (!chartSvgEl || !chartEmptyStateEl) {
    return;
  }
  chartSvgEl.innerHTML = "";
  if (!entries.length) {
    chartEmptyStateEl.style.display = "flex";
    return;
  }
  chartEmptyStateEl.style.display = "none";

  const svgNS = "http://www.w3.org/2000/svg";
  const { width, height, paddingX, axisY } = CHART_CONFIG;

  const axisLine = document.createElementNS(svgNS, "line");
  axisLine.setAttribute("x1", paddingX);
  axisLine.setAttribute("x2", width - paddingX);
  axisLine.setAttribute("y1", axisY);
  axisLine.setAttribute("y2", axisY);
  axisLine.setAttribute("stroke", "#d9d2c7");
  axisLine.setAttribute("stroke-width", "2");
  chartSvgEl.appendChild(axisLine);

  const hoursSpan = Math.round(
    (windowBounds.until.getTime() - windowBounds.since.getTime()) / 3600000,
  );
  const ticks = [hoursSpan, hoursSpan * 0.75, hoursSpan * 0.5, hoursSpan * 0.25, 0];
  const labels = ticks.map((tick) => {
    if (tick === 0) {
      return "now";
    }
    const label = tick % 1 === 0 ? `${tick}` : tick.toFixed(1);
    return `${label}h`;
  });

  labels.forEach((label, idx) => {
    const x = paddingX + ((width - paddingX * 2) / 4) * idx;
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("x2", x);
    tick.setAttribute("y1", axisY - 6);
    tick.setAttribute("y2", axisY + 6);
    tick.setAttribute("stroke", "#d9d2c7");
    tick.setAttribute("stroke-width", "1");
    chartSvgEl.appendChild(tick);

    const relativeText = document.createElementNS(svgNS, "text");
    relativeText.setAttribute("x", x);
    relativeText.setAttribute("y", height - 16);
    relativeText.setAttribute("fill", "#8b857e");
    relativeText.setAttribute("font-size", "10");
    relativeText.setAttribute("text-anchor", "middle");
    relativeText.textContent = label;
    chartSvgEl.appendChild(relativeText);

    const tickTime = new Date(windowBounds.until.getTime() - ticks[idx] * 3600000);
    const absoluteText = document.createElementNS(svgNS, "text");
    absoluteText.setAttribute("x", x);
    absoluteText.setAttribute("y", height - 4);
    absoluteText.setAttribute("fill", "#8b857e");
    absoluteText.setAttribute("font-size", "10");
    absoluteText.setAttribute("text-anchor", "middle");
    absoluteText.textContent = formatChartTickTime(tickTime);
    chartSvgEl.appendChild(absoluteText);
  });

  const startMs = windowBounds.since.getTime();
  const untilMs = windowBounds.until.getTime();
  const spanMs = untilMs - startMs;

  const formatChartDuration = (minutesValue) => {
    const rounded = Math.round(minutesValue);
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    if (!hours) {
      return `${minutes}m`;
    }
    if (!minutes) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  entries.forEach((entry) => {
    const timestamp = new Date(entry.timestamp_utc);
    if (Number.isNaN(timestamp.getTime())) {
      return;
    }
    const entryType = normalizeEntryType(entry.type);
    const eventMeta = CHART_EVENT_TYPES[entryType];
    if (!eventMeta) {
      return;
    }
    const eventStartMs = timestamp.getTime();
    const ratio = (eventStartMs - startMs) / spanMs;
    const startInWindow = ratio >= 0 && ratio <= 1;
    const x = paddingX + ratio * (width - paddingX * 2);
    const y = eventMeta.y;
    const color = eventMeta.color;

    const duration = Number.parseFloat(entry.feed_duration_min);
    if ((entryType === "sleep" || entryType === "cry") && Number.isFinite(duration) && duration > 0) {
      const durationMs = duration * 60000;
      const eventEndMs = eventStartMs + durationMs;
      const clippedStartMs = Math.max(startMs, eventStartMs);
      const clippedEndMs = Math.min(untilMs, eventEndMs);
      const clippedStartRatio = (clippedStartMs - startMs) / spanMs;
      const clippedEndRatio = (clippedEndMs - startMs) / spanMs;
      const barStartX = paddingX + clippedStartRatio * (width - paddingX * 2);
      const barEndX = paddingX + clippedEndRatio * (width - paddingX * 2);
      if (barEndX > barStartX) {
        const durationBar = document.createElementNS(svgNS, "line");
        durationBar.setAttribute("x1", barStartX);
        durationBar.setAttribute("x2", barEndX);
        durationBar.setAttribute("y1", y);
        durationBar.setAttribute("y2", y);
        durationBar.setAttribute("stroke", color);
        durationBar.setAttribute("stroke-width", "7");
        durationBar.setAttribute("stroke-linecap", "round");
        durationBar.setAttribute("opacity", "0.35");
        chartSvgEl.appendChild(durationBar);

        const durationLabel = document.createElementNS(svgNS, "text");
        durationLabel.setAttribute("x", barEndX);
        durationLabel.setAttribute("y", Math.max(10, y - 7));
        durationLabel.setAttribute("fill", color);
        durationLabel.setAttribute("font-size", "9");
        durationLabel.setAttribute("font-weight", "700");
        durationLabel.setAttribute("text-anchor", "end");
        durationLabel.textContent = formatChartDuration(duration);
        chartSvgEl.appendChild(durationLabel);
      }
    }

    if (!startInWindow) {
      return;
    }
    const stem = document.createElementNS(svgNS, "line");
    stem.setAttribute("x1", x);
    stem.setAttribute("x2", x);
    stem.setAttribute("y1", y);
    stem.setAttribute("y2", axisY);
    stem.setAttribute("stroke", "#e1d8cc");
    stem.setAttribute("stroke-width", "1");
    chartSvgEl.appendChild(stem);

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", color);
    dot.setAttribute("stroke", "#ffffff");
    dot.setAttribute("stroke-width", "1");
    chartSvgEl.appendChild(dot);
  });
}

function renderChart(entries, chartWindows) {
  if (!chartPanelsEl || !chartEmptyEl) {
    return;
  }
  chartPanelsEl.innerHTML = "";
  chartEmptyEl.style.display = entries.length ? "none" : "flex";
  chartWindows.forEach((windowBounds, index) => {
    const panelEl = document.createElement("section");
    panelEl.className = "history-chart-panel";

    const panelHeaderEl = document.createElement("div");
    panelHeaderEl.className = "history-chart-panel-header";

    const panelTitleEl = document.createElement("div");
    panelTitleEl.className = "history-chart-panel-title";
    panelTitleEl.textContent = formatChartPanelLabel(windowBounds);

    const panelTimeEl = document.createElement("div");
    panelTimeEl.className = "history-chart-panel-time";
    panelTimeEl.textContent = formatChartPanelTime(windowBounds);

    panelHeaderEl.appendChild(panelTitleEl);
    panelHeaderEl.appendChild(panelTimeEl);

    const panelBodyEl = document.createElement("div");
    panelBodyEl.className = "history-chart-panel-body";

    const panelSvgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    panelSvgEl.classList.add("history-chart-panel-svg");
    panelSvgEl.setAttribute("viewBox", `0 0 ${CHART_CONFIG.width} 170`);
    panelSvgEl.setAttribute("preserveAspectRatio", "none");
    panelSvgEl.setAttribute(
      "aria-label",
      `Baby activity from ${formatChartTickTime(windowBounds.since)} to ${formatChartTickTime(windowBounds.until)}`,
    );

    const panelEmptyEl = document.createElement("div");
    panelEmptyEl.className = "chart-empty";
    panelEmptyEl.textContent = "No events in this block.";

    panelBodyEl.appendChild(panelSvgEl);
    panelBodyEl.appendChild(panelEmptyEl);
    panelEl.appendChild(panelHeaderEl);
    panelEl.appendChild(panelBodyEl);

    const panelEntries = entries.filter((entry) => entryOverlapsChartWindow(entry, windowBounds));
    renderChartInto(panelSvgEl, panelEmptyEl, panelEntries, windowBounds);
    if (index === chartWindows.length - 1) {
      panelEl.dataset.chartLatest = "true";
    }
    chartPanelsEl.appendChild(panelEl);
  });
  const latestPanelEl = chartPanelsEl.querySelector('[data-chart-latest="true"]');
  const chartScrollEl = chartPanelsEl.closest(".chart-wrap");
  if (latestPanelEl && chartScrollEl) {
    chartScrollEl.scrollLeft = chartScrollEl.scrollWidth;
  }
}

function entryOverlapsChartWindow(entry, chartWindow) {
  const timestamp = new Date(entry.timestamp_utc);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }
  const entryType = normalizeEntryType(entry.type);
  const startMs = timestamp.getTime();
  const sinceMs = chartWindow.since.getTime();
  const untilMs = chartWindow.until.getTime();
  if (startMs >= sinceMs && startMs <= untilMs) {
    return true;
  }
  if (entryType !== "sleep" && entryType !== "cry") {
    return false;
  }
  const duration = Number.parseFloat(entry.feed_duration_min);
  if (!Number.isFinite(duration) || duration <= 0) {
    return false;
  }
  const endMs = startMs + duration * 60000;
  return endMs >= sinceMs && startMs <= untilMs;
}

function renderLogEntries(entries) {
  if (!logListEl || !logEmptyEl) {
    return;
  }
  logListEl.innerHTML = "";
  if (!entries.length) {
    logEmptyEl.style.display = "block";
    return;
  }
  logEmptyEl.style.display = "none";

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const left = document.createElement("div");
    left.className = "entry-details";
    const typeEl = document.createElement("div");
    typeEl.className = "entry-type";
    typeEl.textContent = entry.type;

    const timeEl = document.createElement("div");
    timeEl.className = "entry-meta";
    timeEl.textContent = formatTimestamp(entry.timestamp_utc);

    const byEl = document.createElement("div");
    byEl.className = "entry-meta";
    byEl.textContent = entry.user_slug
      ? `Logged by ${entry.user_slug}`
      : "Logged by --";

    left.appendChild(typeEl);
    left.appendChild(timeEl);
    left.appendChild(byEl);
    if (entry.notes) {
      const notesEl = document.createElement("div");
      notesEl.className = "entry-meta";
      notesEl.textContent = entry.notes;
      left.appendChild(notesEl);
    }
    if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
      const durationEl = document.createElement("div");
      durationEl.className = "entry-meta";
      durationEl.textContent = `Duration ${entry.feed_duration_min} min`;
      left.appendChild(durationEl);
    }

    const right = document.createElement("div");
    right.className = "log-actions";

    const amountsWrap = document.createElement("div");
    amountsWrap.className = "log-amounts";

    const buttonsWrap = document.createElement("div");
    buttonsWrap.className = "log-buttons";

    const amounts = [];
    if (entry.expressed_ml !== null && entry.expressed_ml !== undefined) {
      amounts.push({ label: "Expressed", value: entry.expressed_ml });
    }
    if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
      amounts.push({ label: "Formula", value: entry.formula_ml });
    }
    if (entry.amount_ml !== null && entry.amount_ml !== undefined) {
      amounts.push({ label: "Amount", value: entry.amount_ml });
    }

    const buildIconButton = (label, icon, onClick) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "icon-button";
      btn.setAttribute("aria-label", label);
      btn.title = label;

      const iconEl = document.createElement("span");
      iconEl.className = "material-symbols-outlined";
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;

      const labelEl = document.createElement("span");
      labelEl.className = "button-label";
      labelEl.textContent = label;

      btn.append(iconEl, labelEl);
      btn.addEventListener("click", onClick);
      return btn;
    };

    const editBtn = buildIconButton("Edit", "edit", () => editEntry(entry));
    const delBtn = buildIconButton("Delete", "delete", () => deleteEntry(entry));

    amounts.forEach(({ label, value }) => {
      const amountEl = document.createElement("span");
      amountEl.className = "entry-meta";
      amountEl.textContent = `${label} ${value} ml`;
      amountsWrap.appendChild(amountEl);
    });
    if (amounts.length) {
      right.appendChild(amountsWrap);
    }
    buttonsWrap.appendChild(editBtn);
    buttonsWrap.appendChild(delBtn);
    right.appendChild(buttonsWrap);
    item.appendChild(left);
    item.appendChild(right);
    logListEl.appendChild(item);
  });
}

function setTimelineLoading(isLoading) {
  if (timelineLoadingEl) {
    timelineLoadingEl.style.display = isLoading ? "flex" : "none";
  }
}

function updateTimelineEmpty() {
  if (!timelineEmptyEl) {
    return;
  }
  timelineEmptyEl.style.display = timelineEntryCount ? "none" : "flex";
}

function clearTimeline() {
  if (timelineTrackEl) {
    timelineTrackEl.innerHTML = "";
  }
  timelineDayMap.clear();
  timelineHourMap.clear();
  timelineEntryCount = 0;
  timelineOldestTimestamp = null;
  timelineHasMore = true;
  updateTimelineEmpty();
}

function ensureTimelineDay(dayKey, date) {
  if (timelineDayMap.has(dayKey)) {
    return timelineDayMap.get(dayKey);
  }
  if (!timelineTrackEl) {
    return null;
  }
  const section = document.createElement("section");
  section.className = "timeline-day";

  const header = document.createElement("div");
  header.className = "timeline-day-header";

  const label = document.createElement("div");
  label.className = "timeline-day-label";
  label.textContent = formatTimelineDay(date);

  const meta = document.createElement("div");
  meta.className = "timeline-day-meta";
  meta.textContent = getDateKey(date);

  header.append(label, meta);

  const hoursWrap = document.createElement("div");
  hoursWrap.className = "timeline-day-hours";

  section.append(header, hoursWrap);
  timelineTrackEl.appendChild(section);

  const record = { section, hoursWrap };
  timelineDayMap.set(dayKey, record);
  return record;
}

function ensureTimelineHour(dayKey, hourKey, date, dayRecord) {
  const compositeKey = `${dayKey}:${hourKey}`;
  if (timelineHourMap.has(compositeKey)) {
    return timelineHourMap.get(compositeKey);
  }
  if (!dayRecord) {
    return null;
  }
  const hourRow = document.createElement("div");
  hourRow.className = "timeline-hour";

  const hourLabel = document.createElement("div");
  hourLabel.className = "timeline-hour-label";
  hourLabel.textContent = formatTimelineHour(date);

  const hourStack = document.createElement("div");
  hourStack.className = "timeline-hour-stack";

  hourRow.append(hourLabel, hourStack);
  dayRecord.hoursWrap.appendChild(hourRow);

  const record = { hourRow, hourStack };
  timelineHourMap.set(compositeKey, record);
  return record;
}

function buildTimelineCard(entry, staggerIndex) {
  const config = getTimelineTypeConfig(entry.type || "event");
  const card = document.createElement("article");
  card.className = "timeline-card";
  card.style.setProperty("--event-color", config.color);
  card.style.setProperty("--event-glow", hexToRgba(config.color, 0.28));
  card.style.setProperty("--stagger", `${(staggerIndex % 6) * 0.05}s`);

  const icon = document.createElement("div");
  icon.className = "timeline-icon";
  const iconGlyph = document.createElement("span");
  iconGlyph.className = "material-symbols-outlined";
  iconGlyph.setAttribute("aria-hidden", "true");
  iconGlyph.textContent = config.icon;
  icon.appendChild(iconGlyph);

  const content = document.createElement("div");
  content.className = "timeline-content";

  const title = document.createElement("div");
  title.className = "timeline-title";
  title.textContent = entry.type || "Event";

  const timeMeta = document.createElement("div");
  timeMeta.className = "timeline-meta";
  const localTime = formatSummaryTime(entry.timestamp_utc);
  timeMeta.textContent = `${localTime} - ${formatRelativeTime(entry.timestamp_utc)}`;

  const detailRow = document.createElement("div");
  detailRow.className = "timeline-details";
  const details = [];
  if (entry.amount_ml !== null && entry.amount_ml !== undefined) {
    details.push(`Amount ${formatMl(entry.amount_ml)}`);
  }
  if (entry.expressed_ml !== null && entry.expressed_ml !== undefined) {
    details.push(`Expressed ${formatMl(entry.expressed_ml)}`);
  }
  if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
    details.push(`Formula ${formatMl(entry.formula_ml)}`);
  }
  if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
    details.push(`Duration ${formatDurationMinutes(entry.feed_duration_min)}`);
  }
  details.forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "timeline-chip";
    chip.textContent = text;
    detailRow.appendChild(chip);
  });

  if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
    const duration = Number(entry.feed_duration_min);
    if (Number.isFinite(duration) && duration > 0) {
      const span = Math.round(Math.min(90, Math.max(12, duration * 1.2)));
      card.classList.add("has-duration");
      card.style.setProperty("--duration-span", `${span}px`);
    }
  }

  content.append(title, timeMeta);
  if (detailRow.childElementCount) {
    content.appendChild(detailRow);
  }

  if (entry.notes) {
    const notes = document.createElement("div");
    notes.className = "timeline-notes";
    notes.textContent = entry.notes;
    content.appendChild(notes);
  }

  if (entry.user_slug) {
    const byline = document.createElement("div");
    byline.className = "timeline-byline";
    byline.textContent = `Logged by ${entry.user_slug}`;
    content.appendChild(byline);
  }

  const actions = document.createElement("div");
  actions.className = "timeline-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "timeline-action timeline-action-edit";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => {
    void editEntry(entry);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "timeline-action timeline-action-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    void deleteEntry(entry);
  });

  actions.append(editBtn, deleteBtn);
  content.appendChild(actions);

  card.append(icon, content);
  return card;
}

function appendTimelineEntries(entries) {
  if (!timelineTrackEl || !entries.length) {
    return;
  }
  entries.forEach((entry, index) => {
    const timestamp = entry.timestamp_utc;
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return;
    }
    const dayKey = getDateKey(date);
    const hourKey = getHourKey(date);
    const dayRecord = ensureTimelineDay(dayKey, date);
    const hourRecord = ensureTimelineHour(dayKey, hourKey, date, dayRecord);
    if (!hourRecord) {
      return;
    }
    const card = buildTimelineCard(entry, timelineEntryCount + index);
    hourRecord.hourStack.appendChild(card);
  });
  timelineEntryCount += entries.length;
  updateTimelineEmpty();
}

function decrementIsoTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Date(date.getTime() - 1).toISOString();
}

async function loadTimelineEntries(options = {}) {
  if (timelineLoading || (!timelineHasMore && !options.reset)) {
    return;
  }
  const shouldShowLoading = !hasLoadedTimelineEntries;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  if (options.reset) {
    clearTimeline();
  }
  timelineLoading = true;
  setTimelineLoading(true);
  try {
    const params = { limit: 60 };
    if (!options.reset && timelineOldestTimestamp) {
      params.until = timelineOldestTimestamp;
    }
    if (!navigator.onLine) {
      const cachedEntries = await listEntriesLocalSafe(params);
      if (cachedEntries && cachedEntries.length) {
        appendTimelineEntries(cachedEntries);
        if (cachedEntries.length) {
          timelineOldestTimestamp = decrementIsoTimestamp(
            cachedEntries[cachedEntries.length - 1].timestamp_utc,
          );
        }
        if (cachedEntries.length < params.limit) {
          timelineHasMore = false;
        }
      }
      return;
    }
    void syncNow();
    const entries = await loadEntriesWithFallback(params);
    appendTimelineEntries(entries);
    if (entries.length) {
      timelineOldestTimestamp = decrementIsoTimestamp(
        entries[entries.length - 1].timestamp_utc,
      );
    }
    if (entries.length < params.limit) {
      timelineHasMore = false;
    }
  } catch (err) {
    setStatus(`Failed to load timeline: ${err.message || "unknown error"}`);
  } finally {
    timelineLoading = false;
    setTimelineLoading(false);
    if (shouldShowLoading) {
      setLoadingState(false);
    }
    hasLoadedTimelineEntries = true;
    updateTimelineEmpty();
  }
}

function initTimelineHandlers() {
  if (timelineInitialized || pageType !== "timeline") {
    return;
  }
  timelineInitialized = true;
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      void loadTimelineEntries({ reset: true });
    });
  }
  if (timelineWrapEl && timelineSentinelEl) {
    timelineObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadTimelineEntries();
        }
      },
      { root: timelineWrapEl, rootMargin: "200px" },
    );
    timelineObserver.observe(timelineSentinelEl);
  }
}

async function refreshEntriesForCurrentPage() {
  if (pageType === "log") {
    await loadLogEntries();
    return;
  }
  if (pageType === "timeline") {
    await loadTimelineEntries({ reset: true });
    return;
  }
  if (pageType === "summary") {
    await loadSummaryEntries();
    await loadRulerFeeds({ reset: true });
    return;
  }
  await loadHomeEntries();
}

function renderStats(entries, options = {}) {
  if (!statFeedTodayEl) {
    return;
  }
  const sleepEntries = Array.isArray(options.sleepEntries) ? options.sleepEntries : entries;
  let feedCount24h = 0;
  let weeCount24h = 0;
  let pooCount24h = 0;
  let feedTotal24hMl = 0;
  let todayFeedTotalMl = 0;
  let todayFeedEventCount = 0;
  let todayFeedCount = 0;
  let expressedTotal24hMl = 0;
  let formulaTotal24hMl = 0;
  let todayExpressedTotalMl = 0;
  let todayFormulaTotalMl = 0;
  let todayWeeCount = 0;
  let todayPooCount = 0;
  let todaySleepCount = 0;
  let todaySleepDurationTotal = 0;
  const feedVolumeEntries = [];
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStartTs = dayStart.getTime();
  const todaySleepSplit = getSplitSleepMinutesForDay(sleepEntries, now);
  entries.forEach((entry) => {
    const timestamp = new Date(entry.timestamp_utc);
    const ts = timestamp.getTime();
    const isToday = !Number.isNaN(ts) && ts >= dayStartTs;
    if (isFeedType(entry.type)) {
      if (isBreastfeedInProgress(entry)) {
        return;
      }
      feedCount24h += 1;
      if (isToday) {
        todayFeedEventCount += 1;
      }
      const feedMl = getFeedEntryTotalMl(entry);
      feedTotal24hMl += feedMl;
      if (feedMl > 0 && !Number.isNaN(timestamp.getTime())) {
        feedVolumeEntries.push({ ts, ml: feedMl });
        if (isToday) {
          todayFeedTotalMl += feedMl;
          todayFeedCount += 1;
        }
      }
      if (typeof entry.expressed_ml === "number" && Number.isFinite(entry.expressed_ml)) {
        expressedTotal24hMl += entry.expressed_ml;
        if (isToday) {
          todayExpressedTotalMl += entry.expressed_ml;
        }
      }
      if (typeof entry.formula_ml === "number" && Number.isFinite(entry.formula_ml)) {
        formulaTotal24hMl += entry.formula_ml;
        if (isToday) {
          todayFormulaTotalMl += entry.formula_ml;
        }
      }
    } else if (entry.type === "wee") {
      weeCount24h += 1;
      if (isToday) {
        todayWeeCount += 1;
      }
    } else if (entry.type === "poo") {
      pooCount24h += 1;
      if (isToday) {
        todayPooCount += 1;
      }
    } else if (isSleepType(entry.type)) {
      const sleepDuration = Number.parseFloat(entry.feed_duration_min);
      if (isToday && Number.isFinite(sleepDuration) && sleepDuration > 0) {
        todaySleepCount += 1;
        todaySleepDurationTotal += sleepDuration;
      }
    }
  });
  statFeedTodayEl.textContent = String(todayFeedEventCount);
  if (statFeed24hEl) {
    statFeed24hEl.textContent = String(feedCount24h);
  }
  if (statNappyTodayEl) {
    statNappyTodayEl.textContent = String(todayWeeCount + todayPooCount);
  }
  if (statNappy24hEl) {
    statNappy24hEl.textContent = String(weeCount24h + pooCount24h);
  }
  if (statNappyBreakdownTodayEl) {
    statNappyBreakdownTodayEl.textContent = `Wet ${todayWeeCount} · Soiled ${todayPooCount}`;
  }
  if (statNappyBreakdown24hEl) {
    statNappyBreakdown24hEl.textContent = `Wet ${weeCount24h} · Soiled ${pooCount24h}`;
  }
  if (statDailyFeedTotalEl) {
    statDailyFeedTotalEl.textContent = formatMl(todayFeedTotalMl);
  }
  if (statDailyFeedSubEl) {
    statDailyFeedSubEl.textContent = `Midnight-midnight · Avg / feed: ${formatAverageMl(todayFeedTotalMl, todayFeedCount)}`;
  }
  if (homeSleepDurationEl) {
    homeSleepDurationEl.textContent = formatDurationMinutes(
      todaySleepSplit.dayMinutes + todaySleepSplit.nightMinutes,
    );
  }
  if (homeSleepDurationAvgEl) {
    homeSleepDurationAvgEl.textContent = `Avg / sleep: ${formatAverageDuration(
      todaySleepDurationTotal,
      todaySleepCount,
    )}`;
  }
  if (homeSleepDayNightEl) {
    homeSleepDayNightEl.textContent = `Day ${formatDurationMinutes(todaySleepSplit.dayMinutes)} · Night ${formatDurationMinutes(todaySleepSplit.nightMinutes)}`;
  }
  renderNextNapEstimate(sleepEntries);
  recentFeedVolumeEntries = feedVolumeEntries.sort((a, b) => a.ts - b.ts);
  latestFeedTotalsMl = {
    today: todayFeedTotalMl,
    rolling24h: feedTotal24hMl,
  };
  if (statFeedMlTodayEl) {
    statFeedMlTodayEl.textContent = formatMl(todayFeedTotalMl);
  }
  if (statFeedMl24hEl) {
    statFeedMl24hEl.textContent = formatMl(feedTotal24hMl);
  }
  if (statFeedBreakdownTodayEl) {
    statFeedBreakdownTodayEl.textContent = `Expressed ${formatMl(todayExpressedTotalMl)} · Formula ${formatMl(todayFormulaTotalMl)}`;
  }
  if (statFeedBreakdown24hEl) {
    statFeedBreakdown24hEl.textContent = `Expressed ${formatMl(expressedTotal24hMl)} · Formula ${formatMl(formulaTotal24hMl)}`;
  }
}

function renderGoalComparison() {
  if (!statGoalProgressTodayEl || !statGoalDetailTodayEl) {
    return;
  }
  if (!state.activeFeedingGoal) {
    statGoalProgressTodayEl.textContent = "--";
    statGoalDetailTodayEl.textContent = "Set a 24h goal";
    if (statGoalProgress24hEl) {
      statGoalProgress24hEl.textContent = "--";
    }
    if (statGoalDetail24hEl) {
      statGoalDetail24hEl.textContent = "Set a 24h goal";
    }
    return;
  }
  const goalValue = Number.parseFloat(state.activeFeedingGoal.goal_ml);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    statGoalProgressTodayEl.textContent = "--";
    statGoalDetailTodayEl.textContent = "Set a 24h goal";
    if (statGoalProgress24hEl) {
      statGoalProgress24hEl.textContent = "--";
    }
    if (statGoalDetail24hEl) {
      statGoalDetail24hEl.textContent = "Set a 24h goal";
    }
    return;
  }
  const todayPercent = Math.round((latestFeedTotalsMl.today / goalValue) * 100);
  const rollingPercent = Math.round((latestFeedTotalsMl.rolling24h / goalValue) * 100);
  statGoalProgressTodayEl.textContent = `${todayPercent}%`;
  statGoalDetailTodayEl.textContent = `${formatMl(latestFeedTotalsMl.today)} / ${formatMl(goalValue)}`;
  if (statGoalProgress24hEl) {
    statGoalProgress24hEl.textContent = `${rollingPercent}%`;
  }
  if (statGoalDetail24hEl) {
    statGoalDetail24hEl.textContent = `${formatMl(latestFeedTotalsMl.rolling24h)} / ${formatMl(goalValue)}`;
  }
}

function renderStatsWindow(windowBounds) {
  if (!statWindowEl) {
    return;
  }
  statWindowEl.textContent = `Today so far: ${formatRangeLabel(
    windowBounds.since,
    windowBounds.until,
  )} · Tap a card for 24h`;
}

function renderLastActivity(entries) {
  if (!lastActivityEl) {
    return;
  }
  if (!entries.length) {
    lastActivityEl.textContent = "Last activity: --";
    return;
  }
  const sorted = [...entries].sort((a, b) => {
    return new Date(b.timestamp_utc) - new Date(a.timestamp_utc);
  });
  const latest = sorted[0];
  lastActivityEl.textContent = `Last activity: ${formatTimestamp(latest.timestamp_utc)}`;
}

function renderLastByType(entries) {
  if (!lastFeedEl || !lastWeeEl || !lastPooEl) {
    return;
  }
  const latestByType = {
    feed: null,
    wee: null,
    poo: null,
  };
  entries.forEach((entry) => {
    if (!latestByType[entry.type]) {
      latestByType[entry.type] = entry;
      return;
    }
    const prev = new Date(latestByType[entry.type].timestamp_utc);
    const next = new Date(entry.timestamp_utc);
    if (next > prev) {
      latestByType[entry.type] = entry;
    }
  });

  if (latestByType.feed) {
    lastFeedEl.textContent = formatRelativeTime(latestByType.feed.timestamp_utc);
    lastFeedEl.dataset.timestamp = latestByType.feed.timestamp_utc;
  } else {
    lastFeedEl.textContent = "--";
    delete lastFeedEl.dataset.timestamp;
  }
  updateNextFeed();

  if (latestByType.wee) {
    lastWeeEl.textContent = formatRelativeTime(latestByType.wee.timestamp_utc);
    lastWeeEl.dataset.timestamp = latestByType.wee.timestamp_utc;
  } else {
    lastWeeEl.textContent = "--";
    delete lastWeeEl.dataset.timestamp;
  }

  if (latestByType.poo) {
    lastPooEl.textContent = formatRelativeTime(latestByType.poo.timestamp_utc);
    lastPooEl.dataset.timestamp = latestByType.poo.timestamp_utc;
  } else {
    lastPooEl.textContent = "--";
    delete lastPooEl.dataset.timestamp;
  }
}

function buildLogTypeUrl(type) {
  if (!type) {
    return buildUrl("/log");
  }
  return buildUrl(`/log/${type}`);
}

function handleStatCardNavigate(event) {
  if (!state.userValid) {
    return;
  }
  const target = event.currentTarget;
  if (!target) {
    return;
  }
  const type = target.dataset.logType;
  if (!type) {
    return;
  }
  window.location.href = buildLogTypeUrl(type);
}

function bindStatCardNavigation() {
  statCardEls.forEach((card) => {
    card.addEventListener("click", handleStatCardNavigate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleStatCardNavigate(event);
      }
    });
  });
}

function buildEntryPayload(type) {
  return {
    type,
    timestamp_utc: new Date().toISOString(),
    client_event_id: generateId(),
    user_slug: state.activeUser || null,
  };
}

async function saveEntry(payload) {
  setStatus("Saving...");
  const now = new Date().toISOString();
  const entry = {
    ...payload,
    user_slug: state.activeUser,
    created_at_utc: now,
    updated_at_utc: now,
    deleted_at_utc: null,
  };
  try {
    await upsertEntryLocal(entry);
    await enqueueOutbox({ action: "upsert", entry });
    if (!navigator.onLine) {
      setStatus("Saved offline");
    } else {
      setStatus("Saved (syncing...)");
      await syncNow();
    }
    if (pageType === "log") {
      await loadLogEntries();
    } else {
      await loadHomeEntries();
    }
  } catch (err) {
    try {
      const response = await fetch(buildUrl(`/api/users/${state.activeUser}/entries`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 409) {
        setStatus("Already saved (duplicate tap)");
      } else if (!response.ok) {
        let detail = "";
        try {
          const errBody = await response.json();
          detail = errBody.error || JSON.stringify(errBody);
        } catch (parseError) {
          detail = await response.text();
        }
        setStatus(`Error: ${detail || response.status}`);
        return;
      } else {
        setStatus("Saved");
      }
      if (pageType === "log") {
        await loadLogEntries();
      } else {
        await loadHomeEntries();
      }
    } catch (networkErr) {
      setStatus("Error: network issue saving entry");
    }
  }
}

async function addEntry(type) {
  const payload = buildEntryPayload(type);
  if (type === "feed") {
    const minutesInput = window.prompt("Feed duration (minutes or h/m)", "");
    if (minutesInput === null) {
      setStatus("");
      return;
    }
    const parsedDuration = parseDurationMinutesText(minutesInput);
    if (!parsedDuration.valid) {
      setStatus("Duration must be minutes or h/m (for example: 90, 1h 30m, or 1:30)");
      return;
    }
    if (parsedDuration.hasValue) {
      payload.feed_duration_min = parsedDuration.value;
    }
  } else if (isMilkExpressType(type)) {
    const expressedInput = window.prompt("Expressed amount (ml)", "");
    if (expressedInput === null) {
      setStatus("");
      return;
    }
    const trimmedExpressed = expressedInput.trim();
    if (trimmedExpressed !== "") {
      const amount = Number.parseFloat(trimmedExpressed);
      if (!Number.isFinite(amount) || amount < 0) {
        setStatus("Amount must be a non-negative number");
        return;
      }
      payload.expressed_ml = amount;
    }
    const durationInput = window.prompt("Duration (minutes or h/m)", "");
    if (durationInput === null) {
      setStatus("");
      return;
    }
    const parsedDuration = parseDurationMinutesText(durationInput);
    if (!parsedDuration.valid) {
      setStatus("Duration must be minutes or h/m (for example: 90, 1h 30m, or 1:30)");
      return;
    }
    if (parsedDuration.hasValue) {
      payload.feed_duration_min = parsedDuration.value;
    }
  }
  if (type !== "wee" && type !== "poo") {
    const noteInput = window.prompt("Comment (optional)", "");
    if (noteInput === null) {
      setStatus("");
      return;
    }
    const trimmedNote = noteInput.trim();
    if (trimmedNote) {
      payload.notes = trimmedNote;
    }
  }
  await saveEntry(payload);
}

function parseMlInput(inputEl, label) {
  if (!inputEl) {
    return null;
  }
  const trimmed = inputEl.value.trim();
  if (!trimmed) {
    setStatus(`Enter ${label} amount.`);
    inputEl.focus();
    return null;
  }
  const ml = Number.parseFloat(trimmed);
  if (!Number.isFinite(ml) || ml < 0) {
    setStatus("Amount must be a non-negative number");
    inputEl.focus();
    return null;
  }
  return ml;
}

function parseOptionalMlInput(inputEl, label) {
  if (!inputEl) {
    return { value: null, hasValue: false, valid: true };
  }
  const trimmed = inputEl.value.trim();
  if (!trimmed) {
    return { value: null, hasValue: false, valid: true };
  }
  const ml = Number.parseFloat(trimmed);
  if (!Number.isFinite(ml) || ml < 0) {
    setStatus(`${label} must be a non-negative number`);
    inputEl.focus();
    return { value: null, hasValue: true, valid: false };
  }
  return { value: ml, hasValue: true, valid: true };
}

function parseOptionalNumberInput(inputEl, label) {
  if (!inputEl) {
    return { value: null, hasValue: false, valid: true };
  }
  const trimmed = inputEl.value.trim();
  if (!trimmed) {
    return { value: null, hasValue: false, valid: true };
  }
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    setStatus(`${label} must be a non-negative number`);
    inputEl.focus();
    return { value: null, hasValue: true, valid: false };
  }
  return { value: amount, hasValue: true, valid: true };
}

function parseDurationMinutesText(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toLowerCase()
    .replace(/\band\b/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) {
    return { valid: true, hasValue: false, value: null };
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const minutes = Number.parseFloat(normalized);
    return { valid: true, hasValue: true, value: minutes };
  }

  const colonMatch = normalized.match(/^(\d+)\s*:\s*([0-5]?\d)$/);
  if (colonMatch) {
    const hours = Number.parseInt(colonMatch[1], 10);
    const minutes = Number.parseInt(colonMatch[2], 10);
    return { valid: true, hasValue: true, value: hours * 60 + minutes };
  }

  const segmentPattern = /(\d+(?:\.\d+)?)\s*(h(?:ours?)?|hr|hrs|m(?:in(?:ute)?s?)?)\b/g;
  let totalMinutes = 0;
  let lastIndex = 0;
  let matchedAny = false;
  let match = segmentPattern.exec(normalized);
  while (match) {
    const between = normalized.slice(lastIndex, match.index).trim();
    if (between) {
      return { valid: false, hasValue: true, value: null };
    }
    const amount = Number.parseFloat(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount < 0) {
      return { valid: false, hasValue: true, value: null };
    }
    if (unit.startsWith("h")) {
      totalMinutes += amount * 60;
    } else {
      totalMinutes += amount;
    }
    matchedAny = true;
    lastIndex = segmentPattern.lastIndex;
    match = segmentPattern.exec(normalized);
  }
  if (matchedAny && !normalized.slice(lastIndex).trim()) {
    return { valid: true, hasValue: true, value: totalMinutes };
  }
  return { valid: false, hasValue: true, value: null };
}

function parseOptionalDurationInput(inputEl, label) {
  if (!inputEl) {
    return { value: null, hasValue: false, valid: true };
  }
  const parsed = parseDurationMinutesText(inputEl.value);
  if (!parsed.valid) {
    setStatus(`${label} must be minutes or h/m (for example: 90, 1h 30m, or 1:30)`);
    inputEl.focus();
    return { value: null, hasValue: true, valid: false };
  }
  return { value: parsed.value, hasValue: parsed.hasValue, valid: true };
}

async function getBreastfeedEntryForUpdate(startInfo) {
  if (startInfo && startInfo.clientEventId) {
    const localEntry = await getEntryLocal(startInfo.clientEventId);
    if (localEntry) {
      return localEntry;
    }
  }
  const start = startInfo && startInfo.start ? startInfo.start : new Date();
  const startIso = start.toISOString();
  return {
    client_event_id: startInfo && startInfo.clientEventId
      ? startInfo.clientEventId
      : generateId(),
    user_slug: (startInfo && startInfo.startedBy) || state.activeUser || null,
    type: "feed",
    timestamp_utc: startIso,
    notes: BREASTFEED_IN_PROGRESS_NOTE,
    amount_ml: null,
    expressed_ml: null,
    formula_ml: null,
    feed_duration_min: null,
    caregiver_id: null,
    created_at_utc: startIso,
    updated_at_utc: startIso,
    deleted_at_utc: null,
  };
}

async function getTimedEventEntryForUpdate(startInfo) {
  if (startInfo && startInfo.clientEventId) {
    const localEntry = await getEntryLocal(startInfo.clientEventId);
    if (localEntry) {
      return localEntry;
    }
  }
  const start = startInfo && startInfo.start ? startInfo.start : new Date();
  const startIso = start.toISOString();
  const eventType = normalizeEntryType(startInfo && startInfo.type ? startInfo.type : TIMED_EVENT_TYPES[0]);
  return {
    client_event_id: startInfo && startInfo.clientEventId
      ? startInfo.clientEventId
      : generateId(),
    user_slug: (startInfo && startInfo.startedBy) || state.activeUser || null,
    type: eventType,
    timestamp_utc: startIso,
    notes: null,
    amount_ml: null,
    expressed_ml: null,
    formula_ml: null,
    feed_duration_min: null,
    caregiver_id: null,
    created_at_utc: startIso,
    updated_at_utc: startIso,
    deleted_at_utc: null,
  };
}

async function handleBreastfeedToggle() {
  if (!state.userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const startInfo = getBreastfeedStart();
  if (!startInfo) {
    const start = new Date();
    const payload = buildEntryPayload("feed");
    payload.timestamp_utc = start.toISOString();
    payload.notes = BREASTFEED_IN_PROGRESS_NOTE;
    payload.feed_duration_min = null;
    setBreastfeedStart(start, state.activeUser || null, payload.client_event_id);
    updateBreastfeedButton();
    closeFeedMenu();
    setStatus("Breastfeed started");
    await saveEntry(payload);
    return;
  }
  const now = new Date();
  const durationMinutes = Math.max(0, Math.round((now - startInfo.start) / 60000));
  const entry = await getBreastfeedEntryForUpdate(startInfo);
  clearBreastfeedStart();
  updateBreastfeedButton();
  closeFeedMenu();
  await commitEntryUpdate(entry, {
    feed_duration_min: durationMinutes,
    notes: BREASTFEED_COMPLETE_NOTE,
  }, {
    online: "Breastfeed ended (syncing...)",
    offline: "Breastfeed ended offline",
    error: "Error: unable to end breastfeeding",
  });
}

async function handleTimedEventToggle(selectedType) {
  if (!state.userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const normalizedType = normalizeEntryType(selectedType);
  if (!TIMED_EVENT_TYPES.includes(normalizedType)) {
    setStatus("Choose a timed event type.");
    return;
  }
  const startInfo = getTimedEventStart();
  if (!startInfo) {
    const start = new Date();
    const payload = buildEntryPayload(normalizedType);
    payload.timestamp_utc = start.toISOString();
    payload.feed_duration_min = null;
    setTimedEventStart(start, normalizedType, state.activeUser || null, payload.client_event_id);
    updateMiscTimedEventControls();
    closeMiscMenu();
    setStatus(`${formatEntryTypeLabel(normalizedType)} started`);
    await saveEntry(payload);
    return;
  }

  const now = new Date();
  const durationMinutes = Math.max(0, Math.round((now - startInfo.start) / 60000));
  const entry = await getTimedEventEntryForUpdate(startInfo);
  clearTimedEventStart();
  updateMiscTimedEventControls();
  closeMiscMenu();
  const label = formatEntryTypeLabel(startInfo.type);
  await commitEntryUpdate(entry, {
    type: startInfo.type,
    feed_duration_min: durationMinutes,
  }, {
    online: `${label} ended (syncing...)`,
    offline: `${label} ended offline`,
    error: `Error: unable to end ${label.toLowerCase()}`,
  });
}

async function handleMlEntry(inputEl, label) {
  if (!state.userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const ml = parseMlInput(inputEl, label);
  if (ml === null) {
    return;
  }
  const payload = buildEntryPayload("feed");
  if (label === "Expressed") {
    payload.expressed_ml = ml;
  } else if (label === "Formula") {
    payload.formula_ml = ml;
  } else {
    payload.amount_ml = ml;
  }
  if (inputEl) {
    inputEl.value = "";
  }
  closeFeedMenu();
  await saveEntry(payload);
}

function isEditEntryModalAvailable() {
  return Boolean(editEntryModalEl && editEntryFormEl && editEntryTimeEl);
}

function renderEditEntryTypeOptions(currentType) {
  if (!editEntryTypeEl) {
    return;
  }
  const normalizedCurrent = String(currentType || "").trim().toLowerCase();
  const baseOptions = ["feed", "wee", "poo", "milk express", ...TIMED_EVENT_TYPES];
  const options = [...new Set([...baseOptions, ...state.customEventTypes])].filter(Boolean);
  if (normalizedCurrent && !options.includes(normalizedCurrent)) {
    options.push(normalizedCurrent);
  }
  editEntryTypeEl.innerHTML = "";
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    editEntryTypeEl.appendChild(option);
  });
  if (normalizedCurrent) {
    editEntryTypeEl.value = normalizedCurrent;
  }
}

function updateEditEntryFieldVisibility(type) {
  if (!editEntryModalEl) {
    return;
  }
  const normalized = String(type || "").trim().toLowerCase();
  const isFeed = normalized === "feed";
  const isExpress = isMilkExpressType(normalized);
  const numbersWrap = editEntryModalEl.querySelector(".edit-field--numbers");
  if (numbersWrap) {
    numbersWrap.style.display = "grid";
  }
  const durationField = editEntryDurationEl ? editEntryDurationEl.closest(".edit-field") : null;
  const expressedField = editEntryExpressedEl ? editEntryExpressedEl.closest(".edit-field") : null;
  const formulaField = editEntryFormulaEl ? editEntryFormulaEl.closest(".edit-field") : null;
  if (durationField) {
    durationField.style.display = "grid";
  }
  if (expressedField) {
    expressedField.style.display = isFeed || isExpress ? "grid" : "none";
  }
  if (formulaField) {
    formulaField.style.display = isFeed ? "grid" : "none";
  }
}

function closeEditEntryModal(result = null) {
  if (editEntryModalEl) {
    editEntryModalEl.hidden = true;
    editEntryModalEl.setAttribute("aria-hidden", "true");
    editEntryModalEl.classList.remove("is-time-only");
  }
  if (editEntryBackdropEl) {
    editEntryBackdropEl.hidden = true;
    editEntryBackdropEl.classList.remove("open");
  }
  const resolver = editEntryModalResolver;
  editEntryModalResolver = null;
  editEntryModalEntry = null;
  editEntryModalMode = "full";
  if (resolver) {
    resolver(result);
  }
}

function initEditEntryModalHandlers() {
  if (editEntryModalInitialized || !isEditEntryModalAvailable()) {
    return;
  }
  editEntryModalInitialized = true;
  if (editEntryTypeEl) {
    editEntryTypeEl.addEventListener("change", () => {
      updateEditEntryFieldVisibility(editEntryTypeEl.value);
    });
  }
  if (editEntryFormEl) {
    editEntryFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!editEntryModalEntry) {
        closeEditEntryModal(null);
        return;
      }
      const nextTime = editEntryTimeEl ? editEntryTimeEl.value : "";
      if (!nextTime) {
        setStatus("Timestamp is required");
        editEntryTimeEl?.focus();
        return;
      }
      const nextDate = new Date(nextTime);
      if (Number.isNaN(nextDate.getTime())) {
        setStatus("Invalid timestamp");
        editEntryTimeEl?.focus();
        return;
      }
      if (editEntryModalMode === "time") {
        closeEditEntryModal({ timestamp_utc: nextDate.toISOString() });
        return;
      }
      const rawType = editEntryTypeEl ? editEntryTypeEl.value : editEntryModalEntry.type;
      const nextType = String(rawType || "").trim().toLowerCase();
      if (!nextType) {
        setStatus("Type is required");
        editEntryTypeEl?.focus();
        return;
      }
      const payload = { type: nextType, timestamp_utc: nextDate.toISOString() };
      const duration = parseOptionalDurationInput(editEntryDurationEl, "Duration");
      if (!duration.valid) {
        return;
      }
      payload.feed_duration_min = duration.hasValue ? duration.value : null;
      if (nextType === "feed") {
        const expressed = parseOptionalNumberInput(editEntryExpressedEl, "Expressed amount");
        if (!expressed.valid) {
          return;
        }
        payload.expressed_ml = expressed.hasValue ? expressed.value : null;

        const formula = parseOptionalNumberInput(editEntryFormulaEl, "Formula amount");
        if (!formula.valid) {
          return;
        }
        payload.formula_ml = formula.hasValue ? formula.value : null;
      } else if (isMilkExpressType(nextType)) {
        const expressed = parseOptionalNumberInput(editEntryExpressedEl, "Expressed amount");
        if (!expressed.valid) {
          return;
        }
        payload.expressed_ml = expressed.hasValue ? expressed.value : null;

        const duration = parseOptionalDurationInput(editEntryDurationEl, "Duration");
        if (!duration.valid) {
          return;
        }
        payload.feed_duration_min = duration.hasValue ? duration.value : null;

        if (editEntryModalEntry.formula_ml !== null && editEntryModalEntry.formula_ml !== undefined) {
          payload.formula_ml = null;
        }
        if (editEntryModalEntry.amount_ml !== null && editEntryModalEntry.amount_ml !== undefined) {
          payload.amount_ml = null;
        }
      }
      if (nextType !== "feed" && !isMilkExpressType(nextType)) {
        if (editEntryModalEntry.expressed_ml !== null && editEntryModalEntry.expressed_ml !== undefined) {
          payload.expressed_ml = null;
        }
        if (editEntryModalEntry.formula_ml !== null && editEntryModalEntry.formula_ml !== undefined) {
          payload.formula_ml = null;
        }
      }
      const noteValue = editEntryNotesEl ? editEntryNotesEl.value.trim() : "";
      payload.notes = noteValue ? noteValue : null;
      closeEditEntryModal(payload);
    });
  }
  if (editEntryCancelEl) {
    editEntryCancelEl.addEventListener("click", () => closeEditEntryModal(null));
  }
  if (editEntryCloseEl) {
    editEntryCloseEl.addEventListener("click", () => closeEditEntryModal(null));
  }
  if (editEntryBackdropEl) {
    editEntryBackdropEl.addEventListener("click", () => closeEditEntryModal(null));
  }
  if (editEntryModalEl) {
    editEntryModalEl.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeEditEntryModal(null);
      }
    });
  }
}

function openEditEntryModal(entry, mode = "full") {
  if (!isEditEntryModalAvailable()) {
    return Promise.resolve(null);
  }
  initEditEntryModalHandlers();
  editEntryModalEntry = entry;
  editEntryModalMode = mode;
  if (editEntryModalEl) {
    editEntryModalEl.hidden = false;
    editEntryModalEl.setAttribute("aria-hidden", "false");
    editEntryModalEl.classList.toggle("is-time-only", mode === "time");
  }
  if (editEntryBackdropEl) {
    editEntryBackdropEl.hidden = false;
    editEntryBackdropEl.classList.add("open");
  }
  renderEditEntryTypeOptions(entry.type);
  if (editEntryTimeEl) {
    editEntryTimeEl.value = toLocalDateTimeValue(entry.timestamp_utc);
  }
  if (editEntryDurationEl) {
    editEntryDurationEl.value = entry.feed_duration_min !== null && entry.feed_duration_min !== undefined
      ? formatDurationMinutes(entry.feed_duration_min)
      : "";
  }
  if (editEntryExpressedEl) {
    const fallback = getMilkExpressAmounts(entry);
    editEntryExpressedEl.value = entry.expressed_ml !== null && entry.expressed_ml !== undefined
      ? String(entry.expressed_ml)
      : (Number.isFinite(fallback.ml) && fallback.ml > 0 ? String(fallback.ml) : "");
  }
  if (editEntryFormulaEl) {
    editEntryFormulaEl.value = entry.formula_ml !== null && entry.formula_ml !== undefined
      ? String(entry.formula_ml)
      : "";
  }
  if (editEntryNotesEl) {
    editEntryNotesEl.value = entry.notes ?? "";
  }
  updateEditEntryFieldVisibility(entry.type);
  editEntryTimeEl?.focus();
  return new Promise((resolve) => {
    editEntryModalResolver = resolve;
  });
}

async function commitEntryUpdate(entry, payload, messages) {
  try {
    const updated = {
      ...entry,
      ...payload,
      updated_at_utc: new Date().toISOString(),
    };
    await upsertEntryLocal(updated);
    await enqueueOutbox({ action: "upsert", entry: updated });
    if (!navigator.onLine) {
      setStatus(messages.offline);
    } else {
      setStatus(messages.online);
      await syncNow();
    }
    await refreshEntriesForCurrentPage();
  } catch (err) {
    setStatus(messages.error);
  }
}

async function editEntry(entry) {
  if (isEditEntryModalAvailable()) {
    const payload = await openEditEntryModal(entry, "full");
    if (!payload) {
      return;
    }
    await commitEntryUpdate(entry, payload, {
      online: "Updated (syncing...)",
      offline: "Updated offline",
      error: "Error: unable to update entry",
    });
    return;
  }
  const rawType = window.prompt("Type", entry.type);
  if (!rawType) {
    return;
  }
  const nextType = rawType.trim().toLowerCase();
  if (!nextType) {
    return;
  }
  const nextTime = window.prompt(
    "Timestamp (ISO 8601)",
    entry.timestamp_utc,
  );
  if (!nextTime) {
    return;
  }
  const payload = { type: nextType, timestamp_utc: nextTime };
  const currentDuration =
    entry.feed_duration_min !== null && entry.feed_duration_min !== undefined
      ? formatDurationMinutes(entry.feed_duration_min)
      : "";
  const durationInput = window.prompt("Duration (minutes or h/m)", currentDuration);
  if (durationInput === null) {
    return;
  }
  const parsedDuration = parseDurationMinutesText(durationInput);
  if (!parsedDuration.valid) {
    setStatus("Duration must be minutes or h/m (for example: 90, 1h 30m, or 1:30)");
    return;
  }
  if (!parsedDuration.hasValue) {
    payload.feed_duration_min = null;
  } else {
    payload.feed_duration_min = parsedDuration.value;
  }
  if (nextType === "feed") {
    const currentExpressed =
      entry.expressed_ml !== null && entry.expressed_ml !== undefined
        ? String(entry.expressed_ml)
        : "";
    const expressedInput = window.prompt("Expressed amount (ml)", currentExpressed);
    if (expressedInput === null) {
      return;
    }
    const trimmedExpressed = expressedInput.trim();
    if (trimmedExpressed === "") {
      payload.expressed_ml = null;
    } else {
      const amount = Number.parseFloat(trimmedExpressed);
      if (!Number.isFinite(amount) || amount < 0) {
        setStatus("Amount must be a non-negative number");
        return;
      }
      payload.expressed_ml = amount;
    }
    const currentFormula =
      entry.formula_ml !== null && entry.formula_ml !== undefined
        ? String(entry.formula_ml)
        : "";
    const formulaInput = window.prompt("Formula amount (ml)", currentFormula);
    if (formulaInput === null) {
      return;
    }
    const trimmedFormula = formulaInput.trim();
    if (trimmedFormula === "") {
      payload.formula_ml = null;
    } else {
      const amount = Number.parseFloat(trimmedFormula);
      if (!Number.isFinite(amount) || amount < 0) {
        setStatus("Amount must be a non-negative number");
        return;
      }
      payload.formula_ml = amount;
    }
  } else if (isMilkExpressType(nextType)) {
    const fallback = getMilkExpressAmounts(entry);
    const currentExpressed =
      entry.expressed_ml !== null && entry.expressed_ml !== undefined
        ? String(entry.expressed_ml)
        : (Number.isFinite(fallback.ml) && fallback.ml > 0 ? String(fallback.ml) : "");
    const expressedInput = window.prompt("Expressed amount (ml)", currentExpressed);
    if (expressedInput === null) {
      return;
    }
    const trimmedExpressed = expressedInput.trim();
    if (trimmedExpressed === "") {
      payload.expressed_ml = null;
    } else {
      const amount = Number.parseFloat(trimmedExpressed);
      if (!Number.isFinite(amount) || amount < 0) {
        setStatus("Amount must be a non-negative number");
        return;
      }
      payload.expressed_ml = amount;
    }
    if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
      payload.formula_ml = null;
    }
    if (entry.amount_ml !== null && entry.amount_ml !== undefined) {
      payload.amount_ml = null;
    }
  }
  if (nextType !== "feed" && !isMilkExpressType(nextType)) {
    if (entry.expressed_ml !== null && entry.expressed_ml !== undefined) {
      payload.expressed_ml = null;
    }
    if (entry.formula_ml !== null && entry.formula_ml !== undefined) {
      payload.formula_ml = null;
    }
  }
  const currentNote = entry.notes ?? "";
  const noteInput = window.prompt("Comment (optional)", String(currentNote));
  if (noteInput === null) {
    return;
  }
  const trimmedNote = noteInput.trim();
  payload.notes = trimmedNote ? trimmedNote : null;

  await commitEntryUpdate(entry, payload, {
    online: "Updated (syncing...)",
    offline: "Updated offline",
    error: "Error: unable to update entry",
  });
}

async function editEntryTime(entry) {
  if (isEditEntryModalAvailable()) {
    const payload = await openEditEntryModal(entry, "time");
    if (!payload) {
      return;
    }
    await commitEntryUpdate(entry, payload, {
      online: "Updated time (syncing...)",
      offline: "Updated time offline",
      error: "Error: unable to update time",
    });
    return;
  }
  const current = toLocalDateTimeValue(entry.timestamp_utc);
  const nextValue = window.prompt("Timestamp (YYYY-MM-DDTHH:MM)", current);
  if (!nextValue) {
    return;
  }
  const nextDate = new Date(nextValue);
  if (Number.isNaN(nextDate.getTime())) {
    setStatus("Invalid timestamp");
    return;
  }

  await commitEntryUpdate(entry, { timestamp_utc: nextDate.toISOString() }, {
    online: "Updated time (syncing...)",
    offline: "Updated time offline",
    error: "Error: unable to update time",
  });
}

async function deleteEntry(entry) {
  if (!window.confirm("Delete this entry?")) {
    return;
  }
  try {
    const deletedAt = new Date().toISOString();
    const updated = {
      ...entry,
      deleted_at_utc: deletedAt,
      updated_at_utc: deletedAt,
    };
    await upsertEntryLocal(updated);
    await enqueueOutbox({ action: "delete", client_event_id: entry.client_event_id });
    if (!navigator.onLine) {
      setStatus("Deleted offline");
    } else {
      setStatus("Deleted (syncing...)");
      await syncNow();
    }
    await refreshEntriesForCurrentPage();
  } catch (err) {
    setStatus("Error: unable to delete entry");
  }
}

async function loadHomeEntries() {
  const shouldShowLoading = !hasLoadedHomeEntries;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  try {
    const statsWindow = computeWindow(24);
    const now = new Date();
    const todayWindow = {
      since: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      until: now,
    };
    const homeSleepTrendWindow = {
      since: new Date(todayWindow.since),
      until: now,
    };
    homeSleepTrendWindow.since.setDate(homeSleepTrendWindow.since.getDate() - 7);
    homeSleepTrendWindow.sinceIso = homeSleepTrendWindow.since.toISOString();
    homeSleepTrendWindow.untilIso = homeSleepTrendWindow.until.toISOString();
    const homeFeedVolumeSince = new Date(todayWindow.since);
    homeFeedVolumeSince.setDate(homeFeedVolumeSince.getDate() - 6);
    const homeFeedVolumeWindow = {
      sinceIso: homeFeedVolumeSince.toISOString(),
      untilIso: homeSleepTrendWindow.untilIso,
    };
    const chartUntil = new Date(now);
    const chartWindow = createWindow(
      new Date(chartUntil.getTime() - HOME_CHART_TOTAL_HOURS * 60 * 60 * 1000),
      chartUntil,
    );
    const chartWindows = buildChartWindows(HOME_CHART_TOTAL_HOURS, HOME_CHART_CHUNK_HOURS, chartUntil);
    const chartFetchWindow = createWindow(
      new Date(chartWindow.since.getTime() - HOME_CHART_CHUNK_HOURS * 60 * 60 * 1000),
      chartWindow.until,
    );
    const cachedEntries = await listEntriesLocalSafe({
      limit: 200,
      since: statsWindow.sinceIso,
      until: statsWindow.untilIso,
    });
    const cachedChartSourceEntries = await listEntriesLocalSafe({
      limit: 400,
      since: chartFetchWindow.sinceIso,
      until: chartFetchWindow.untilIso,
    });
    const cachedSleepTrendEntries = await listEntriesLocalSafe({
      limit: 500,
      since: homeSleepTrendWindow.sinceIso,
      until: homeSleepTrendWindow.untilIso,
    });
    const cachedFeedVolumeEntries = await listEntriesLocalSafe({
      limit: 500,
      type: "feed",
      since: homeFeedVolumeWindow.sinceIso,
      until: homeFeedVolumeWindow.untilIso,
    });
    if (cachedEntries) {
      const cachedChartEntries = (cachedChartSourceEntries || cachedEntries).filter(
        (entry) => entryOverlapsChartWindow(entry, chartWindow),
      );
      renderChart(cachedChartEntries, chartWindows);
      renderStats(cachedEntries, { sleepEntries: cachedSleepTrendEntries || cachedEntries });
      renderGoalComparison();
      renderStatsWindow(todayWindow);
      renderLastActivity(cachedEntries);
      renderLastByType(cachedEntries);
      renderLatestEntry(cachedEntries[0] || null);
      renderHomeSleepTrendChart(cachedSleepTrendEntries || cachedEntries);
      renderHomeFeedVolumeChart(cachedFeedVolumeEntries || []);
    } else {
      renderChart([], chartWindows);
      renderLatestEntry(null);
      renderHomeSleepTrendChart(cachedSleepTrendEntries || []);
      renderHomeFeedVolumeChart(cachedFeedVolumeEntries || []);
    }

    void syncNow();

    const [entries, chartSourceEntries, currentGoal, sleepTrendEntries, feedVolumeEntries, nappyStock] = await Promise.all([
      loadEntriesWithFallback({
        limit: 200,
        since: statsWindow.sinceIso,
        until: statsWindow.untilIso,
      }),
      loadEntriesWithFallback({
        limit: 400,
        since: chartFetchWindow.sinceIso,
        until: chartFetchWindow.untilIso,
      }),
      loadCurrentGoal(),
      loadEntriesWithFallback({
        limit: 500,
        since: homeSleepTrendWindow.sinceIso,
        until: homeSleepTrendWindow.untilIso,
      }),
      loadEntriesWithFallback({
        limit: 500,
        type: "feed",
        since: homeFeedVolumeWindow.sinceIso,
        until: homeFeedVolumeWindow.untilIso,
      }),
      fetchNappyStockStatus(),
    ]);
    state.activeFeedingGoal = currentGoal;
    const chartEntries = chartSourceEntries.filter((entry) => entryOverlapsChartWindow(entry, chartWindow));
    renderChart(chartEntries, chartWindows);
    renderStats(entries, { sleepEntries: sleepTrendEntries });
    renderGoalComparison();
    renderStatsWindow(todayWindow);
    renderLastActivity(entries);
    renderLastByType(entries);
    renderLatestEntry(entries[0] || null);
    renderHomeSleepTrendChart(sleepTrendEntries);
    renderHomeFeedVolumeChart(feedVolumeEntries);
    renderHomeNappyStock(nappyStock);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  } finally {
    if (shouldShowLoading) {
      setLoadingState(false);
    }
    hasLoadedHomeEntries = true;
  }
}

async function fetchNappyStockStatus() {
  if (!homeNappyStockRemainingEl || !homeNappyStockDetailEl) {
    return null;
  }
  try {
    const response = await fetch(buildUrl("/api/nappy-stock?history_limit=0"));
    if (!response.ok) {
      return { loadError: true };
    }
    return response.json();
  } catch (error) {
    return { loadError: true };
  }
}

function renderHomeNappyStock(status) {
  if (!homeNappyStockRemainingEl || !homeNappyStockDetailEl) {
    return;
  }
  if (status && status.loadError) {
    homeNappyStockRemainingEl.textContent = "--";
    homeNappyStockDetailEl.textContent = "Stock unavailable";
    return;
  }
  const configured = Boolean(status && status.configured);
  homeNappyStockSummaryEl?.classList.toggle("is-low", configured && status.is_below_threshold);
  if (!configured) {
    homeNappyStockRemainingEl.textContent = "Not set";
    homeNappyStockDetailEl.textContent = "Add stock to start tracking";
    return;
  }
  homeNappyStockRemainingEl.textContent = String(status.remaining_count ?? 0);
  const threshold = `Low at ${status.threshold_count ?? 0}`;
  const rate = Number(status.average_per_day);
  const days = Number(status.days_until_empty);
  const forecast = Number.isFinite(days)
    ? ` · ~${days < 1 ? "today" : `${days.toFixed(days >= 10 ? 0 : 1)} days`} left`
    : Number.isFinite(rate) && rate > 0
      ? ` · ${rate.toFixed(rate >= 10 ? 0 : 1)}/day`
      : "";
  homeNappyStockDetailEl.textContent = `${status.is_below_threshold ? "Low stock" : threshold}${forecast}`;
}

async function loadSummaryEntries() {
  const shouldShowLoading = !hasLoadedSummaryEntries;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  try {
    if (!summaryDate) {
      setSummaryDate(new Date());
    }
    const ganttWindow = getSummaryGanttWindow(summaryDate);
    const dayWindow = {
      sinceIso: ganttWindow.sinceIso,
      untilIso: ganttWindow.untilIso,
    };
    const trendWindow = {
      since: new Date(ganttWindow.since),
      until: ganttWindow.until,
    };
    trendWindow.since.setDate(trendWindow.since.getDate() - 8);
    trendWindow.sinceIso = trendWindow.since.toISOString();
    trendWindow.untilIso = trendWindow.until.toISOString();
    const cachedEntries = await listEntriesLocalSafe({
      limit: 200,
      since: dayWindow.sinceIso,
      until: dayWindow.untilIso,
    });
    const cachedGanttEntries = await listEntriesLocalSafe({
      limit: 400,
      since: ganttWindow.lookbackSinceIso,
      until: ganttWindow.untilIso,
    });
    const cachedTrendEntries = await listEntriesLocalSafe({
      limit: 500,
      since: trendWindow.sinceIso,
      until: trendWindow.untilIso,
    });
    const cachedWeightEntries = await listEntriesLocalSafe({
      limit: 500,
      type: "weight",
    });
    if (cachedEntries) {
      summaryEntries = cachedEntries;
      summaryGanttEntries = cachedGanttEntries || cachedEntries;
      summaryWeightEntries = cachedWeightEntries || summaryWeightEntries;
      renderSummaryStats(cachedEntries);
      renderSummaryEventList(cachedEntries);
      renderSleepGanttTypeOptions(cachedEntries);
      renderSleepGantt(summaryGanttEntries.length ? summaryGanttEntries : cachedEntries);
      renderMilkExpressSummary(cachedEntries);
      renderSleepTrendChart(cachedTrendEntries || cachedEntries);
      renderWeightPercentileSurfaces(summaryWeightEntries);
    }

    void syncNow();

    const [entries, ganttEntries, trendEntries, weightEntries] = await Promise.all([
      loadEntriesWithFallback({
        limit: 200,
        since: dayWindow.sinceIso,
        until: dayWindow.untilIso,
      }),
      loadEntriesWithFallback({
        limit: 400,
        since: ganttWindow.lookbackSinceIso,
        until: ganttWindow.untilIso,
      }),
      loadEntriesWithFallback({
        limit: 500,
        since: trendWindow.sinceIso,
        until: trendWindow.untilIso,
      }),
      loadEntriesWithFallback({
        limit: 500,
        type: "weight",
      }),
      ensureMilkExpressAllEntries(),
    ]);
    summaryEntries = entries;
    summaryGanttEntries = ganttEntries;
    summaryWeightEntries = weightEntries;
    renderSummaryStats(entries);
    renderSummaryEventList(entries);
    renderSleepGanttTypeOptions(entries);
    renderSleepGantt(ganttEntries.length ? ganttEntries : entries);
    renderMilkExpressSummary(entries);
    renderSleepTrendChart(trendEntries);
    renderWeightPercentileSurfaces(weightEntries);
    await loadSummaryInsights();
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  } finally {
    if (shouldShowLoading) {
      setLoadingState(false);
    }
    hasLoadedSummaryEntries = true;
  }
}

async function loadSummaryInsights() {
  if (pageType !== "summary") {
    return;
  }
  const { anchorEnd, anchorIso } = getInsightAnchor(summaryDate || new Date());
  const sameAnchor = summaryInsightsAnchor === anchorIso;
  if (sameAnchor && summaryInsightsEntries.length && summaryInsightsComplete) {
    renderSummaryInsights(summaryInsightsEntries, anchorEnd);
    setSummaryInsightProgressText("All-time metrics fully loaded.");
    return;
  }
  if (sameAnchor && summaryInsightsLoading) {
    return summaryInsightsLoading;
  }

  const loadToken = summaryInsightsLoadToken + 1;
  summaryInsightsLoadToken = loadToken;
  summaryInsightsAnchor = anchorIso;
  summaryInsightsComplete = false;

  const initialSince = new Date(anchorEnd);
  initialSince.setDate(initialSince.getDate() - SUMMARY_INSIGHTS_INITIAL_WINDOW_DAYS);
  let mergedEntries = mergeEntriesUnique([], summaryEntries || []);
  if (mergedEntries.length) {
    summaryInsightsEntries = mergedEntries;
    renderSummaryInsights(summaryInsightsEntries, anchorEnd);
    setSummaryInsightProgressText(buildSummaryInsightProgressText(summaryInsightsEntries, anchorEnd, false));
  } else {
    setSummaryInsightProgressText("Loading all-time metrics...");
  }

  summaryInsightsLoading = (async () => {
    const initialBatch = await fetchEntries({
      limit: SUMMARY_INSIGHTS_PAGE_LIMIT,
      since: initialSince.toISOString(),
      until: anchorIso,
    });
    if (loadToken !== summaryInsightsLoadToken) {
      return [];
    }
    mergedEntries = mergeEntriesUnique(mergedEntries, initialBatch);
    summaryInsightsEntries = mergedEntries;
    renderSummaryInsights(summaryInsightsEntries, anchorEnd);
    setSummaryInsightProgressText(buildSummaryInsightProgressText(summaryInsightsEntries, anchorEnd, false));

    let batchUntil = null;
    if (mergedEntries.length) {
      const oldest = mergedEntries[mergedEntries.length - 1];
      batchUntil = decrementIsoTimestamp(oldest.timestamp_utc);
    } else {
      batchUntil = anchorIso;
    }

    for (let page = 0; page < SUMMARY_INSIGHTS_MAX_PAGES; page += 1) {
      if (loadToken !== summaryInsightsLoadToken || !batchUntil) {
        return mergedEntries;
      }
      const batch = await fetchEntries({
        limit: SUMMARY_INSIGHTS_PAGE_LIMIT,
        until: batchUntil,
      });
      if (loadToken !== summaryInsightsLoadToken) {
        return mergedEntries;
      }
      if (!batch.length) {
        summaryInsightsComplete = true;
        break;
      }
      mergedEntries = mergeEntriesUnique(mergedEntries, batch);
      summaryInsightsEntries = mergedEntries;
      renderSummaryInsights(summaryInsightsEntries, anchorEnd);
      setSummaryInsightProgressText(buildSummaryInsightProgressText(summaryInsightsEntries, anchorEnd, false));

      if (batch.length < SUMMARY_INSIGHTS_PAGE_LIMIT) {
        summaryInsightsComplete = true;
        break;
      }
      const oldest = batch[batch.length - 1];
      if (!oldest || !oldest.timestamp_utc) {
        summaryInsightsComplete = true;
        break;
      }
      const nextBatchUntil = decrementIsoTimestamp(oldest.timestamp_utc);
      if (!nextBatchUntil || nextBatchUntil === batchUntil) {
        summaryInsightsComplete = true;
        break;
      }
      batchUntil = nextBatchUntil;
      await yieldForUi();
    }

    if (loadToken !== summaryInsightsLoadToken) {
      return mergedEntries;
    }
    setSummaryInsightProgressText(
      buildSummaryInsightProgressText(summaryInsightsEntries, anchorEnd, summaryInsightsComplete),
    );
    return mergedEntries;
  })()
    .catch((err) => {
      if (loadToken !== summaryInsightsLoadToken) {
        return [];
      }
      setStatus(`Failed to load insights: ${err.message || "unknown error"}`);
      setSummaryInsightProgressText(
        buildSummaryInsightProgressText(summaryInsightsEntries, anchorEnd, false),
      );
      return [];
    })
    .finally(() => {
      if (loadToken === summaryInsightsLoadToken) {
        summaryInsightsLoading = null;
      }
      hasLoadedSummaryInsights = true;
    });
  return summaryInsightsLoading;
}

async function ensureMilkExpressAllEntries() {
  if (milkExpressAllEntries.length) {
    return milkExpressAllEntries;
  }
  if (milkExpressAllLoading) {
    return milkExpressAllLoading;
  }
  milkExpressAllLoading = loadEntriesWithFallback({ limit: 200 })
    .then((entries) => {
      const filtered = entries.filter((entry) => isMilkExpressType(entry.type));
      milkExpressAllEntries = filtered;
      return filtered;
    })
    .catch((err) => {
      setStatus(`Failed to load milk express history: ${err.message || "unknown error"}`);
      milkExpressAllEntries = [];
      return [];
    })
    .finally(() => {
      milkExpressAllLoading = null;
    });
  return milkExpressAllLoading;
}

async function loadLogEntries() {
  const shouldShowLoading = !hasLoadedLogEntries;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  try {
    const params = { limit: 200 };
    if (Number.isFinite(logWindowHours)) {
      const window = computeWindow(logWindowHours);
      params.since = window.sinceIso;
      params.until = window.untilIso;
    }
    if (logFilterType) {
      params.type = logFilterType;
    }
    const cachedEntries = await listEntriesLocalSafe(params);
    if (cachedEntries) {
      renderLogEntries(cachedEntries);
    }
    void syncNow();
    const entries = await loadEntriesWithFallback(params);
    renderLogEntries(entries);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  } finally {
    if (shouldShowLoading) {
      setLoadingState(false);
    }
    hasLoadedLogEntries = true;
  }
}

function initLinks() {
  if (logLinkEl) {
    logLinkEl.classList.remove("disabled");
    logLinkEl.href = buildUrl("/log");
  }
  if (homeLinkEl) {
    homeLinkEl.classList.remove("disabled");
    homeLinkEl.href = buildUrl("/");
  }
  if (summaryLinkEl) {
    summaryLinkEl.classList.remove("disabled");
    summaryLinkEl.href = buildUrl("/summary");
  }
  if (milkExpressLinkEl) {
    milkExpressLinkEl.classList.remove("disabled");
    milkExpressLinkEl.href = buildUrl("/milk-express");
  }
  if (bottlesLinkEl) {
    bottlesLinkEl.classList.remove("disabled");
    bottlesLinkEl.href = buildUrl("/bottles");
  }
  if (nappyStockLinkEl) {
    nappyStockLinkEl.classList.remove("disabled");
    nappyStockLinkEl.href = buildUrl("/nappy-stock");
  }
  if (goalsLinkEl) {
    goalsLinkEl.classList.remove("disabled");
    goalsLinkEl.href = buildUrl("/goals");
  }
  if (timelineLinkEl) {
    timelineLinkEl.classList.remove("disabled");
    timelineLinkEl.href = buildUrl("/timeline");
  }
}

function setNavMenuOpen(open) {
  if (!navMenuToggleBtn || !navMenuPanelEl) {
    return;
  }
  navMenuToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
  navMenuPanelEl.setAttribute("aria-hidden", open ? "false" : "true");
  navMenuPanelEl.classList.toggle("open", open);
}

function initNavMenuHandlers() {
  if (!navMenuToggleBtn || !navMenuPanelEl) {
    return;
  }
  setNavMenuOpen(false);

  navMenuToggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = navMenuPanelEl.classList.contains("open");
    setNavMenuOpen(!isOpen);
  });

  navMenuPanelEl.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(".nav-menu-item") : null;
    if (target) {
      setNavMenuOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (navMenuPanelEl.contains(event.target) || navMenuToggleBtn.contains(event.target)) {
      return;
    }
    setNavMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setNavMenuOpen(false);
    }
  });
}

async function loadBabySettings() {
  try {
    const response = await fetch(buildUrl("/api/settings"));
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    state.babyDob = data.dob || null;
    state.feedIntervalMinutes = Number.isInteger(data.feed_interval_min)
      ? data.feed_interval_min
      : null;
    state.customEventTypes = Array.isArray(data.custom_event_types)
      ? data.custom_event_types
      : [];
    state.feedSizeSmallMl = Number.isFinite(Number.parseFloat(data.feed_size_small_ml))
      ? Number.parseFloat(data.feed_size_small_ml)
      : 120;
    state.feedSizeMediumMl = Number.isFinite(Number.parseFloat(data.feed_size_medium_ml))
      ? Number.parseFloat(data.feed_size_medium_ml)
      : 135;
    state.feedSizeBigMl = Number.isFinite(Number.parseFloat(data.feed_size_big_ml))
      ? Number.parseFloat(data.feed_size_big_ml)
      : 150;
    if (dobInputEl) {
      dobInputEl.value = state.babyDob || "";
    }
    if (intervalInputEl) {
      intervalInputEl.value = state.feedIntervalMinutes
        ? String(state.feedIntervalMinutes / 60)
        : "";
    }
    if (entryWebhookInputEl) {
      entryWebhookInputEl.value = data.entry_webhook_url || "";
    }
    if (homeKpisWebhookInputEl) {
      homeKpisWebhookInputEl.value = data.home_kpis_webhook_url || "";
    }
    if (defaultUserInputEl) {
      defaultUserInputEl.value = data.default_user_slug || "";
    }
    if (openaiModelInputEl) {
      openaiModelInputEl.value = data.openai_model || "gpt-4.1-mini";
    }
    if (openaiTimeoutInputEl) {
      openaiTimeoutInputEl.value = String(data.openai_timeout_seconds || 45);
    }
    if (openaiPromptInputEl) {
      openaiPromptInputEl.value = data.openai_prompt_template || "";
    }
    if (feedSizeSmallInputEl) {
      feedSizeSmallInputEl.value = String(state.feedSizeSmallMl);
    }
    if (feedSizeMediumInputEl) {
      feedSizeMediumInputEl.value = String(state.feedSizeMediumMl);
    }
    if (feedSizeBigInputEl) {
      feedSizeBigInputEl.value = String(state.feedSizeBigMl);
    }
    syncQuickFeedButtons();
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
    if (pageType === "summary" || pageType === "weight") {
      renderWeightPercentileSurfaces(summaryWeightEntries);
    }
    if (pageType === "settings") {
      void refreshPushReminderState();
    }
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

async function saveBabySettings(patch) {
  try {
    const response = await fetch(buildUrl("/api/settings"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    state.babyDob = data.dob || null;
    state.feedIntervalMinutes = Number.isInteger(data.feed_interval_min)
      ? data.feed_interval_min
      : null;
    state.customEventTypes = Array.isArray(data.custom_event_types)
      ? data.custom_event_types
      : [];
    state.feedSizeSmallMl = Number.isFinite(Number.parseFloat(data.feed_size_small_ml))
      ? Number.parseFloat(data.feed_size_small_ml)
      : 120;
    state.feedSizeMediumMl = Number.isFinite(Number.parseFloat(data.feed_size_medium_ml))
      ? Number.parseFloat(data.feed_size_medium_ml)
      : 135;
    state.feedSizeBigMl = Number.isFinite(Number.parseFloat(data.feed_size_big_ml))
      ? Number.parseFloat(data.feed_size_big_ml)
      : 150;
    if (entryWebhookInputEl) {
      entryWebhookInputEl.value = data.entry_webhook_url || "";
    }
    if (homeKpisWebhookInputEl) {
      homeKpisWebhookInputEl.value = data.home_kpis_webhook_url || "";
    }
    if (defaultUserInputEl) {
      defaultUserInputEl.value = data.default_user_slug || "";
    }
    if (openaiModelInputEl) {
      openaiModelInputEl.value = data.openai_model || "gpt-4.1-mini";
    }
    if (openaiTimeoutInputEl) {
      openaiTimeoutInputEl.value = String(data.openai_timeout_seconds || 45);
    }
    if (openaiPromptInputEl) {
      openaiPromptInputEl.value = data.openai_prompt_template || "";
    }
    if (feedSizeSmallInputEl) {
      feedSizeSmallInputEl.value = String(state.feedSizeSmallMl);
    }
    if (feedSizeMediumInputEl) {
      feedSizeMediumInputEl.value = String(state.feedSizeMediumMl);
    }
    if (feedSizeBigInputEl) {
      feedSizeBigInputEl.value = String(state.feedSizeBigMl);
    }
    syncQuickFeedButtons();
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
    if (pageType === "summary" || pageType === "weight") {
      renderWeightPercentileSurfaces(summaryWeightEntries);
    }
    if (pageType === "settings") {
      void refreshPushReminderState();
    }
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

applyTheme(getPreferredTheme());
initNavMenuHandlers();
syncQuickFeedButtons();
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}
if (userFormEl) {
  userFormEl.addEventListener("submit", handleUserSave);
}
void loadBabySettings();
initializeUser();
let swReloading = false;
let swPrompted = false;

function promptServiceWorkerUpdate(registration) {
  if (!statusEl || swPrompted || !registration || !registration.waiting) {
    return;
  }
  swPrompted = true;
  setStatus("Update available. Tap to refresh.");
  statusEl.addEventListener("click", () => {
    if (!registration.waiting) {
      return;
    }
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, { once: true });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swReloading) {
      return;
    }
    swReloading = true;
    window.location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(buildUrl("/sw.js"), { scope: buildUrl("/") })
      .then((registration) => {
        if (registration.waiting) {
          promptServiceWorkerUpdate(registration);
        }
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              promptServiceWorkerUpdate(registration);
            }
          });
        });
      })
      .catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
window.addEventListener("online", () => {
  setStatus("Back online");
  void syncNow();
});
window.addEventListener("baby-tracker:weights-updated", () => {
  if (pageType === "weight" || pageType === "summary") {
    void loadWeightPercentileEntries();
  }
});
scheduleSync();
