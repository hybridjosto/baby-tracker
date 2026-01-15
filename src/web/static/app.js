const statusEl = document.getElementById("status");
const bodyEl = document.body;
let activeUser = bodyEl.dataset.user || "";
let userValid = bodyEl.dataset.userValid === "true";
const pageType = bodyEl.dataset.page || "home";
const logFilterType = bodyEl.dataset.logType || "";
const logWindowHours = Number.parseInt(bodyEl.dataset.logWindowHours || "", 10);

const THEME_KEY = "baby-tracker-theme";
const USER_KEY = "baby-tracker-user";
const BREASTFEED_TIMER_KEY = "baby-tracker-breastfeed-start";
const USER_RE = /^[a-z0-9-]{1,24}$/;
const themeToggleBtn = document.getElementById("theme-toggle");
const userFormEl = document.getElementById("user-form");
const userInputEl = document.getElementById("user-input");
const userMessageEl = document.getElementById("today-label")
  || document.getElementById("user-message");
const userChipEl = document.getElementById("user-chip");

const feedBtn = document.getElementById("log-feed");
const feedMenu = document.getElementById("feed-menu");
const feedBackdrop = document.getElementById("feed-backdrop");
const breastfeedBtn = document.getElementById("log-breastfeed");
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
const summaryTotalEl = document.getElementById("summary-total");
const summaryTotalAvgEl = document.getElementById("summary-total-avg");
const summaryFeedEl = document.getElementById("summary-feed");
const summaryFeedAvgEl = document.getElementById("summary-feed-avg");
const summaryWeeEl = document.getElementById("summary-wee");
const summaryWeeAvgEl = document.getElementById("summary-wee-avg");
const summaryPooEl = document.getElementById("summary-poo");
const summaryPooAvgEl = document.getElementById("summary-poo-avg");

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
const statCardEls = document.querySelectorAll(".stat-card[data-log-type]");

const settingsFormEl = document.getElementById("settings-form");
const dobInputEl = document.getElementById("dob-input");
const ageOutputEl = document.getElementById("age-output");
const intervalInputEl = document.getElementById("interval-input");
const customTypeInputEl = document.getElementById("custom-type-input");
const customTypeAddBtn = document.getElementById("custom-type-add");
const customTypeListEl = document.getElementById("custom-type-list");
const customTypeHintEl = document.getElementById("custom-type-hint");
const customTypeEmptyEl = document.getElementById("custom-type-empty");

let babyDob = null;
let feedIntervalMinutes = null;
let customEventTypes = [];

const CUSTOM_TYPE_RE = /^[A-Za-z0-9][A-Za-z0-9 /-]{0,31}$/;

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
  return feedIntervalMinutes;
}

function getBreastfeedStorageKey() {
  if (!activeUser) {
    return null;
  }
  return `${BREASTFEED_TIMER_KEY}:${activeUser}`;
}

function getBreastfeedStart() {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) {
    window.localStorage.removeItem(key);
    return null;
  }
  return start;
}

function setBreastfeedStart(start) {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return;
  }
  window.localStorage.setItem(key, start.toISOString());
}

function clearBreastfeedStart() {
  const key = getBreastfeedStorageKey();
  if (!key) {
    return;
  }
  window.localStorage.removeItem(key);
}

