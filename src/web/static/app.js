const statusEl = document.getElementById("status");
const bodyEl = document.body;
let activeUser = bodyEl.dataset.user || "";
let userValid = bodyEl.dataset.userValid === "true";
const pageType = bodyEl.dataset.page || "home";
const logFilterType = bodyEl.dataset.logType || "";
const logWindowHours = Number.parseInt(bodyEl.dataset.logWindowHours || "", 10);
const basePath = bodyEl.dataset.basePath || "";
const apiSharedSecret = bodyEl.dataset.apiSecret || "";
const buildUrl = (path) => `${basePath}${path}`;

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const requestUrl = typeof input === "string" ? input : input?.url;
  if (!apiSharedSecret || !requestUrl) {
    return nativeFetch(input, init);
  }
  let pathname = "";
  try {
    pathname = new URL(requestUrl, window.location.origin).pathname;
  } catch (_err) {
    return nativeFetch(input, init);
  }
  const apiPrefix = `${basePath}/api`;
  if (!pathname.startsWith(apiPrefix)) {
    return nativeFetch(input, init);
  }
  const headers = new Headers(init.headers || (typeof input === "object" ? input.headers : undefined) || {});
  if (!headers.has("X-App-Secret")) {
    headers.set("X-App-Secret", apiSharedSecret);
  }
  return nativeFetch(input, { ...init, headers });
};

const THEME_KEY = "baby-tracker-theme";
const USER_KEY = "baby-tracker-user";
const BREASTFEED_TIMER_KEY = "baby-tracker-breastfeed-start";
const BREASTFEED_IN_PROGRESS_NOTE = "Breastfeeding (started)";
const BREASTFEED_COMPLETE_NOTE = "Breastfed";
const TIMED_EVENT_TIMER_KEY = "baby-tracker-timed-event-start";
const TIMED_EVENT_TYPES = ["sleep", "cry"];
const OFFLINE_WINDOW_DAYS = 30;
const DB_NAME = "baby-tracker";
const DB_VERSION = 2;
const STORE_ENTRIES = "entries";
const STORE_OUTBOX = "outbox";
const STORE_META = "meta";
const INDEX_ENTRIES_TS = "by_timestamp_utc";
const INDEX_ENTRIES_USER = "by_user_slug";
const INDEX_ENTRIES_USER_TS = "by_user_slug_timestamp";
const INDEX_ENTRIES_TYPE_TS = "by_type_timestamp";
const META_DEVICE_ID = "device_id";
const META_SYNC_CURSOR = "sync_cursor";
const USER_RE = /^[a-z0-9-]{1,24}$/;
const RESERVED_USER_SLUGS = new Set([
  "timeline",
  "calendar",
  "summary",
  "log",
  "settings",
  "goals",
  "milk-express",
  "bottles",
]);
const themeToggleBtn = document.getElementById("theme-toggle");
const navMenuToggleBtn = document.getElementById("nav-menu-toggle");
const navMenuPanelEl = document.getElementById("nav-menu-panel");
const userFormEl = document.getElementById("user-form");
const userInputEl = document.getElementById("user-input");
const userMessageEl = document.getElementById("today-label")
  || document.getElementById("user-message");
const userChipEl = document.getElementById("user-chip");

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
const feedToggleFormulaBtn = document.getElementById("feed-toggle-formula");
const feedToggleExpressedBtn = document.getElementById("feed-toggle-expressed");
const feedQuickBtns = document.querySelectorAll("[data-quick-ml]");
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
const refreshBtn = document.getElementById("refresh-btn");
const csvFormEl = document.getElementById("csv-upload-form");
const csvFileEl = document.getElementById("csv-file");
const csvUploadBtn = document.getElementById("csv-upload-btn");
const summaryDateInputEl = document.getElementById("summary-date");
const summaryDateLabelEl = document.getElementById("summary-date-label");
const summaryPrevBtn = document.getElementById("summary-prev");
const summaryNextBtn = document.getElementById("summary-next");
const summaryTypeSelectEl = document.getElementById("summary-type");
const summaryChartEl = document.getElementById("summary-chart");
const summaryChartEmptyEl = document.getElementById("summary-chart-empty");
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
const insightTimeframeBodyEl = document.getElementById("insight-timeframe-body");

const timelineWrapEl = document.getElementById("timeline-wrap");
const timelineTrackEl = document.getElementById("timeline-track");
const timelineEmptyEl = document.getElementById("timeline-empty");
const timelineLoadingEl = document.getElementById("timeline-loading");
const timelineSentinelEl = document.getElementById("timeline-sentinel");

const calendarDaysEl = document.getElementById("calendar-days");
const calendarWeekRangeEl = document.getElementById("week-range");
const calendarEmptyEl = document.getElementById("calendar-empty");
const calendarPrevBtn = document.querySelector("[data-week-nav='prev']");
const calendarNextBtn = document.querySelector("[data-week-nav='next']");
const calendarTodayBtn = document.querySelector("[data-week-nav='today']");

const calendarFormEl = document.getElementById("calendar-form");
const calendarFormTitleEl = document.getElementById("calendar-form-title");
const calendarFormSubtitleEl = document.getElementById("calendar-form-subtitle");
const calendarTitleInputEl = document.getElementById("calendar-title");
const calendarCategorySelectEl = document.getElementById("calendar-category");
const calendarDateInputEl = document.getElementById("calendar-date");
const calendarLocationInputEl = document.getElementById("calendar-location");
const calendarStartTimeInputEl = document.getElementById("calendar-start-time");
const calendarEndTimeInputEl = document.getElementById("calendar-end-time");
const calendarNotesInputEl = document.getElementById("calendar-notes");
const calendarRecurrenceSelectEl = document.getElementById("calendar-recurrence");
const calendarRepeatUntilInputEl = document.getElementById("calendar-repeat-until");
const calendarRepeatUntilFieldEl = document.getElementById("calendar-repeat-until-field");
const calendarSubmitBtn = document.getElementById("calendar-submit");
const calendarDeleteBtn = document.getElementById("calendar-delete");
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

const chartSvg = document.getElementById("history-chart");
const chartEmptyEl = document.getElementById("chart-empty");
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
const statFeedEl = document.getElementById("stat-feed");
const statNappyEl = document.getElementById("stat-nappy");
const statNappyBreakdownEl = document.getElementById("stat-nappy-breakdown");
const statDailyFeedTotalEl = document.getElementById("stat-daily-feed-total");
const statDailyFeedSubEl = document.getElementById("stat-daily-feed-sub");
const statFeedMlEl = document.getElementById("stat-feed-ml");
const statFeedBreakdownEl = document.getElementById("stat-feed-breakdown");
const statGoalProgressEl = document.getElementById("stat-goal-progress");
const statGoalDetailEl = document.getElementById("stat-goal-detail");
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
const nextFeedModalEl = document.getElementById("next-feed-modal");
const nextFeedBackdropEl = document.getElementById("next-feed-backdrop");
const nextFeedCloseEl = document.getElementById("next-feed-close");
const nextFeedListEl = document.getElementById("next-feed-list");
const nextFeedSubEl = document.getElementById("next-feed-sub");
const nextFeedEmptyEl = document.getElementById("next-feed-empty");
const nextFeedShowPreviousEl = document.getElementById("next-feed-show-previous");

const timelineLinkEl = document.getElementById("timeline-link");

const milkExpressLedgerTableEl = document.getElementById("milk-express-ledger-table");
const milkExpressLedgerBodyEl = document.getElementById("milk-express-ledger-body");
const milkExpressLedgerEmptyEl = document.getElementById("milk-express-ledger-empty");
const milkExpressLedgerCountEl = document.getElementById("milk-express-ledger-count");
const milkExpressLedgerTotalEl = document.getElementById("milk-express-ledger-total");
const milkExpressLedgerSelectAllEl = document.getElementById("milk-express-ledger-select-all");
const milkExpressLedgerClearEl = document.getElementById("milk-express-ledger-clear");
const milkExpressLedgerRangeEl = document.getElementById("milk-express-ledger-range");
const milkExpressLedgerTotalAllEl = document.getElementById("milk-express-ledger-total-all");
const milkExpressLedgerSelectionEl = document.getElementById("milk-express-ledger-selection");

const settingsFormEl = document.getElementById("settings-form");
const dobInputEl = document.getElementById("dob-input");
const ageOutputEl = document.getElementById("age-output");
const intervalInputEl = document.getElementById("interval-input");
const customTypeInputEl = document.getElementById("custom-type-input");
const entryWebhookInputEl = document.getElementById("entry-webhook-input");
const homeKpisWebhookInputEl = document.getElementById("home-kpis-webhook-input");
const defaultUserInputEl = document.getElementById("default-user-input");
const pushcutFeedDueInputEl = document.getElementById("pushcut-feed-due-input");
const testFeedDueNotificationBtn = document.getElementById("test-feed-due-notification");
const customTypeAddBtn = document.getElementById("custom-type-add");
const customTypeListEl = document.getElementById("custom-type-list");
const customTypeHintEl = document.getElementById("custom-type-hint");
const customTypeEmptyEl = document.getElementById("custom-type-empty");
const exportCsvBtn = document.getElementById("export-csv");
const goalsFormEl = document.getElementById("goals-form");
const goalAmountInputEl = document.getElementById("goal-amount");
const goalStartDateInputEl = document.getElementById("goal-start-date");
const goalHistoryEl = document.getElementById("goal-history");
const goalEmptyEl = document.getElementById("goal-empty");
const goalsLinkEl = document.getElementById("goals-link");

const bottleFormEl = document.getElementById("bottle-form");
const bottleNameInputEl = document.getElementById("bottle-name");
const bottleWeightInputEl = document.getElementById("bottle-weight");
const bottleFormHintEl = document.getElementById("bottle-form-hint");
const bottleListEl = document.getElementById("bottle-list");
const bottleEmptyEl = document.getElementById("bottle-empty");
const bottleSelectEl = document.getElementById("bottle-select");
const bottleTotalWeightEl = document.getElementById("bottle-total-weight");
const bottleResultValueEl = document.getElementById("bottle-result-value");
const bottleLogMilkBtnEl = document.getElementById("bottle-log-milk");

