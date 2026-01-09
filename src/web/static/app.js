const statusEl = document.getElementById("status");
const bodyEl = document.body;
let activeUser = bodyEl.dataset.user || "";
let userValid = bodyEl.dataset.userValid === "true";
const pageType = bodyEl.dataset.page || "home";

const THEME_KEY = "baby-tracker-theme";
const USER_KEY = "baby-tracker-user";
const FEED_INTERVAL_KEY = "baby-tracker-feed-interval-min";
const DOB_KEY = "baby-tracker-dob";
const USER_RE = /^[a-z0-9-]{1,24}$/;
const themeToggleBtn = document.getElementById("theme-toggle");
const userFormEl = document.getElementById("user-form");
const userInputEl = document.getElementById("user-input");
const userMessageEl = document.getElementById("today-label")
  || document.getElementById("user-message");
const userChipEl = document.getElementById("user-chip");

const feedBtn = document.getElementById("log-feed");
const nappyBtn = document.getElementById("log-nappy");
const pooBtn = document.getElementById("log-poo");
const weeBtn = document.getElementById("log-wee");
const nappyMenu = document.getElementById("nappy-menu");
const nappyBackdrop = document.getElementById("nappy-backdrop");
const logLinkEl = document.getElementById("log-link");
const homeLinkEl = document.getElementById("home-link");

const chartSvg = document.getElementById("history-chart");
const chartEmptyEl = document.getElementById("chart-empty");
const logListEl = document.getElementById("log-entries");
const logEmptyEl = document.getElementById("log-empty");
const statFeedEl = document.getElementById("stat-feed");
const statWeeEl = document.getElementById("stat-wee");
const statPooEl = document.getElementById("stat-poo");
const statWindowEl = document.getElementById("stat-window");
const lastActivityEl = document.getElementById("last-activity");
const lastFeedEl = document.getElementById("last-feed");
const nextFeedEl = document.getElementById("next-feed");
const lastWeeEl = document.getElementById("last-wee");
const lastPooEl = document.getElementById("last-poo");

const settingsFormEl = document.getElementById("settings-form");
const dobInputEl = document.getElementById("dob-input");
const ageOutputEl = document.getElementById("age-output");
const intervalInputEl = document.getElementById("interval-input");

const CHART_CONFIG = {
  width: 360,
  height: 150,
  paddingX: 16,
  axisY: 122,
  feedY: 70,
  pooY: 100,
  weeY: 40,
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
  const raw = window.localStorage.getItem(FEED_INTERVAL_KEY);
  if (!raw) {
    return null;
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    return null;
  }
  return value;
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
  const dob = parseDob(dobInputEl ? dobInputEl.value : "");
  ageOutputEl.textContent = formatAge(dob);
}

function updateUserDisplay() {
  if (userMessageEl) {
    userMessageEl.textContent = userValid
      ? `Logging as ${activeUser}`
      : "Choose a user to start logging.";
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
let nextFeedTimer = null;

function initHomeHandlers() {
  if (homeInitialized || pageType !== "home") {
    return;
  }
  homeInitialized = true;
  bindTimestampPopup(lastFeedEl);
  bindTimestampPopup(nextFeedEl);
  bindTimestampPopup(lastWeeEl);
  bindTimestampPopup(lastPooEl);
  if (feedBtn) {
    feedBtn.addEventListener("click", () => addEntry("feed"));
  }
  if (nappyBtn) {
    nappyBtn.addEventListener("click", toggleNappyMenu);
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNappyMenu();
    }
  });
  if (!nextFeedTimer) {
    nextFeedTimer = window.setInterval(updateNextFeed, 60000);
  }
}

function initLogHandlers() {
  if (logInitialized || pageType !== "log") {
    return;
  }
  logInitialized = true;
}

