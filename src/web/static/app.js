const statusEl = document.getElementById("status");
const bodyEl = document.body;
const activeUser = bodyEl.dataset.user || "";
const userValid = bodyEl.dataset.userValid === "true";
const pageType = bodyEl.dataset.page || "home";

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
const lastWeeEl = document.getElementById("last-wee");
const lastPooEl = document.getElementById("last-poo");

const CHART_CONFIG = {
  width: 360,
  height: 150,
  paddingX: 16,
  axisY: 122,
  feedY: 70,
  pooY: 100,
  weeY: 40,
};

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

  lastFeedEl.textContent = latestByType.feed
    ? formatTimestamp(latestByType.feed.timestamp_utc)
    : "--";
  lastWeeEl.textContent = latestByType.wee
    ? formatTimestamp(latestByType.wee.timestamp_utc)
    : "--";
  lastPooEl.textContent = latestByType.poo
    ? formatTimestamp(latestByType.poo.timestamp_utc)
    : "--";
}

async function addEntry(type) {
  setStatus("Saving...");
  const payload = {
    type,
    timestamp_utc: new Date().toISOString(),
    client_event_id: generateId(),
  };
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

  const response = await fetch(`/api/entries/${entry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: nextType, timestamp_utc: nextTime }),
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
    if (userValid) {
      logLinkEl.href = `/${activeUser}/log`;
    } else {
      logLinkEl.classList.add("disabled");
      logLinkEl.href = "#";
    }
  }
  if (homeLinkEl) {
    if (userValid) {
      homeLinkEl.href = `/${activeUser}`;
    } else {
      homeLinkEl.classList.add("disabled");
      homeLinkEl.href = "#";
    }
  }
}

initLinks();

if (!userValid) {
  if (feedBtn) {
    feedBtn.classList.add("disabled");
  }
  if (nappyBtn) {
    nappyBtn.classList.add("disabled");
  }
  if (pooBtn) {
    pooBtn.classList.add("disabled");
  }
  if (weeBtn) {
    weeBtn.classList.add("disabled");
  }
  setStatus("Choose a valid /<name> URL to start logging.");
} else if (pageType === "home") {
  feedBtn.addEventListener("click", () => addEntry("feed"));
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
  loadHomeEntries();
} else if (pageType === "log") {
  loadLogEntries();
}
