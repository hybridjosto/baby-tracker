const bodyEl = document.body;
const dataset = bodyEl ? bodyEl.dataset : {};

const statusEl = document.getElementById("status");
const pageType = dataset.page || "home";
const logFilterType = dataset.logType || "";
const logWindowHours = Number.parseInt(dataset.logWindowHours || "", 10);
const basePath = dataset.basePath || "";
const buildUrl = (path) => `${basePath}${path}`;

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
const CUSTOM_TYPE_MAX_LENGTH = 32;
const MILK_EXPRESS_TYPE = "milk express";
const SLEEP_GANTT_DEFAULT_OVERLAYS = new Set(["feed", "cry", "wee", "poo"]);
const SLEEP_GANTT_TYPE_COLORS = {
  sleep: "#7c83ff",
  feed: "#13ec5b",
  cry: "#fb7185",
  wee: "#7dd3fc",
  poo: "#fbbf24",
};
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

export {
  basePath,
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
  USER_RE,
};