function initSettingsHandlers() {
  if (settingsInitialized || pageType !== "settings") {
    return;
  }
  settingsInitialized = true;
  if (dobInputEl) {
    const storedDob = window.localStorage.getItem(DOB_KEY);
    if (storedDob) {
      dobInputEl.value = storedDob;
    }
    updateAgeDisplay();
    dobInputEl.addEventListener("change", () => {
      const value = dobInputEl.value;
      if (value) {
        window.localStorage.setItem(DOB_KEY, value);
      } else {
        window.localStorage.removeItem(DOB_KEY);
      }
      updateAgeDisplay();
    });
  }
  if (intervalInputEl) {
    const storedInterval = getFeedIntervalMinutes();
    if (storedInterval) {
      intervalInputEl.value = String(storedInterval / 60);
    }
    intervalInputEl.addEventListener("change", () => {
      const nextValue = Number.parseFloat(intervalInputEl.value);
      if (Number.isNaN(nextValue) || nextValue <= 0) {
        window.localStorage.removeItem(FEED_INTERVAL_KEY);
        intervalInputEl.value = "";
      } else {
        const minutes = Math.round(nextValue * 60);
        window.localStorage.setItem(FEED_INTERVAL_KEY, String(minutes));
      }
    });
  }
  if (settingsFormEl) {
    settingsFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  }
}

function applyUserState() {
  if (pageType === "settings") {
    initSettingsHandlers();
    return;
  }
  toggleDisabled(feedBtn, !userValid);
  toggleDisabled(nappyBtn, !userValid);
  toggleDisabled(pooBtn, !userValid);
  toggleDisabled(weeBtn, !userValid);
  initLinks();
  updateUserDisplay();
  if (userFormEl) {
    userFormEl.hidden = userValid;
  }
  if (!userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  setStatus("");
  if (pageType === "home") {
    initHomeHandlers();
    loadHomeEntries();
  }
  if (pageType === "log") {
    initLogHandlers();
    loadLogEntries();
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
    if (stored) {
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
    openNappyMenu();
  }
}

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message || "";
  }
}

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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

function updateNextFeed() {
  if (!nextFeedEl) {
    return;
  }
  const intervalMinutes = getFeedIntervalMinutes();
  const lastTimestamp = lastFeedEl ? lastFeedEl.dataset.timestamp : null;
  if (!intervalMinutes || !lastTimestamp) {
    nextFeedEl.textContent = "--";
    nextFeedEl.removeAttribute("data-timestamp");
    return;
  }
  const lastDate = new Date(lastTimestamp);
  if (Number.isNaN(lastDate.getTime())) {
    nextFeedEl.textContent = "--";
    nextFeedEl.removeAttribute("data-timestamp");
    return;
  }
  const nextDate = new Date(lastDate.getTime() + intervalMinutes * 60000);
  nextFeedEl.textContent = formatTimeUntil(nextDate);
  nextFeedEl.dataset.timestamp = nextDate.toISOString();
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

function normalizeEntriesResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.entries)) {
    return data.entries;
  }
  return [];
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
    `/api/users/${activeUser}/entries${buildQuery(params)}`,
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
  const { width, height, paddingX, axisY, feedY, pooY, weeY } = CHART_CONFIG;

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

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", height - 8);
    text.setAttribute("fill", "#8b857e");
    text.setAttribute("font-size", "10");
    text.setAttribute("text-anchor", "middle");
    text.textContent = label;
    chartSvg.appendChild(text);
  });

  const startMs = windowBounds.since.getTime();
  const spanMs = windowBounds.until.getTime() - startMs;

  entries.forEach((entry) => {
    const timestamp = new Date(entry.timestamp_utc);
    if (Number.isNaN(timestamp.getTime())) {
      return;
    }
    const ratio = (timestamp.getTime() - startMs) / spanMs;
    if (ratio < 0 || ratio > 1) {
      return;
    }
    const x = paddingX + ratio * (width - paddingX * 2);
    let y = pooY;
    let color = "#fbbf24";
    if (entry.type === "feed") {
      y = feedY;
      color = "#13ec5b";
    } else if (entry.type === "wee") {
      y = weeY;
      color = "#7dd3fc";
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
    if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
      const durationEl = document.createElement("div");
      durationEl.className = "entry-meta";
      durationEl.textContent = `Duration ${entry.feed_duration_min} min`;
      left.appendChild(durationEl);
    }

    const right = document.createElement("div");
    right.className = "log-actions";

    const amountEl = document.createElement("span");
    amountEl.className = "entry-meta";
    if (entry.amount_ml) {
      amountEl.textContent = `${entry.amount_ml} ml`;
    }

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editEntry(entry));

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEntry(entry));

    if (amountEl.textContent) {
      right.appendChild(amountEl);
    }
    right.appendChild(editBtn);
    right.appendChild(delBtn);
    item.appendChild(left);
    item.appendChild(right);
    logListEl.appendChild(item);
  });
}