let babyDob = null;
let feedIntervalMinutes = null;
let customEventTypes = [];
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
let milkExpressLedgerInitialized = false;
let milkExpressLedgerEntries = [];
const milkExpressLedgerSelections = new Set();
let editEntryModalInitialized = false;
let editEntryModalResolver = null;
let editEntryModalEntry = null;
let editEntryModalMode = "full";
let breastfeedHydrated = false;
let timedEventHydrated = false;
let quickFeedKind = "formula";

const CUSTOM_TYPE_RE = /^[A-Za-z0-9][A-Za-z0-9 /-]{0,31}$/;
const MILK_EXPRESS_TYPE = "milk express";

const CHART_CONFIG = {
  width: 360,
  height: 150,
  paddingX: 16,
  axisY: 122,
  sleepY: 22,
  weeY: 42,
  feedY: 62,
  cryY: 82,
  pooY: 102,
};

const CHART_EVENT_TYPES = {
  sleep: { y: CHART_CONFIG.sleepY, color: "#7c83ff" },
  wee: { y: CHART_CONFIG.weeY, color: "#7dd3fc" },
  feed: { y: CHART_CONFIG.feedY, color: "#13ec5b" },
  cry: { y: CHART_CONFIG.cryY, color: "#fb7185" },
  poo: { y: CHART_CONFIG.pooY, color: "#fbbf24" },
};

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

function normalizeUserSlug(value) {
  if (!value) {
    return "";
  }
  const slug = value.trim().toLowerCase();
  if (!USER_RE.test(slug)) {
    return "";
  }
  return slug;
}