function updateBreastfeedButton() {
  if (!breastfeedBtn) {
    return;
  }
  const start = getBreastfeedStart();
  if (start) {
    breastfeedBtn.textContent = "End breastfed";
    breastfeedBtn.title = `Started ${formatTimestamp(start.toISOString())}`;
  } else {
    breastfeedBtn.textContent = "Start breastfed";
    breastfeedBtn.removeAttribute("title");
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
  customEventTypes.forEach((type) => {
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
  if (!customEventTypes.length) {
    miscMenu.setAttribute("aria-hidden", "true");
  }
}

function applyCustomEventTypes() {
  renderCustomTypeList();
  renderMiscMenu();
  renderSummaryTypeOptions();
  if (miscBtn) {
    toggleDisabled(miscBtn, !userValid || customEventTypes.length === 0);
  }
  if (!customEventTypes.length) {
    closeMiscMenu();
  }
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
let summaryInitialized = false;
let nextFeedTimer = null;
let refreshTimer = null;
let summaryDate = null;
let summaryEntries = [];
let summaryType = "all";

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
  bindTimestampPopup(nextFeedEl);
  bindTimestampPopup(lastWeeEl);
  bindTimestampPopup(lastPooEl);
  if (feedBtn) {
    feedBtn.addEventListener("click", toggleFeedMenu);
  }
  if (breastfeedBtn) {
    breastfeedBtn.addEventListener("click", handleBreastfeedToggle);
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
      }
    });
  }
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
  toggleDisabled(miscBtn, !userValid || customEventTypes.length === 0);
  toggleDisabled(pooBtn, !userValid);
  toggleDisabled(weeBtn, !userValid);
  toggleDisabled(refreshBtn, !userValid);
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
  updateBreastfeedButton();
  if (userFormEl) {
    userFormEl.hidden = userValid;
  }
  if (!userValid) {
    closeFeedMenu();
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
  if (pageType === "summary") {
    initSummaryHandlers();
    loadSummaryEntries();
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
    const response = await fetch(`/api/users/${activeUser}/entries/import`, {
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

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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

function formatAverageInterval(total) {
  if (!total) {
    return "--";
  }
  const hours = 24 / total;
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  return `${hours.toFixed(1)}h`;
}

function renderSummaryStats(entries) {
  if (!summaryTotalEl || !summaryFeedEl || !summaryWeeEl || !summaryPooEl) {
    return;
  }
  let total = 0;
  let feed = 0;
  let wee = 0;
  let poo = 0;
  entries.forEach((entry) => {
    total += 1;
    if (entry.type === "feed") {
      feed += 1;
    } else if (entry.type === "wee") {
      wee += 1;
    } else if (entry.type === "poo") {
      poo += 1;
    }
  });
  summaryTotalEl.textContent = String(total);
  summaryFeedEl.textContent = String(feed);
  summaryWeeEl.textContent = String(wee);
  summaryPooEl.textContent = String(poo);
  if (summaryTotalAvgEl) {
    summaryTotalAvgEl.textContent = `Avg / 24h: ${formatAverageInterval(total)}`;
  }
  if (summaryFeedAvgEl) {
    summaryFeedAvgEl.textContent = `Avg / 24h: ${formatAverageInterval(feed)}`;
  }
  if (summaryWeeAvgEl) {
    summaryWeeAvgEl.textContent = `Avg / 24h: ${formatAverageInterval(wee)}`;
  }
  if (summaryPooAvgEl) {
    summaryPooAvgEl.textContent = `Avg / 24h: ${formatAverageInterval(poo)}`;
  }
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
  const baseOptions = ["all", "feed", "wee", "poo"];
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
    `/api/entries${buildQuery(params)}`,
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
    if (!["feed", "poo", "wee"].includes(entry.type)) {
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

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editEntry(entry));

    const timeBtn = document.createElement("button");
    timeBtn.textContent = "Edit time";
    timeBtn.addEventListener("click", () => editEntryTime(entry));

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEntry(entry));

    amounts.forEach(({ label, value }) => {
      const amountEl = document.createElement("span");
      amountEl.className = "entry-meta";
      amountEl.textContent = `${label} ${value} ml`;
      right.appendChild(amountEl);
    });
    right.appendChild(editBtn);
    right.appendChild(timeBtn);
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

function buildLogTypeUrl(type) {
  if (!type) {
    return "/log";
  }
  return `/log/${type}`;
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
  };
}

async function saveEntry(payload) {
  setStatus("Saving...");
  try {
    const response = await fetch(`/api/users/${activeUser}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      setStatus("Already saved (duplicate tap)");
      if (pageType === "log") {
        await loadLogEntries();
      } else {
        await loadHomeEntries();
      }
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
    if (pageType === "log") {
      await loadLogEntries();
    } else {
      await loadHomeEntries();
    }
  } catch (err) {
    setStatus("Error: network issue saving entry");
  }
}

async function addEntry(type) {
  const payload = buildEntryPayload(type);
  if (type === "feed") {
    const minutesInput = window.prompt("Feed duration (minutes)", "");
    if (minutesInput === null) {
      setStatus("");
      return;
    }
    const trimmed = minutesInput.trim();
    if (trimmed !== "") {
      const minutes = Number.parseFloat(trimmed);
      if (!Number.isFinite(minutes) || minutes < 0) {
        setStatus("Duration must be a non-negative number");
        return;
      }
      payload.feed_duration_min = minutes;
    }
  }
  const noteInput = window.prompt("Comment (optional)", "");
  if (noteInput === null) {
    setStatus("");
    return;
  }
  const trimmedNote = noteInput.trim();
  if (trimmedNote) {
    payload.notes = trimmedNote;
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
async function handleBreastfeedToggle() {
  if (!userValid) {
    setStatus("Choose a user below to start logging.");
    return;
  }
  const start = getBreastfeedStart();
  if (!start) {
    setBreastfeedStart(new Date());
    updateBreastfeedButton();
    closeFeedMenu();
    setStatus("Breastfeed started");
    return;
  }
  const now = new Date();
  const durationMinutes = Math.max(0, Math.round((now - start) / 60000));
  clearBreastfeedStart();
  updateBreastfeedButton();
  closeFeedMenu();
  const payload = buildEntryPayload("feed");
  payload.feed_duration_min = durationMinutes;
  payload.notes = "Breastfed";
  await saveEntry(payload);
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

async function editEntry(entry) {
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
  if (nextType === "feed") {
    const currentDuration =
      entry.feed_duration_min !== null && entry.feed_duration_min !== undefined
        ? String(entry.feed_duration_min)
        : "";
    const durationInput = window.prompt("Feed duration (minutes)", currentDuration);
    if (durationInput === null) {
      return;
    }
    const trimmed = durationInput.trim();
    if (trimmed === "") {
      payload.feed_duration_min = null;
    } else {
      const minutes = Number.parseFloat(trimmed);
      if (!Number.isFinite(minutes) || minutes < 0) {
        setStatus("Duration must be a non-negative number");
        return;
      }
      payload.feed_duration_min = minutes;
    }
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
  } else if (entry.feed_duration_min !== null && entry.feed_duration_min !== undefined) {
    payload.feed_duration_min = null;
  }
  if (nextType !== "feed") {
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

async function editEntryTime(entry) {
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

  const response = await fetch(`/api/entries/${entry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp_utc: nextDate.toISOString() }),
  });

  if (response.ok) {
    setStatus("Updated time");
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

async function loadSummaryEntries() {
  if (!userValid) {
    return;
  }
  try {
    if (!summaryDate) {
      setSummaryDate(new Date());
    }
    const dayWindow = getSummaryDayWindow(summaryDate);
    const entries = await fetchEntries({
      limit: 400,
      since: dayWindow.sinceIso,
      until: dayWindow.untilIso,
    });
    summaryEntries = entries;
    renderSummaryStats(entries);
    renderSummaryChart(entries, summaryType);
  } catch (err) {
    setStatus(`Failed to load entries: ${err.message || "unknown error"}`);
  }
}

async function loadLogEntries() {
  if (!userValid) {
    return;
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
    const entries = await fetchEntries(params);
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
  if (summaryLinkEl) {
    summaryLinkEl.classList.toggle("disabled", !userValid);
    summaryLinkEl.href = userValid ? "/summary" : "#";
  }
}

async function loadBabySettings() {
  try {
    const response = await fetch("/api/settings");
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
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

async function saveBabySettings(patch) {
  try {
    const response = await fetch("/api/settings", {
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
    applyCustomEventTypes();
    updateAgeDisplay();
    updateNextFeed();
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

applyTheme(getPreferredTheme());
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", toggleTheme);
}
if (userFormEl) {
  userFormEl.addEventListener("submit", handleUserSave);
}
void loadBabySettings();
initializeUser();