function renderStats(entries) {
  if (!statFeedEl || !statWeeEl || !statPooEl) {
    return;
  }
  let feedCount = 0;
  let weeCount = 0;
  let pooCount = 0;
  entries.forEach((entry) => {
    if (entry.type === "feed") {
      feedCount += 1;
    } else if (entry.type === "wee") {
      weeCount += 1;
    } else if (entry.type === "poo") {
      pooCount += 1;
    }
  });
  statFeedEl.textContent = String(feedCount);
  statWeeEl.textContent = String(weeCount);
  statPooEl.textContent = String(pooCount);
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

async function addEntry(type) {
  setStatus("Saving...");
  const payload = {
    type,
    timestamp_utc: new Date().toISOString(),
    client_event_id: generateId(),
  };
  if (type === "feed") {
    const minutesInput = window.prompt("Feed duration (minutes)", "");
    if (minutesInput === null) {
      setStatus("");
      return;
    }
    const trimmed = minutesInput.trim();
    if (trimmed !== "") {
      const minutes = Number.parseInt(trimmed, 10);
      if (Number.isNaN(minutes) || minutes < 0) {
        setStatus("Duration must be a non-negative number");
        return;
      }
      payload.feed_duration_min = minutes;
    }
  }
  try {
    const response = await fetch(`/api/users/${activeUser}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      setStatus("Already saved (duplicate tap)");
      await loadHomeEntries();
      return;
    }

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

    setStatus("Saved");
    await loadHomeEntries();
  } catch (err) {
    setStatus("Error: network issue saving entry");
  }
}

async function editEntry(entry) {
  const nextType = window.prompt("Type (feed, poo, or wee)", entry.type);
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
  if (nextType === "feed") {
    const currentDuration = entry.feed_duration_min ?? "";
    const durationInput = window.prompt("Feed duration (minutes)", String(currentDuration));
    if (durationInput === null) {
      return;
    }
    const trimmed = durationInput.trim();
    if (trimmed === "") {
      payload.feed_duration_min = null;
    } else {
      const minutes = Number.parseInt(trimmed, 10);
      if (Number.isNaN(minutes) || minutes < 0) {
        setStatus("Duration must be a non-negative number");
        return;
      }
      payload.feed_duration_min = minutes;
    }
  } else if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
    payload.feed_duration_min = null;
  }

  const response = await fetch(`/api/entries/${entry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    setStatus("Updated");
    if (pageType === "log") {
      await loadLogEntries();
    } else {
      await loadHomeEntries();
    }
  } else {
    const err = await response.json();
    setStatus(`Error: ${err.error || "unknown"}`);
  }
}

async function deleteEntry(entry) {
  if (!window.confirm("Delete this entry?")) {
    return;
  }
  const response = await fetch(`/api/entries/${entry.id}`, {
    method: "DELETE",
  });
  if (response.status === 204) {
    setStatus("Deleted");
    if (pageType === "log") {
      await loadLogEntries();
    } else {
      await loadHomeEntries();
    }
  } else {
    const err = await response.json();
    setStatus(`Error: ${err.error || "unknown"}`);
  }
}

async function loadHomeEntries() {
  if (!userValid) {
    return;
  }
  try {
    const statsWindow = computeWindow(24);
    const chartWindow = computeWindow(6);
    const entries = await fetchEntries({
      limit: 200,
      since: statsWindow.sinceIso,
      until: statsWindow.untilIso,
    });
    const chartEntries = entries.filter((entry) => {
      const ts = new Date(entry.timestamp_utc);
      return ts >= chartWindow.since && ts <= chartWindow.until;
    });
    renderChart(chartEntries, chartWindow);
    renderStats(entries);
    renderStatsWindow(statsWindow);
    renderLastActivity(entries);
    renderLastByType(entries);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  }
}

async function loadLogEntries() {
  if (!userValid) {
    return;
  }
  try {
    const entries = await fetchEntries({ limit: 200 });
    renderLogEntries(entries);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  }
}

function initLinks() {
  if (logLinkEl) {
    logLinkEl.classList.toggle("disabled", !userValid);
    logLinkEl.href = userValid ? "/log" : "#";
  }
  if (homeLinkEl) {
    homeLinkEl.classList.toggle("disabled", !userValid);
    homeLinkEl.href = userValid ? "/" : "#";
  }
}

applyTheme(getPreferredTheme());
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}
if (userFormEl) {
  userFormEl.addEventListener("submit", handleUserSave);
}
initializeUser();