function getFeedIntervalMinutes() {
  return feedIntervalMinutes;
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
  if (activeUser) {
    const legacyKey = `${BREASTFEED_TIMER_KEY}:${activeUser}`;
    const legacyRaw = window.localStorage.getItem(legacyKey);
    const legacyParsed = parseBreastfeedPayload(legacyRaw, legacyKey);
    if (legacyParsed) {
      setBreastfeedStart(legacyParsed.start, activeUser, null);
      window.localStorage.removeItem(legacyKey);
      return {
        start: legacyParsed.start,
        startedBy: activeUser,
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
  if (activeUser) {
    window.localStorage.removeItem(`${BREASTFEED_TIMER_KEY}:${activeUser}`);
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
    return;
  }
  const label = formatEntryTypeLabel(startInfo.type);
  const startedBy = startInfo.startedBy || "--";
  const meta = userValid
    ? `Started by ${startedBy}`
    : `Started by ${startedBy} · Choose a user to stop`;
  timedEventBannerEl.classList.add("is-active");
  timedEventBannerTitleEl.textContent = `${label} active`;
  timedEventBannerTimerEl.textContent = `${durationMinutes} min`;
  timedEventBannerMetaEl.textContent = meta;
  if (timedEventBannerActionEl) {
    timedEventBannerActionEl.disabled = !userValid;
    timedEventBannerActionEl.textContent = `End ${label}`;
    timedEventBannerActionEl.title = userValid
      ? `End ${label.toLowerCase()}`
      : "Choose a user to log the event";
  }
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
    miscTimedEventToggleBtn.disabled = !userValid;
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
  miscTimedEventToggleBtn.disabled = !userValid;
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
    return;
  }
  const startedBy = startInfo.startedBy || "--";
  const meta = userValid
    ? `Started by ${startedBy}`
    : `Started by ${startedBy} · Choose a user to stop`;
  breastfeedBannerEl.classList.add("is-active");
  breastfeedBannerTimerEl.textContent = `${durationMinutes} min`;
  breastfeedBannerMetaEl.textContent = meta;
  if (breastfeedBannerActionEl) {
    breastfeedBannerActionEl.disabled = !userValid;
    breastfeedBannerActionEl.title = userValid
      ? "End breastfeeding"
      : "Choose a user to log the feed";
  }
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

function parseDob(value) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatAge(dob) {
  if (!dob) {
    return "Age: --";
  }
  const today = new Date();
  const diffMs = today.getTime() - dob.getTime();
  if (diffMs < 0) {
    return "Age: --";
  }
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  if (weeks < 1) {
    return `Age: ${days} day${days === 1 ? "" : "s"}`;
  }
  return `Age: ${weeks}w ${days}d`;
}

function updateAgeDisplay() {
  if (!ageOutputEl) {
    return;
  }
  const dob = parseDob(dobInputEl ? dobInputEl.value : babyDob || "");
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
  if (!trimmed || !CUSTOM_TYPE_RE.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function renderCustomTypeList() {
  if (!customTypeListEl) {
    return;
  }
  customTypeListEl.innerHTML = "";
  if (!customEventTypes.length) {
    if (customTypeEmptyEl) {
      customTypeEmptyEl.style.display = "block";
    }
    return;
  }
  if (customTypeEmptyEl) {
    customTypeEmptyEl.style.display = "none";
  }
  customEventTypes.forEach((type) => {
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
      const next = customEventTypes.filter((entry) => entry !== type);
      customEventTypes = next;
      renderCustomTypeList();
      renderMiscMenu();
      void saveBabySettings({ custom_event_types: customEventTypes });
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

  customEventTypes
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
  renderSummaryTypeOptions();
  if (miscBtn) {
    toggleDisabled(miscBtn, !userValid);
  }
}

function updateUserDisplay() {
  if (userMessageEl) {
    if (pageType === "settings") {
      userMessageEl.textContent = userValid
        ? `Logging as ${activeUser}`
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
      userMessageEl.textContent = userValid
        ? `Logging as ${activeUser}`
        : "Choose a user to log.";
    }
  }
  if (userChipEl) {
    userChipEl.textContent = activeUser ? activeUser.slice(0, 2).toUpperCase() : "BT";
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
let logInitialized = false;
let settingsInitialized = false;
let summaryInitialized = false;
let timelineInitialized = false;
let rulerInitialized = false;
let nextFeedTimer = null;
let refreshTimer = null;
let summaryDate = null;
let summaryEntries = [];
let summaryInsightsEntries = [];
let summaryInsightsAnchor = null;
let summaryInsightsLoading = null;
let summaryType = "feed";
let milkExpressSparklineMode = "all";
let milkExpressAllEntries = [];
let milkExpressAllLoading = null;
let goalsInitialized = false;
let bottlesInitialized = false;
let bottlesCache = [];
let bottleExpressedMl = null;
let hasLoadedFeedingGoals = false;
let calendarWeekOffset = 0;
let calendarWeekStart = null;
let calendarLoading = false;
let activeFeedingGoal = null;
let latestFeedTotalMl = 0;
let recentFeedVolumeEntries = [];
let hasLoadedTimelineEntries = false;
let timelineEntryCount = 0;
let timelineOldestTimestamp = null;
let timelineHasMore = true;
let timelineLoading = false;
let timelineObserver = null;
const timelineDayMap = new Map();
const timelineHourMap = new Map();
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
      if (userValid) {
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
  if (feedToggleFormulaBtn) {
    feedToggleFormulaBtn.addEventListener("click", () => {
      setQuickFeedKind("formula");
    });
  }
  if (feedToggleExpressedBtn) {
    feedToggleExpressedBtn.addEventListener("click", () => {
      setQuickFeedKind("expressed");
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
      if (!userValid) {
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
  setQuickFeedKind(quickFeedKind);
  if (!nextFeedTimer) {
    nextFeedTimer = window.setInterval(updateNextFeed, 60000);
  }
  bindStatCardNavigation();
  startAutoRefresh(loadHomeEntries);
}

function initLogHandlers() {
  if (logInitialized || pageType !== "log") {
    return;
  }
  logInitialized = true;
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (userValid) {
        void loadLogEntries();
      }
    });
  }
  if (csvFormEl) {
    csvFormEl.addEventListener("submit", handleCsvUpload);
  }
  initEditEntryModalHandlers();
  startAutoRefresh(loadLogEntries);
  updateLogEmptyMessage();
}

function initSummaryHandlers() {
  if (summaryInitialized || pageType !== "summary") {
    return;
  }
  summaryInitialized = true;
  renderSummaryTypeOptions();
  if (!summaryDate) {
    setSummaryDate(new Date());
  }
  if (summaryPrevBtn) {
    summaryPrevBtn.addEventListener("click", () => {
      const base = summaryDate ? new Date(summaryDate) : new Date();
      base.setDate(base.getDate() - 1);
      setSummaryDate(base);
      if (userValid) {
        void loadSummaryEntries();
      }
    });
  }
  if (summaryNextBtn) {
    summaryNextBtn.addEventListener("click", () => {
      const base = summaryDate ? new Date(summaryDate) : new Date();
      base.setDate(base.getDate() + 1);
      setSummaryDate(base);
      if (userValid) {
        void loadSummaryEntries();
      }
    });
  }
  if (summaryDateInputEl) {
    summaryDateInputEl.addEventListener("change", () => {
      const selected = parseDateInputValue(summaryDateInputEl.value);
      if (selected) {
        setSummaryDate(selected);
        if (userValid) {
          void loadSummaryEntries();
        }
      }
    });
  }
  if (summaryTypeSelectEl) {
    summaryTypeSelectEl.addEventListener("change", () => {
      summaryType = summaryTypeSelectEl.value;
      renderSummaryChart(summaryEntries, summaryType);
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (userValid) {
        void loadSummaryEntries();
        void loadRulerFeeds({ reset: true });
      }
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
  if (customTypeAddBtn && customTypeInputEl) {
    const handleAdd = () => {
      const normalized = normalizeCustomTypeInput(customTypeInputEl.value);
      if (!normalized) {
        setCustomTypeHint("Use letters, numbers, spaces, / or - (max 32 chars).");
        customTypeInputEl.focus();
        return;
      }
      const exists = customEventTypes.some(
        (entry) => entry.toLowerCase() === normalized.toLowerCase(),
      );
      if (exists) {
        setCustomTypeHint("That type already exists.");
        return;
      }
      customEventTypes = [...customEventTypes, normalized];
      customTypeInputEl.value = "";
      setCustomTypeHint("Added.");
      renderCustomTypeList();
      renderMiscMenu();
      void saveBabySettings({ custom_event_types: customEventTypes });
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
  if (pushcutFeedDueInputEl) {
    pushcutFeedDueInputEl.addEventListener("change", () => {
      const value = pushcutFeedDueInputEl.value;
      void saveBabySettings({ pushcut_feed_due_url: value || null });
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
    toggleDisabled(exportCsvBtn, !userValid);
  }
  if (testFeedDueNotificationBtn) {
    testFeedDueNotificationBtn.addEventListener("click", () => {
      void handleTestFeedDueNotification();
    });
  }
}

function initGoalsHandlers() {
  if (goalsInitialized || pageType !== "goals") {
    return;
  }
  goalsInitialized = true;
  if (goalStartDateInputEl && !goalStartDateInputEl.value) {
    goalStartDateInputEl.value = formatDateInputValue(new Date());
  }
  if (goalsFormEl) {
    goalsFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!goalAmountInputEl) {
        return;
      }
      const amount = Number.parseFloat(goalAmountInputEl.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        setStatus("Goal must be a positive number");
        goalAmountInputEl.focus();
        return;
      }
      const startDate = goalStartDateInputEl ? goalStartDateInputEl.value : "";
      void saveFeedingGoal({
        goal_ml: amount,
        start_date: startDate || null,
      }).then(() => {
        void loadGoalHistory();
      });
    });
  }
}

function formatWeightG(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 g";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} g` : `${rounded.toFixed(1)} g`;
}

function renderBottleOptions() {
  if (!bottleSelectEl) {
    return;
  }
  bottleSelectEl.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a bottle";
  bottleSelectEl.appendChild(defaultOption);
  bottlesCache.forEach((bottle) => {
    const option = document.createElement("option");
    option.value = String(bottle.id);
    option.textContent = `${bottle.name} · ${formatWeightG(bottle.empty_weight_g)}`;
    bottleSelectEl.appendChild(option);
  });
  bottleSelectEl.disabled = !bottlesCache.length;
}

function updateBottleResult() {
  if (!bottleResultValueEl) {
    return;
  }
  if (!bottleSelectEl || !bottleTotalWeightEl) {
    bottleResultValueEl.textContent = "-- ml";
    bottleExpressedMl = null;
    updateBottleLogButton();
    return;
  }
  const selectedId = Number.parseInt(bottleSelectEl.value, 10);
  const bottle = bottlesCache.find((item) => item.id === selectedId);
  const totalWeight = Number.parseFloat(bottleTotalWeightEl.value);
  if (!bottle || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    bottleResultValueEl.textContent = "-- ml";
    bottleExpressedMl = null;
    updateBottleLogButton();
    return;
  }
  const expressed = Math.max(0, totalWeight - bottle.empty_weight_g);
  bottleResultValueEl.textContent = formatMl(expressed);
  bottleExpressedMl = expressed;
  updateBottleLogButton();
}

function updateBottleLogButton() {
  if (!bottleLogMilkBtnEl) {
    return;
  }
  const canLog = userValid && Number.isFinite(bottleExpressedMl) && bottleExpressedMl > 0;
  toggleDisabled(bottleLogMilkBtnEl, !canLog);
  if (canLog) {
    bottleLogMilkBtnEl.removeAttribute("disabled");
  } else {
    bottleLogMilkBtnEl.setAttribute("disabled", "true");
  }
}

function renderBottleList(bottles) {
  if (!bottleListEl || !bottleEmptyEl) {
    return;
  }
  bottleListEl.innerHTML = "";
  if (!bottles.length) {
    bottleEmptyEl.hidden = false;
    return;
  }
  bottleEmptyEl.hidden = true;
  bottles.forEach((bottle) => {
    const row = document.createElement("div");
    row.className = "bottle-row";

    const meta = document.createElement("div");
    meta.className = "bottle-meta";
    const name = document.createElement("div");
    name.className = "bottle-name";
    name.textContent = bottle.name;
    const weight = document.createElement("div");
    weight.className = "bottle-weight";
    weight.textContent = `Empty weight: ${formatWeightG(bottle.empty_weight_g)}`;
    meta.appendChild(name);
    meta.appendChild(weight);

    const actions = document.createElement("div");
    actions.className = "bottle-actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "ghost-btn";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => {
      if (bottleSelectEl) {
        bottleSelectEl.value = String(bottle.id);
      }
      updateBottleResult();
      if (bottleTotalWeightEl) {
        bottleTotalWeightEl.focus();
      }
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      const nextName = window.prompt("Bottle name", bottle.name || "");
      if (nextName === null) {
        return;
      }
      const nextWeight = window.prompt(
        "Empty weight (g)",
        String(bottle.empty_weight_g ?? ""),
      );
      if (nextWeight === null) {
        return;
      }
      const trimmed = nextName.trim();
      const weightValue = Number.parseFloat(nextWeight);
      if (!trimmed) {
        setStatus("Bottle name is required.");
        return;
      }
      if (!Number.isFinite(weightValue) || weightValue <= 0) {
        setStatus("Empty weight must be a positive number.");
        return;
      }
      void updateBottle(bottle.id, {
        name: trimmed,
        empty_weight_g: weightValue,
      }).then(() => {
        void loadBottles();
      });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "ghost-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (!window.confirm(`Delete "${bottle.name}"?`)) {
        return;
      }
      void deleteBottle(bottle.id).then(() => {
        void loadBottles();
      });
    });

    actions.appendChild(useBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(meta);
    row.appendChild(actions);
    bottleListEl.appendChild(row);
  });
}

function initBottlesHandlers() {
  if (bottlesInitialized || pageType !== "bottles") {
    return;
  }
  bottlesInitialized = true;
  if (bottleFormEl) {
    bottleFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = bottleNameInputEl ? bottleNameInputEl.value.trim() : "";
      const weightValue = bottleWeightInputEl
        ? Number.parseFloat(bottleWeightInputEl.value)
        : Number.NaN;
      if (!name) {
        setStatus("Bottle name is required.");
        return;
      }
      if (!Number.isFinite(weightValue) || weightValue <= 0) {
        setStatus("Empty weight must be a positive number.");
        return;
      }
      void createBottle({
        name,
        empty_weight_g: weightValue,
      }).then(() => {
        if (bottleNameInputEl) {
          bottleNameInputEl.value = "";
        }
        if (bottleWeightInputEl) {
          bottleWeightInputEl.value = "";
        }
        if (bottleFormHintEl) {
          bottleFormHintEl.textContent = "Bottle saved.";
        }
        void loadBottles();
      });
    });
  }
  if (bottleSelectEl) {
    bottleSelectEl.addEventListener("change", () => {
      updateBottleResult();
    });
  }
  if (bottleTotalWeightEl) {
    bottleTotalWeightEl.addEventListener("input", () => {
      updateBottleResult();
    });
  }
  if (bottleLogMilkBtnEl) {
    bottleLogMilkBtnEl.addEventListener("click", async () => {
      if (!userValid) {
        setStatus("Choose a user below to start logging.");
        return;
      }
      if (!Number.isFinite(bottleExpressedMl) || bottleExpressedMl <= 0) {
        setStatus("Enter a bottle and total weight first.");
        return;
      }
      const payload = buildEntryPayload(MILK_EXPRESS_TYPE);
      payload.expressed_ml = Math.round(bottleExpressedMl * 10) / 10;
      await saveEntry(payload);
      if (bottleTotalWeightEl) {
        bottleTotalWeightEl.value = "";
      }
      updateBottleResult();
    });
  }
}

function applyUserState() {
  if (pageType === "settings") {
    initSettingsHandlers();
    updateUserDisplay();
    if (exportCsvBtn) {
      toggleDisabled(exportCsvBtn, !userValid);
    }
    return;
  }
  if (pageType === "goals") {
    initGoalsHandlers();
    updateUserDisplay();
    loadGoalHistory();
    return;
  }
  if (pageType === "bottles") {
    initBottlesHandlers();
    updateUserDisplay();
    setStatus("");
    updateBottleLogButton();
    loadBottles();
    return;
  }
  const allowTimeline = pageType === "timeline";
  const allowSharedPage = allowTimeline || pageType === "calendar" || pageType === "calendar-form";
  toggleDisabled(feedBtn, !userValid);
  toggleDisabled(nappyBtn, !userValid);
  toggleDisabled(miscBtn, !userValid);
  toggleDisabled(pooBtn, !userValid);
  toggleDisabled(weeBtn, !userValid);
  toggleDisabled(refreshBtn, false);
  if (csvFileEl) {
    csvFileEl.disabled = !userValid;
  }
  if (csvUploadBtn) {
    csvUploadBtn.disabled = !userValid;
  }
  statCardEls.forEach((card) => {
    card.classList.toggle("is-clickable", userValid);
    toggleDisabled(card, !userValid);
  });
  initLinks();
  updateUserDisplay();
  void hydrateBreastfeedFromLocalEntries();
  void hydrateTimedEventFromLocalEntries();
  updateBreastfeedButton();
  updateMiscTimedEventControls();
  if (userFormEl) {
    userFormEl.hidden = userValid || allowSharedPage;
  }
  if (!userValid && !allowSharedPage) {
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
  if (pageType === "timeline") {
    initTimelineHandlers();
    loadTimelineEntries({ reset: true });
  }
  if (pageType === "calendar") {
    initCalendarHandlers();
    loadCalendarWeek();
  }
  if (pageType === "calendar-form") {
    initCalendarFormHandlers();
  }
  if (pageType === "milk-express") {
    initMilkExpressLedgerHandlers();
    loadMilkExpressLedger();
  }
  if (pageType === "bottles") {
    initBottlesHandlers();
    loadBottles();
  }
}

function setActiveUser(value, persist = true) {
  const normalized = normalizeUserSlug(value);
  activeUser = normalized;
  userValid = Boolean(normalized);
  bodyEl.dataset.user = activeUser;
  bodyEl.dataset.userValid = userValid ? "true" : "false";
  if (persist) {
    if (userValid) {
      window.localStorage.setItem(USER_KEY, activeUser);
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  }
  applyUserState();
}

function initializeUser() {
  const initialUser = normalizeUserSlug(activeUser);
  if (userValid && !initialUser) {
    userValid = false;
  }
  activeUser = initialUser;
  if (!userValid) {
    const stored = normalizeUserSlug(window.localStorage.getItem(USER_KEY));
    if (stored && !RESERVED_USER_SLUGS.has(stored)) {
      activeUser = stored;
      userValid = true;
    }
  }
  if (userValid) {
    window.localStorage.setItem(USER_KEY, activeUser);
  }
  bodyEl.dataset.user = activeUser;
  bodyEl.dataset.userValid = userValid ? "true" : "false";
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
  if (!customEventTypes.length) {
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
  if (!feedMenu || !feedBtn || !userValid) {
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
  if (visible && expressedInput) {
    expressedInput.focus();
  }
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

function setQuickFeedKind(kind) {
  quickFeedKind = kind === "expressed" ? "expressed" : "formula";
  if (feedToggleFormulaBtn) {
    feedToggleFormulaBtn.classList.toggle(
      "is-active",
      quickFeedKind === "formula",
    );
  }
  if (feedToggleExpressedBtn) {
    feedToggleExpressedBtn.classList.toggle(
      "is-active",
      quickFeedKind === "expressed",
    );
  }
}

function handleQuickLog(amountMl) {
  if (!userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const payload = buildEntryPayload("feed");
  if (quickFeedKind === "expressed") {
    payload.expressed_ml = amountMl;
  } else {
    payload.formula_ml = amountMl;
  }
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
  if (!userValid) {
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
    const response = await fetch(buildUrl(`/api/users/${activeUser}/entries/import`), {
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
  if (!userValid || !activeUser) {
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
    link.download = `baby-tracker-events-${activeUser}-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setStatus("CSV downloaded");
  } catch (error) {
    setStatus("Error: network issue exporting CSV");
  }
}

async function handleTestFeedDueNotification() {
  setStatus("Sending test notification...");
  try {
    const response = await fetch(buildUrl("/api/push/feed-due"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Feed due (test)",
        body: "This is a test notification from Baby Tracker settings.",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = payload.error || response.status;
      setStatus(`Error: ${detail}`);
      return;
    }
    setStatus("Test feed-due notification sent");
  } catch (error) {
    setStatus("Error: network issue sending test notification");
  }
}

function startAutoRefresh(refreshFn) {
  if (refreshTimer) {
    return;
  }
  refreshTimer = window.setInterval(() => {
    if (userValid) {
      void refreshFn();
    }
  }, 120000);
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
  const timestampIso = toComparableIso(entry.timestamp_utc);
  if (!timestampIso) {
    return false;
  }
  if (lowerBoundIso && timestampIso < lowerBoundIso) {
    return false;
  }
  if (upperBoundIso && timestampIso > upperBoundIso) {
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

  return new Promise((resolve, reject) => {
    const results = [];
    let finished = false;

    const finish = (value) => {
      if (finished) {
        return;
      }
      finished = true;
      resolve(value);
    };

    const fail = (err) => {
      if (finished) {
        return;
      }
      finished = true;
      reject(err);
    };

    let source = store.index(INDEX_ENTRIES_TS);
    let range = null;

    if (params.user_slug && store.indexNames.contains(INDEX_ENTRIES_USER_TS)) {
      source = store.index(INDEX_ENTRIES_USER_TS);
      const lower = [params.user_slug, lowerBoundIso || ""];
      const upper = [params.user_slug, upperBoundIso || "\uffff"];
      range = window.IDBKeyRange.bound(lower, upper);
    } else if (params.type && store.indexNames.contains(INDEX_ENTRIES_TYPE_TS)) {
      source = store.index(INDEX_ENTRIES_TYPE_TS);
      const lower = [params.type, lowerBoundIso || ""];
      const upper = [params.type, upperBoundIso || "\uffff"];
      range = window.IDBKeyRange.bound(lower, upper);
    } else if (lowerBoundIso && upperBoundIso) {
      range = window.IDBKeyRange.bound(lowerBoundIso, upperBoundIso);
    } else if (lowerBoundIso) {
      range = window.IDBKeyRange.lowerBound(lowerBoundIso);
    } else if (upperBoundIso) {
      range = window.IDBKeyRange.upperBound(upperBoundIso);
    }

    const request = source.openCursor(range, "prev");
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        finish(results);
        return;
      }
      const entry = cursor.value;
      if (shouldIncludeLocalEntry(entry, params, lowerBoundIso, upperBoundIso)) {
        results.push(entry);
        if (limit && results.length >= limit) {
          finish(results);
          return;
        }
      }
      cursor.continue();
    };
    request.onerror = () => fail(request.error);
    tx.onabort = () => fail(tx.error);
    tx.onerror = () => fail(tx.error);
  });
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

  const filtered = allEntries.filter((entry) => (
    shouldIncludeLocalEntry(entry, params, lowerBoundIso, upperBoundIso)
  ));
  filtered.sort((a, b) => {
    const left = toComparableIso(a.timestamp_utc) || "";
    const right = toComparableIso(b.timestamp_utc) || "";
    if (left === right) {
      return 0;
    }
    return left < right ? 1 : -1;
  });
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
    void syncNow();
  }, 60000);
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatTimelineDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimelineHour(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function getDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getHourKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const pad = (item) => String(item).padStart(2, "0");
  return `${getDateKey(date)}T${pad(date.getHours())}`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hexToRgba(hex, alpha) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTimelineTypeConfig(type) {
  const normalized = normalizeEntryType(type);
  const palette = [
    { color: "#ff8a5b", icon: "local_fire_department" },
    { color: "#2dd4bf", icon: "water_drop" },
    { color: "#fbbf24", icon: "spa" },
    { color: "#38bdf8", icon: "rainy" },
    { color: "#a78bfa", icon: "bedtime" },
    { color: "#f97316", icon: "local_cafe" },
    { color: "#22c55e", icon: "event" },
  ];

  if (normalized.includes("feed")) {
    return { color: "#23c96b", icon: "local_drink" };
  }
  if (normalized.includes("breast")) {
    return { color: "#f97316", icon: "favorite" };
  }
  if (normalized.includes("formula")) {
    return { color: "#38bdf8", icon: "science" };
  }
  if (normalized.includes("express") || normalized.includes("pump")) {
    return { color: "#f59e0b", icon: "local_cafe" };
  }
  if (normalized.includes("wee") || normalized.includes("wet")) {
    return { color: "#38bdf8", icon: "rainy" };
  }
  if (normalized.includes("poo") || normalized.includes("soiled")) {
    return { color: "#fbbf24", icon: "spa" };
  }
  if (normalized.includes("sleep") || normalized.includes("nap")) {
    return { color: "#a78bfa", icon: "bedtime" };
  }
  if (normalized.includes("cry")) {
    return { color: "#f97316", icon: "mood_bad" };
  }

  const pick = palette[hashString(normalized || "event") % palette.length];
  return { color: pick.color, icon: pick.icon };
}

function formatSummaryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toLocalDateTimeValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
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

function formatTimeUntil(target) {
  if (!target || Number.isNaN(target.getTime())) {
    return "--";
  }
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return "due now";
  }
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) {
    return `in ${hours}h`;
  }
  return `in ${hours}h ${minutes}m`;
}

function formatFeedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildFeedShortcutUrl(target) {
  const inputValue = toLocalDateTimeValue(target);
  if (!inputValue) {
    return "";
  }
  const encoded = encodeURIComponent(inputValue);
  return `shortcuts://run-shortcut?name=feedreminderpwa&input=${encoded}`;
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
    if (nextFeedListEl) {
      const upcomingLabel = document.createElement("div");
      upcomingLabel.className = "next-feed-section-label";
      upcomingLabel.textContent = "Next 6 feeds";
      nextFeedListEl.appendChild(upcomingLabel);
      nextAnchorEl = upcomingLabel;
    }

    for (let i = 1; i <= 6; i += 1) {
      const nextDate = new Date(lastDate.getTime() + intervalMinutes * 60000 * i);
      const item = buildNextFeedRow({
        date: nextDate,
        detail: "",
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

function formatDateInputValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateInputValue(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function getDateKeyFromTimestamp(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatDateInputValue(parsed);
}

function getGoalDayWindow(dateKey) {
  const parsed = parseDateInputValue(dateKey);
  if (!parsed) {
    return null;
  }
  return getSummaryDayWindow(parsed);
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

function formatSummaryDateLabel(date) {
  const today = new Date();
  if (isSameDay(date, today)) {
    return "Today";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
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
}

function getSummaryDayWindow(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return {
    since: start,
    until: end,
    sinceIso: start.toISOString(),
    untilIso: end.toISOString(),
  };
}

function formatDurationMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0 min";
  }
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (!hours) {
    return `${minutes} min`;
  }
  if (!minutes) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatMl(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 ml";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} ml` : `${rounded.toFixed(1)} ml`;
}

function formatAverageDuration(totalMinutes, feedCount) {
  if (!feedCount) {
    return "--";
  }
  return formatDurationMinutes(totalMinutes / feedCount);
}

function formatAverageMl(totalMl, feedCount) {
  if (!feedCount) {
    return "--";
  }
  return formatMl(totalMl / feedCount);
}

function normalizeEntryType(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
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

function parseMilkExpressNotes(value) {
  if (typeof value !== "string") {
    return { ml: 0, minutes: 0 };
  }
  let ml = 0;
  let minutes = 0;
  const pattern = /(\d+(?:\.\d+)?)(?:\s*(ml|milliliter|milliliters|min|mins|minute|minutes))?/gi;
  let match = pattern.exec(value);
  while (match) {
    const amount = Number.parseFloat(match[1]);
    if (Number.isFinite(amount)) {
      const unit = (match[2] || "").toLowerCase();
      if (unit.startsWith("min")) {
        minutes += amount;
      } else {
        ml += amount;
      }
    }
    match = pattern.exec(value);
  }
  return { ml, minutes };
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

function formatEntryTypeLabel(type) {
  const normalized = normalizeEntryType(type);
  if (!normalized) {
    return "Event";
  }
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function renderSummaryStats(entries) {
  if (
    !summaryFeedDurationEl
    || !summaryExpressedEl
    || !summaryFormulaEl
    || !summaryTotalIntakeEl
  ) {
    return;
  }
  let feedCount = 0;
  let durationTotal = 0;
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
  const totalIntake = expressedTotal + formulaTotal;
  summaryFeedDurationEl.textContent = formatDurationMinutes(durationTotal);
  summaryExpressedEl.textContent = formatMl(expressedTotal);
  summaryFormulaEl.textContent = formatMl(formulaTotal);
  summaryTotalIntakeEl.textContent = formatMl(totalIntake);
  if (summarySleepDurationEl) {
    summarySleepDurationEl.textContent = formatDurationMinutes(sleepDurationTotal);
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

function getSummaryTypeColor(type) {
  if (type === "feed") {
    return "#13ec5b";
  }
  if (type === "wee") {
    return "#7dd3fc";
  }
  if (type === "poo") {
    return "#fbbf24";
  }
  if (type === "all") {
    return "#16a34a";
  }
  return "#60a5fa";
}

function renderSummaryTypeOptions() {
  if (!summaryTypeSelectEl) {
    return;
  }
  const current = summaryTypeSelectEl.value || summaryType || "all";
  summaryTypeSelectEl.innerHTML = "";
  const baseOptions = ["all", "feed", "wee", "poo", ...TIMED_EVENT_TYPES];
  const options = [...baseOptions, ...customEventTypes];
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "all" ? "All events" : value;
    summaryTypeSelectEl.appendChild(option);
  });
  summaryTypeSelectEl.value = options.includes(current) ? current : "all";
  summaryType = summaryTypeSelectEl.value;
}

function renderSummaryChart(entries, selectedType) {
  if (!summaryChartEl || !summaryChartEmptyEl) {
    return;
  }
  summaryChartEl.innerHTML = "";
  const filtered = selectedType === "all"
    ? entries
    : entries.filter((entry) => entry.type === selectedType);
  if (!filtered.length) {
    summaryChartEmptyEl.style.display = "flex";
    return;
  }
  summaryChartEmptyEl.style.display = "none";

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 360;
  const height = 180;
  const paddingX = 20;
  const paddingTop = 18;
  const paddingBottom = 28;
  const axisY = height - paddingBottom;
  const barSlot = (width - paddingX * 2) / 24;
  const barWidth = barSlot * 0.7;

  const counts = new Array(24).fill(0);
  filtered.forEach((entry) => {
    const ts = new Date(entry.timestamp_utc);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    counts[ts.getHours()] += 1;
  });
  const maxCount = Math.max(...counts, 1);

  const axis = document.createElementNS(svgNS, "line");
  axis.setAttribute("x1", paddingX);
  axis.setAttribute("x2", width - paddingX);
  axis.setAttribute("y1", axisY);
  axis.setAttribute("y2", axisY);
  axis.setAttribute("stroke", "#d6ded8");
  axis.setAttribute("stroke-width", "2");
  summaryChartEl.appendChild(axis);

  counts.forEach((count, hour) => {
    const ratio = count / maxCount;
    const barHeight = ratio * (axisY - paddingTop);
    const x = paddingX + hour * barSlot + (barSlot - barWidth) / 2;
    const y = axisY - barHeight;
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("rx", "3");
    rect.setAttribute("fill", getSummaryTypeColor(selectedType));
    summaryChartEl.appendChild(rect);
  });

  [0, 6, 12, 18, 23].forEach((hour) => {
    const x = paddingX + hour * barSlot + barSlot / 2;
    const tick = document.createElementNS(svgNS, "text");
    tick.setAttribute("x", x);
    tick.setAttribute("y", height - 8);
    tick.setAttribute("text-anchor", "middle");
    tick.setAttribute("fill", "#7d7f7b");
    tick.setAttribute("font-size", "10");
    tick.textContent = String(hour);
    summaryChartEl.appendChild(tick);
  });
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

async function fetchAllEntriesUntil(untilIso) {
  const limit = 500;
  let batchUntil = untilIso;
  let entries = [];
  for (let page = 0; page < 20; page += 1) {
    const batch = await fetchEntries({
      limit,
      until: batchUntil,
    });
    entries = entries.concat(batch);
    if (batch.length < limit) {
      break;
    }
    const oldest = batch[batch.length - 1];
    if (!oldest || !oldest.timestamp_utc) {
      break;
    }
    batchUntil = decrementIsoTimestamp(oldest.timestamp_utc);
  }
  return entries;
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

async function fetchBottles() {
  const response = await fetch(buildUrl("/api/bottles"));
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
  return Array.isArray(data) ? data : [];
}

async function createBottle(payload) {
  const response = await fetch(buildUrl("/api/bottles"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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

async function updateBottle(bottleId, payload) {
  const response = await fetch(buildUrl(`/api/bottles/${bottleId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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

async function deleteBottle(bottleId) {
  const response = await fetch(buildUrl(`/api/bottles/${bottleId}`), { method: "DELETE" });
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

function renderChart(entries, windowBounds) {
  if (!chartSvg || !chartEmptyEl) {
    return;
  }
  chartSvg.innerHTML = "";
  if (!entries.length) {
    chartEmptyEl.style.display = "flex";
    return;
  }
  chartEmptyEl.style.display = "none";

  const svgNS = "http://www.w3.org/2000/svg";
  const { width, height, paddingX, axisY } = CHART_CONFIG;

  const axisLine = document.createElementNS(svgNS, "line");
  axisLine.setAttribute("x1", paddingX);
  axisLine.setAttribute("x2", width - paddingX);
  axisLine.setAttribute("y1", axisY);
  axisLine.setAttribute("y2", axisY);
  axisLine.setAttribute("stroke", "#d9d2c7");
  axisLine.setAttribute("stroke-width", "2");
  chartSvg.appendChild(axisLine);

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

  const formatChartTickTime = (date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  labels.forEach((label, idx) => {
    const x = paddingX + ((width - paddingX * 2) / 4) * idx;
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x);
    tick.setAttribute("x2", x);
    tick.setAttribute("y1", axisY - 6);
    tick.setAttribute("y2", axisY + 6);
    tick.setAttribute("stroke", "#d9d2c7");
    tick.setAttribute("stroke-width", "1");
    chartSvg.appendChild(tick);

    const relativeText = document.createElementNS(svgNS, "text");
    relativeText.setAttribute("x", x);
    relativeText.setAttribute("y", height - 16);
    relativeText.setAttribute("fill", "#8b857e");
    relativeText.setAttribute("font-size", "10");
    relativeText.setAttribute("text-anchor", "middle");
    relativeText.textContent = label;
    chartSvg.appendChild(relativeText);

    const tickTime = new Date(windowBounds.until.getTime() - ticks[idx] * 3600000);
    const absoluteText = document.createElementNS(svgNS, "text");
    absoluteText.setAttribute("x", x);
    absoluteText.setAttribute("y", height - 4);
    absoluteText.setAttribute("fill", "#8b857e");
    absoluteText.setAttribute("font-size", "10");
    absoluteText.setAttribute("text-anchor", "middle");
    absoluteText.textContent = formatChartTickTime(tickTime);
    chartSvg.appendChild(absoluteText);
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
        chartSvg.appendChild(durationBar);

        const durationLabel = document.createElementNS(svgNS, "text");
        durationLabel.setAttribute("x", barEndX);
        durationLabel.setAttribute("y", Math.max(10, y - 7));
        durationLabel.setAttribute("fill", color);
        durationLabel.setAttribute("font-size", "9");
        durationLabel.setAttribute("font-weight", "700");
        durationLabel.setAttribute("text-anchor", "end");
        durationLabel.textContent = formatChartDuration(duration);
        chartSvg.appendChild(durationLabel);
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
    chartSvg.appendChild(stem);

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "5");
    dot.setAttribute("fill", color);
    dot.setAttribute("stroke", "#ffffff");
    dot.setAttribute("stroke-width", "1");
    chartSvg.appendChild(dot);
  });
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

const CALENDAR_CATEGORY_LABELS = {
  group: "Group",
  meetup: "Meetup",
  hub: "Family hub",
  other: "Other",
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfWeekMonday(value) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return `Week of ${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

function formatDayLabel(date) {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  return fmt.format(date);
}

function formatDayDate(date) {
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return fmt.format(date);
}

function buildCalendarEventCard(event) {
  const card = document.createElement("article");
  card.className = "calendar-event";

  const time = document.createElement("div");
  time.className = "event-time";
  const endTime = event.end_time_local;
  time.textContent = endTime
    ? `${event.start_time_local}–${endTime}`
    : event.start_time_local;

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = event.title;

  const location = event.location ? document.createElement("div") : null;
  if (location) {
    location.className = "event-meta";
    location.textContent = event.location;
  }

  const notes = event.notes ? document.createElement("div") : null;
  if (notes) {
    notes.className = "event-meta";
    notes.textContent = event.notes;
  }

  const tag = document.createElement("div");
  tag.className = "event-tag";
  tag.dataset.category = event.category;
  tag.textContent = CALENDAR_CATEGORY_LABELS[event.category] || "Other";

  const actions = document.createElement("div");
  actions.className = "event-actions";
  const editLink = document.createElement("a");
  editLink.href = buildUrl(`/calendar/edit/${event.id}`);
  editLink.textContent = "Edit";
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.calendarAction = "delete";
  deleteBtn.dataset.eventId = String(event.id);
  deleteBtn.textContent = "Delete";
  actions.appendChild(editLink);
  actions.appendChild(deleteBtn);

  card.appendChild(time);
  card.appendChild(title);
  if (location) {
    card.appendChild(location);
  }
  if (notes) {
    card.appendChild(notes);
  }
  card.appendChild(tag);
  card.appendChild(actions);
  return card;
}

function renderCalendarWeek(startDate, occurrences) {
  if (!calendarDaysEl || !calendarWeekRangeEl) {
    return;
  }
  calendarWeekRangeEl.textContent = formatWeekRange(startDate);
  calendarDaysEl.innerHTML = "";
  const todayIso = toLocalIsoDate(new Date());
  const occurrencesByDate = new Map();
  occurrences.forEach((event) => {
    const key = event.occurrence_date || event.date_local;
    if (!occurrencesByDate.has(key)) {
      occurrencesByDate.set(key, []);
    }
    occurrencesByDate.get(key).push(event);
  });

  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + i);
    const dayIso = toLocalIsoDate(dayDate);
    const dayEvents = occurrencesByDate.get(dayIso) || [];

    const section = document.createElement("section");
    section.className = "calendar-day";
    if (dayIso === todayIso) {
      section.classList.add("is-today");
    }
    if (!dayEvents.length) {
      section.classList.add("empty");
    }

    const header = document.createElement("div");
    header.className = "calendar-day-header";
    const label = document.createElement("div");
    label.className = "calendar-day-label";
    label.textContent = formatDayLabel(dayDate);
    const dateLabel = document.createElement("div");
    dateLabel.className = "calendar-day-date";
    dateLabel.textContent = formatDayDate(dayDate);
    header.appendChild(label);
    header.appendChild(dateLabel);

    const eventsWrap = document.createElement("div");
    eventsWrap.className = "calendar-events";
    if (!dayEvents.length) {
      const empty = document.createElement("div");
      empty.textContent = "No sessions added yet.";
      eventsWrap.appendChild(empty);
    } else {
      dayEvents.forEach((event) => {
        eventsWrap.appendChild(buildCalendarEventCard(event));
      });
    }

    section.appendChild(header);
    section.appendChild(eventsWrap);
    calendarDaysEl.appendChild(section);
  }

  if (calendarEmptyEl) {
    calendarEmptyEl.hidden = occurrences.length > 0;
  }
}

async function loadCalendarWeek() {
  if (calendarLoading || pageType !== "calendar") {
    return;
  }
  calendarLoading = true;
  try {
    const today = new Date();
    const baseStart = startOfWeekMonday(today);
    calendarWeekStart = new Date(baseStart);
    calendarWeekStart.setDate(baseStart.getDate() + calendarWeekOffset * 7);
    const startIso = toLocalIsoDate(calendarWeekStart);
    const endDate = new Date(calendarWeekStart);
    endDate.setDate(calendarWeekStart.getDate() + 6);
    const endIso = toLocalIsoDate(endDate);

    const params = new URLSearchParams({ start: startIso, end: endIso });
    const response = await fetch(buildUrl(`/api/calendar/events?${params}`));
    if (!response.ok) {
      setStatus("Failed to load calendar events.");
      renderCalendarWeek(calendarWeekStart, []);
      return;
    }
    const data = await response.json();
    renderCalendarWeek(calendarWeekStart, Array.isArray(data) ? data : []);
  } catch (err) {
    setStatus("Failed to load calendar events.");
  } finally {
    calendarLoading = false;
  }
}

async function deleteCalendarEvent(eventId) {
  try {
    const response = await fetch(buildUrl(`/api/calendar/events/${eventId}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("Failed to delete calendar event.");
      return;
    }
    void loadCalendarWeek();
  } catch (err) {
    setStatus("Failed to delete calendar event.");
  }
}

function initCalendarHandlers() {
  if (pageType !== "calendar") {
    return;
  }
  if (calendarPrevBtn) {
    calendarPrevBtn.addEventListener("click", () => {
      calendarWeekOffset -= 1;
      void loadCalendarWeek();
    });
  }
  if (calendarNextBtn) {
    calendarNextBtn.addEventListener("click", () => {
      calendarWeekOffset += 1;
      void loadCalendarWeek();
    });
  }
  if (calendarTodayBtn) {
    calendarTodayBtn.addEventListener("click", () => {
      calendarWeekOffset = 0;
      void loadCalendarWeek();
    });
  }
  if (calendarDaysEl) {
    calendarDaysEl.addEventListener("click", (event) => {
      const target = event.target.closest("[data-calendar-action=\"delete\"]");
      if (!target) {
        return;
      }
      const eventId = Number.parseInt(target.dataset.eventId || "", 10);
      if (!Number.isFinite(eventId)) {
        return;
      }
      if (!window.confirm("Delete this event?")) {
        return;
      }
      void deleteCalendarEvent(eventId);
    });
  }
}

function updateCalendarRecurrenceUI() {
  if (!calendarRecurrenceSelectEl || !calendarRepeatUntilFieldEl || !calendarRepeatUntilInputEl) {
    return;
  }
  const isWeekly = calendarRecurrenceSelectEl.value === "weekly";
  calendarRepeatUntilFieldEl.hidden = !isWeekly;
  calendarRepeatUntilInputEl.disabled = !isWeekly;
  if (!isWeekly) {
    calendarRepeatUntilInputEl.value = "";
  }
}

async function loadCalendarForm(eventId) {
  try {
    const response = await fetch(buildUrl(`/api/calendar/events/${eventId}`));
    if (!response.ok) {
      setStatus("Event not found.");
      return;
    }
    const event = await response.json();
    if (calendarTitleInputEl) {
      calendarTitleInputEl.value = event.title || "";
    }
    if (calendarCategorySelectEl) {
      calendarCategorySelectEl.value = event.category || "group";
    }
    if (calendarDateInputEl) {
      calendarDateInputEl.value = event.date_local || "";
    }
    if (calendarLocationInputEl) {
      calendarLocationInputEl.value = event.location || "";
    }
    if (calendarStartTimeInputEl) {
      calendarStartTimeInputEl.value = event.start_time_local || "";
    }
    if (calendarEndTimeInputEl) {
      calendarEndTimeInputEl.value = event.end_time_local || "";
    }
    if (calendarNotesInputEl) {
      calendarNotesInputEl.value = event.notes || "";
    }
    if (calendarRecurrenceSelectEl) {
      calendarRecurrenceSelectEl.value = event.recurrence || "none";
    }
    if (calendarRepeatUntilInputEl) {
      calendarRepeatUntilInputEl.value = event.recurrence_until_local || "";
    }
    updateCalendarRecurrenceUI();
  } catch (err) {
    setStatus("Failed to load event.");
  }
}

async function submitCalendarForm(eventId) {
  if (!calendarTitleInputEl || !calendarDateInputEl || !calendarStartTimeInputEl) {
    return;
  }
  const payload = {
    title: calendarTitleInputEl.value.trim(),
    date_local: calendarDateInputEl.value,
    start_time_local: calendarStartTimeInputEl.value,
    end_time_local: calendarEndTimeInputEl ? calendarEndTimeInputEl.value || null : null,
    location: calendarLocationInputEl ? calendarLocationInputEl.value.trim() || null : null,
    notes: calendarNotesInputEl ? calendarNotesInputEl.value.trim() || null : null,
    category: calendarCategorySelectEl ? calendarCategorySelectEl.value : "group",
    recurrence: calendarRecurrenceSelectEl ? calendarRecurrenceSelectEl.value : "none",
    recurrence_until_local: calendarRepeatUntilInputEl ? calendarRepeatUntilInputEl.value || null : null,
  };
  if (payload.recurrence !== "weekly") {
    payload.recurrence_until_local = null;
  }
  if (calendarSubmitBtn) {
    calendarSubmitBtn.disabled = true;
  }
  try {
    const response = await fetch(
      buildUrl(eventId ? `/api/calendar/events/${eventId}` : "/api/calendar/events"),
      {
        method: eventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error || "Failed to save event.");
      return;
    }
    window.location.href = buildUrl("/calendar");
  } catch (err) {
    setStatus("Failed to save event.");
  } finally {
    if (calendarSubmitBtn) {
      calendarSubmitBtn.disabled = false;
    }
  }
}

function initCalendarFormHandlers() {
  if (pageType !== "calendar-form" || !calendarFormEl) {
    return;
  }
  const eventId = Number.parseInt(bodyEl.dataset.eventId || "", 10);
  const isEdit = Number.isFinite(eventId) && eventId > 0;
  if (isEdit) {
    if (calendarFormTitleEl) {
      calendarFormTitleEl.textContent = "Edit event";
    }
    if (calendarFormSubtitleEl) {
      calendarFormSubtitleEl.textContent = "Update the details for this meetup or group.";
    }
    if (calendarDeleteBtn) {
      calendarDeleteBtn.hidden = false;
    }
    void loadCalendarForm(eventId);
  } else {
    if (calendarDateInputEl) {
      calendarDateInputEl.value = toLocalIsoDate(new Date());
    }
    updateCalendarRecurrenceUI();
  }
  if (calendarRecurrenceSelectEl) {
    calendarRecurrenceSelectEl.addEventListener("change", updateCalendarRecurrenceUI);
  }
  calendarFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitCalendarForm(isEdit ? eventId : null);
  });
  if (calendarDeleteBtn && isEdit) {
    calendarDeleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this event?")) {
        return;
      }
      await deleteCalendarEvent(eventId);
      window.location.href = buildUrl("/calendar");
    });
  }
}

function updateMilkExpressLedgerSubtotal() {
  if (!milkExpressLedgerCountEl || !milkExpressLedgerTotalEl) {
    return;
  }
  let totalMl = 0;
  milkExpressLedgerEntries.forEach((entry) => {
    const key = entry.client_event_id || entry.id || entry.timestamp_utc;
    if (!milkExpressLedgerSelections.has(key)) {
      return;
    }
    const { ml } = getMilkExpressAmounts(entry);
    if (Number.isFinite(ml)) {
      totalMl += ml;
    }
  });
  const count = milkExpressLedgerSelections.size;
  milkExpressLedgerCountEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  milkExpressLedgerTotalEl.textContent = formatMl(totalMl);
}

function updateMilkExpressLedgerTotalAll(entries) {
  if (!milkExpressLedgerTotalAllEl) {
    return;
  }
  const totalMl = entries.reduce((acc, entry) => {
    const { ml } = getMilkExpressAmounts(entry);
    return acc + (Number.isFinite(ml) ? ml : 0);
  }, 0);
  milkExpressLedgerTotalAllEl.textContent = `Total: ${formatMl(totalMl)}`;
}

function setMilkExpressLedgerEmptyState(message) {
  if (!milkExpressLedgerEmptyEl || !milkExpressLedgerTableEl) {
    return;
  }
  milkExpressLedgerEmptyEl.textContent = message;
  milkExpressLedgerEmptyEl.hidden = false;
  milkExpressLedgerTableEl.hidden = true;
  if (milkExpressLedgerSelectionEl) {
    milkExpressLedgerSelectionEl.hidden = true;
  }
}

function renderMilkExpressLedger(entries) {
  if (!milkExpressLedgerBodyEl || !milkExpressLedgerEmptyEl || !milkExpressLedgerTableEl) {
    return;
  }
  milkExpressLedgerEntries = entries;
  milkExpressLedgerSelections.clear();
  milkExpressLedgerBodyEl.innerHTML = "";
  updateMilkExpressLedgerTotalAll(entries);
  if (!entries.length) {
    setMilkExpressLedgerEmptyState("No milk express events in the last 48 hours.");
    updateMilkExpressLedgerSubtotal();
    return;
  }
  milkExpressLedgerEmptyEl.hidden = true;
  milkExpressLedgerTableEl.hidden = false;
  if (milkExpressLedgerSelectionEl) {
    milkExpressLedgerSelectionEl.hidden = false;
  }
  entries.forEach((entry, index) => {
    const key = entry.client_event_id || entry.id || `${entry.timestamp_utc}-${index}`;
    const { ml } = getMilkExpressAmounts(entry);
    const row = document.createElement("tr");
    row.dataset.entryId = key;

    const checkCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "ledger-check";
    checkbox.dataset.entryId = key;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        milkExpressLedgerSelections.add(key);
      } else {
        milkExpressLedgerSelections.delete(key);
      }
      if (milkExpressLedgerSelectAllEl) {
        const allChecked = milkExpressLedgerEntries.every((item, idx) => {
          const itemKey = item.client_event_id || item.id || `${item.timestamp_utc}-${idx}`;
          return milkExpressLedgerSelections.has(itemKey);
        });
        milkExpressLedgerSelectAllEl.checked = allChecked;
      }
      updateMilkExpressLedgerSubtotal();
    });
    checkCell.appendChild(checkbox);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTimestamp(entry.timestamp_utc);

    const valueCell = document.createElement("td");
    valueCell.textContent = formatMl(ml);

    row.append(checkCell, timeCell, valueCell);
    milkExpressLedgerBodyEl.appendChild(row);
  });
  if (milkExpressLedgerSelectAllEl) {
    milkExpressLedgerSelectAllEl.checked = false;
  }
  updateMilkExpressLedgerSubtotal();
}

async function loadMilkExpressLedger() {
  if (!milkExpressLedgerBodyEl) {
    return;
  }
  if (milkExpressLedgerRangeEl) {
    milkExpressLedgerRangeEl.textContent = "Last 48 hours";
  }
  const window = computeWindow(48);
  const params = {
    limit: 200,
    since: window.sinceIso,
    until: window.untilIso,
  };
  try {
    const cachedEntries = await listEntriesLocalSafe(params);
    if (cachedEntries) {
      const filteredCached = cachedEntries.filter((entry) => (
        isMilkExpressType(entry.type)
      ));
      renderMilkExpressLedger(filteredCached);
    }
    void syncNow();
    const entries = await loadEntriesWithFallback(params);
    const filtered = entries.filter((entry) => isMilkExpressType(entry.type));
    renderMilkExpressLedger(filtered);
  } catch (err) {
    setStatus(`Failed to load milk express entries: ${err.message || "unknown error"}`);
  }
}

function initMilkExpressLedgerHandlers() {
  if (milkExpressLedgerInitialized || pageType !== "milk-express") {
    return;
  }
  milkExpressLedgerInitialized = true;
  if (milkExpressLedgerSelectAllEl) {
    milkExpressLedgerSelectAllEl.addEventListener("change", () => {
      const shouldSelectAll = milkExpressLedgerSelectAllEl.checked;
      if (!milkExpressLedgerBodyEl) {
        return;
      }
      const checkboxes = milkExpressLedgerBodyEl.querySelectorAll("input[type=\"checkbox\"]");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = shouldSelectAll;
        const key = checkbox.dataset.entryId;
        if (key) {
          if (shouldSelectAll) {
            milkExpressLedgerSelections.add(key);
          } else {
            milkExpressLedgerSelections.delete(key);
          }
        }
      });
      updateMilkExpressLedgerSubtotal();
    });
  }
  if (milkExpressLedgerClearEl) {
    milkExpressLedgerClearEl.addEventListener("click", (event) => {
      event.preventDefault();
      if (!milkExpressLedgerBodyEl) {
        return;
      }
      milkExpressLedgerSelections.clear();
      const checkboxes = milkExpressLedgerBodyEl.querySelectorAll("input[type=\"checkbox\"]");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      if (milkExpressLedgerSelectAllEl) {
        milkExpressLedgerSelectAllEl.checked = false;
      }
      updateMilkExpressLedgerSubtotal();
    });
  }
}

function renderStats(entries) {
  if (!statFeedEl) {
    return;
  }
  let feedCount = 0;
  let weeCount = 0;
  let pooCount = 0;
  let feedTotalMl = 0;
  let todayFeedTotalMl = 0;
  let todayFeedCount = 0;
  let expressedTotalMl = 0;
  let formulaTotalMl = 0;
  const feedVolumeEntries = [];
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayStartTs = dayStart.getTime();
  entries.forEach((entry) => {
    if (isFeedType(entry.type)) {
      if (isBreastfeedInProgress(entry)) {
        return;
      }
      feedCount += 1;
      const feedMl = getFeedEntryTotalMl(entry);
      feedTotalMl += feedMl;
      const timestamp = new Date(entry.timestamp_utc);
      if (feedMl > 0 && !Number.isNaN(timestamp.getTime())) {
        const ts = timestamp.getTime();
        feedVolumeEntries.push({ ts, ml: feedMl });
        if (ts >= dayStartTs) {
          todayFeedTotalMl += feedMl;
          todayFeedCount += 1;
        }
      }
      if (typeof entry.expressed_ml === "number" && Number.isFinite(entry.expressed_ml)) {
        expressedTotalMl += entry.expressed_ml;
      }
      if (typeof entry.formula_ml === "number" && Number.isFinite(entry.formula_ml)) {
        formulaTotalMl += entry.formula_ml;
      }
    } else if (entry.type === "wee") {
      weeCount += 1;
    } else if (entry.type === "poo") {
      pooCount += 1;
    }
  });
  statFeedEl.textContent = String(feedCount);
  if (statNappyEl) {
    statNappyEl.textContent = String(weeCount + pooCount);
  }
  if (statNappyBreakdownEl) {
    statNappyBreakdownEl.textContent = `Wet ${weeCount} · Soiled ${pooCount}`;
  }
  if (statDailyFeedTotalEl) {
    statDailyFeedTotalEl.textContent = formatMl(todayFeedTotalMl);
  }
  if (statDailyFeedSubEl) {
    statDailyFeedSubEl.textContent = `Midnight-midnight · Avg / feed: ${formatAverageMl(todayFeedTotalMl, todayFeedCount)}`;
  }
  recentFeedVolumeEntries = feedVolumeEntries.sort((a, b) => a.ts - b.ts);
  latestFeedTotalMl = feedTotalMl;
  if (statFeedMlEl) {
    statFeedMlEl.textContent = formatMl(feedTotalMl);
  }
  if (statFeedBreakdownEl) {
    statFeedBreakdownEl.textContent = `Expressed ${formatMl(expressedTotalMl)} · Formula ${formatMl(formulaTotalMl)}`;
  }
}

function formatGoalDateLabel(value) {
  const parsed = parseDateInputValue(value);
  if (!parsed) {
    return value || "--";
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function renderGoalComparison() {
  if (!statGoalProgressEl || !statGoalDetailEl) {
    return;
  }
  if (!activeFeedingGoal) {
    statGoalProgressEl.textContent = "--";
    statGoalDetailEl.textContent = "Set a 24h goal";
    return;
  }
  const goalValue = Number.parseFloat(activeFeedingGoal.goal_ml);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    statGoalProgressEl.textContent = "--";
    statGoalDetailEl.textContent = "Set a 24h goal";
    return;
  }
  const percent = Math.round((latestFeedTotalMl / goalValue) * 100);
  statGoalProgressEl.textContent = `${percent}%`;
  statGoalDetailEl.textContent = `${formatMl(latestFeedTotalMl)} / ${formatMl(goalValue)}`;
}

function renderGoalHistory(goals) {
  if (!goalHistoryEl || !goalEmptyEl) {
    return;
  }
  goalHistoryEl.innerHTML = "";
  if (!goals.length) {
    goalEmptyEl.textContent = "No goals yet.";
    goalEmptyEl.style.display = "block";
    return;
  }
  goalEmptyEl.style.display = "none";
  goals.forEach((goal, index) => {
    const item = document.createElement("div");
    item.className = "goal-item";
    const metaWrap = document.createElement("div");
    const label = document.createElement("div");
    label.className = "goal-meta";
    const badge = activeFeedingGoal && goal.id === activeFeedingGoal.id
      ? "Active"
      : (index === 0 ? "Latest" : "Past");
    label.textContent = `${badge} · ${formatGoalDateLabel(goal.start_date)}`;
    const amount = document.createElement("div");
    amount.className = "goal-amount";
    amount.textContent = formatMl(Number.parseFloat(goal.goal_ml));
    metaWrap.appendChild(label);
    metaWrap.appendChild(amount);

    const actions = document.createElement("div");
    actions.className = "goal-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "goal-action-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", async () => {
      const nextAmount = window.prompt("24h goal (ml)", String(goal.goal_ml ?? ""));
      if (nextAmount === null) {
        return;
      }
      const parsedAmount = Number.parseFloat(nextAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setStatus("Goal must be a positive number");
        return;
      }
      const nextDate = window.prompt("Start date (YYYY-MM-DD)", goal.start_date || "");
      if (nextDate === null) {
        return;
      }
      try {
        await updateFeedingGoal(goal.id, {
          goal_ml: parsedAmount,
          start_date: nextDate.trim() || null,
        });
        await loadGoalHistory();
      } catch (err) {
        setStatus(`Error: ${err.message || "unable to update goal"}`);
      }
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "goal-action-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this goal?")) {
        return;
      }
      try {
        await deleteFeedingGoal(goal.id);
        await loadGoalHistory();
      } catch (err) {
        setStatus(`Error: ${err.message || "unable to delete goal"}`);
      }
    });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(metaWrap);
    item.appendChild(actions);
    goalHistoryEl.appendChild(item);
  });
}

function formatRangeLabel(since, until) {
  const pad = (value) => String(value).padStart(2, "0");
  const format = (value) => {
    return `${pad(value.getMonth() + 1)}/${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };
  return `${format(since)} - ${format(until)}`;
}

function renderStatsWindow(windowBounds) {
  if (!statWindowEl) {
    return;
  }
  statWindowEl.textContent = `Rolling 24h: ${formatRangeLabel(
    windowBounds.since,
    windowBounds.until,
  )}`;
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
  if (!userValid) {
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
    user_slug: activeUser || null,
  };
}

async function saveEntry(payload) {
  setStatus("Saving...");
  const now = new Date().toISOString();
  const entry = {
    ...payload,
    user_slug: activeUser,
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
      const response = await fetch(buildUrl(`/api/users/${activeUser}/entries`), {
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
    user_slug: (startInfo && startInfo.startedBy) || activeUser || null,
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
    user_slug: (startInfo && startInfo.startedBy) || activeUser || null,
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
  if (!userValid) {
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
    setBreastfeedStart(start, activeUser || null, payload.client_event_id);
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
  if (!userValid) {
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
    setTimedEventStart(start, normalizedType, activeUser || null, payload.client_event_id);
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
  if (!userValid) {
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
  const options = [...new Set([...baseOptions, ...customEventTypes])].filter(Boolean);
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
      ? String(entry.feed_duration_min)
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

async function saveFeedingGoal(payload) {
  setStatus("Saving goal...");
  try {
    const response = await fetch(buildUrl("/api/feeding-goals"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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
    setStatus("Goal saved");
  } catch (err) {
    setStatus("Error: network issue saving goal");
  }
}

async function updateFeedingGoal(goalId, payload) {
  setStatus("Updating goal...");
  const response = await fetch(buildUrl(`/api/feeding-goals/${goalId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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
  setStatus("Goal updated");
  return response.json();
}

async function deleteFeedingGoal(goalId) {
  setStatus("Deleting goal...");
  const response = await fetch(buildUrl(`/api/feeding-goals/${goalId}`), {
    method: "DELETE",
  });
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
  setStatus("Goal deleted");
}

async function loadBottles() {
  try {
    const bottles = await fetchBottles();
    bottlesCache = bottles;
    renderBottleList(bottles);
    renderBottleOptions();
    updateBottleResult();
    setStatus("");
  } catch (err) {
    setStatus(`Failed to load bottles: ${err.message || "unknown error"}`);
  }
}

async function loadGoalHistory() {
  const shouldShowLoading = pageType === "goals" && !hasLoadedFeedingGoals;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  try {
    const goals = await loadFeedingGoals(50);
    const currentGoal = await loadCurrentGoal();
    activeFeedingGoal = currentGoal;
    renderGoalHistory(goals);
    renderGoalComparison();
    if (goalStartDateInputEl && !goalStartDateInputEl.value) {
      goalStartDateInputEl.value = formatDateInputValue(new Date());
    }
  } catch (err) {
    setStatus(`Failed to load goals: ${err.message || "unknown error"}`);
  } finally {
    if (shouldShowLoading) {
      setLoadingState(false);
    }
  }
}

async function loadHomeEntries() {
  const shouldShowLoading = !hasLoadedHomeEntries;
  if (shouldShowLoading) {
    setLoadingState(true);
  }
  try {
    const statsWindow = computeWindow(24);
    const chartWindow = computeWindow(6);
    const cachedEntries = await listEntriesLocalSafe({
      limit: 200,
      since: statsWindow.sinceIso,
      until: statsWindow.untilIso,
    });
    if (cachedEntries) {
      const cachedChartEntries = cachedEntries.filter((entry) => entryOverlapsChartWindow(entry, chartWindow));
      renderChart(cachedChartEntries, chartWindow);
      renderStats(cachedEntries);
      renderGoalComparison();
      renderStatsWindow(statsWindow);
      renderLastActivity(cachedEntries);
      renderLastByType(cachedEntries);
    }
    const cachedLatest = await listEntriesLocalSafe({ limit: 1 });
    if (cachedLatest) {
      renderLatestEntry(cachedLatest[0] || null);
    }

    void syncNow();

    const [entries, goals, currentGoal, latestEntry] = await Promise.all([
      loadEntriesWithFallback({
        limit: 200,
        since: statsWindow.sinceIso,
        until: statsWindow.untilIso,
      }),
      loadFeedingGoals(1).catch(() => []),
      loadCurrentGoal(),
      loadLatestEntryWithFallback(),
    ]);
    activeFeedingGoal = currentGoal;
    const chartEntries = entries.filter((entry) => entryOverlapsChartWindow(entry, chartWindow));
    renderChart(chartEntries, chartWindow);
    renderStats(entries);
    renderGoalComparison();
    renderStatsWindow(statsWindow);
    renderLastActivity(entries);
    renderLastByType(entries);
    renderLatestEntry(latestEntry || null);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  } finally {
    if (shouldShowLoading) {
      setLoadingState(false);
    }
    hasLoadedHomeEntries = true;
  }
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
    const dayWindow = getSummaryDayWindow(summaryDate);
    const cachedEntries = await listEntriesLocalSafe({
      limit: 200,
      since: dayWindow.sinceIso,
      until: dayWindow.untilIso,
    });
    if (cachedEntries) {
      summaryEntries = cachedEntries;
      renderSummaryStats(cachedEntries);
      renderMilkExpressSummary(cachedEntries);
    }

    void syncNow();

    const [entries] = await Promise.all([
      loadEntriesWithFallback({
        limit: 200,
        since: dayWindow.sinceIso,
        until: dayWindow.untilIso,
      }),
      ensureMilkExpressAllEntries(),
    ]);
    summaryEntries = entries;
    renderSummaryStats(entries);
    renderMilkExpressSummary(entries);
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
  if (summaryInsightsAnchor === anchorIso && summaryInsightsEntries.length) {
    renderSummaryInsights(summaryInsightsEntries, anchorEnd);
    return;
  }
  if (summaryInsightsLoading) {
    return summaryInsightsLoading;
  }
  summaryInsightsLoading = fetchAllEntriesUntil(anchorIso)
    .then((entries) => {
      summaryInsightsEntries = entries;
      summaryInsightsAnchor = anchorIso;
      renderSummaryInsights(entries, anchorEnd);
      return entries;
    })
    .catch((err) => {
      setStatus(`Failed to load insights: ${err.message || "unknown error"}`);
      summaryInsightsEntries = [];
    })
    .finally(() => {
      summaryInsightsLoading = null;
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
    babyDob = data.dob || null;
    feedIntervalMinutes = Number.isInteger(data.feed_interval_min)
      ? data.feed_interval_min
      : null;
    customEventTypes = Array.isArray(data.custom_event_types)
      ? data.custom_event_types
      : [];
    if (dobInputEl) {
      dobInputEl.value = babyDob || "";
    }
    if (intervalInputEl) {
      intervalInputEl.value = feedIntervalMinutes
        ? String(feedIntervalMinutes / 60)
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
    if (pushcutFeedDueInputEl) {
      pushcutFeedDueInputEl.value = data.pushcut_feed_due_url || "";
    }
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
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
    babyDob = data.dob || null;
    feedIntervalMinutes = Number.isInteger(data.feed_interval_min)
      ? data.feed_interval_min
      : null;
    customEventTypes = Array.isArray(data.custom_event_types)
      ? data.custom_event_types
      : [];
    if (entryWebhookInputEl) {
      entryWebhookInputEl.value = data.entry_webhook_url || "";
    }
    if (homeKpisWebhookInputEl) {
      homeKpisWebhookInputEl.value = data.home_kpis_webhook_url || "";
    }
    if (defaultUserInputEl) {
      defaultUserInputEl.value = data.default_user_slug || "";
    }
    if (pushcutFeedDueInputEl) {
      pushcutFeedDueInputEl.value = data.pushcut_feed_due_url || "";
    }
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

applyTheme(getPreferredTheme());
initNavMenuHandlers();
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
scheduleSync();
