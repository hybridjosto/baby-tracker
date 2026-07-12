(() => {
  const body = document.body;
  const basePath = body.dataset.basePath || "";
  const buildUrl = (path) => `${basePath}${path}`;

  const themeToggle = document.getElementById("theme-toggle");
  const navMenuToggle = document.getElementById("nav-menu-toggle");
  const navMenuPanel = document.getElementById("nav-menu-panel");
  const statusEl = document.getElementById("status");
  const remainingEl = document.getElementById("nappy-stock-remaining");
  const usedEl = document.getElementById("nappy-stock-used");
  const rateEl = document.getElementById("nappy-stock-rate");
  const alertEl = document.getElementById("nappy-stock-alert");
  const alertTitleEl = document.getElementById("nappy-stock-alert-title");
  const alertDetailEl = document.getElementById("nappy-stock-alert-detail");
  const forecastEl = document.getElementById("nappy-stock-forecast");
  const formEl = document.getElementById("nappy-stock-form");
  const formTitleEl = document.getElementById("nappy-stock-form-title");
  const totalEl = document.getElementById("nappy-stock-total");
  const thresholdEl = document.getElementById("nappy-stock-threshold");
  const addedAtEl = document.getElementById("nappy-stock-added-at");
  const notesEl = document.getElementById("nappy-stock-notes");
  const saveEl = document.getElementById("nappy-stock-save");
  const cancelEditEl = document.getElementById("nappy-stock-cancel-edit");
  const formHintEl = document.getElementById("nappy-stock-form-hint");
  const historyEl = document.getElementById("nappy-stock-history");
  const emptyEl = document.getElementById("nappy-stock-empty");
  const adjustCountEl = document.getElementById("nappy-stock-adjust-count");
  const incrementEl = document.getElementById("nappy-stock-increment");
  const decrementEl = document.getElementById("nappy-stock-decrement");
  const editLatestEl = document.getElementById("nappy-stock-edit-latest");
  const adjustHintEl = document.getElementById("nappy-stock-adjust-hint");
  let statusCache = null;
  let editMode = false;

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message || "";
    }
  }

  function setNavOpen(open) {
    if (!navMenuToggle || !navMenuPanel) {
      return;
    }
    navMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navMenuPanel.setAttribute("aria-hidden", open ? "false" : "true");
    navMenuPanel.classList.toggle("open", open);
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      );
    }
  }

  function getTheme() {
    const stored = localStorage.getItem("baby-tracker-theme");
    if (stored) {
      return stored;
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function toLocalDateTimeValue(date) {
    if (!date || Number.isNaN(date.getTime())) {
      return "";
    }
    const offsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }

  function formatStockDate(value) {
    if (!value) {
      return "--";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatRate(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return "--";
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)}/day`;
  }

  function formatDays(value) {
    if (!Number.isFinite(value)) {
      return "--";
    }
    if (value < 1) {
      return "today";
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} days`;
  }

  async function readResponse(response) {
    if (response.ok) {
      return response.json();
    }
    let detail = "";
    try {
      const data = await response.json();
      detail = data.error || JSON.stringify(data);
    } catch (error) {
      detail = await response.text();
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  async function fetchStatus() {
    return readResponse(await fetch(buildUrl("/api/nappy-stock")));
  }

  async function saveBatch(payload) {
    return readResponse(await fetch(buildUrl("/api/nappy-stock"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
  }

  async function updateLatest(payload) {
    return readResponse(await fetch(buildUrl("/api/nappy-stock/latest"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }));
  }

  async function adjustRemaining(delta) {
    return readResponse(await fetch(buildUrl("/api/nappy-stock/adjust"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    }));
  }

  function renderHistory(history) {
    if (!historyEl || !emptyEl) {
      return;
    }
    const batches = Array.isArray(history) ? history : [];
    historyEl.replaceChildren();
    emptyEl.hidden = batches.length > 0;
    batches.forEach((batch) => {
      const row = document.createElement("div");
      row.className = "stock-history-row";
      const main = document.createElement("div");
      const title = document.createElement("div");
      title.className = "stock-history-main";
      title.textContent = `${batch.total_count} nappies`;
      const meta = document.createElement("div");
      meta.className = "stock-history-meta";
      meta.textContent = `Threshold ${batch.threshold_count} · ${formatStockDate(batch.stock_added_at_utc)}`;
      main.append(title, meta);
      const notes = document.createElement("div");
      notes.className = "stock-history-meta";
      notes.textContent = batch.notes || "";
      row.append(main, notes);
      historyEl.appendChild(row);
    });
  }

  function renderStatus(status) {
    statusCache = status || null;
    const configured = Boolean(status && status.configured);
    remainingEl.textContent = configured ? String(status.remaining_count || 0) : "--";
    usedEl.textContent = configured ? String(status.used_count || 0) : "--";
    rateEl.textContent = formatRate(Number(status && status.average_per_day));
    alertEl.classList.toggle("ok", !configured || !status.is_below_threshold);
    if (!configured) {
      alertTitleEl.textContent = "No stock batch yet";
      alertDetailEl.textContent = "Add the current stock level to start tracking.";
      forecastEl.textContent = "Forecast appears after you save stock.";
    } else {
      alertTitleEl.textContent = status.is_below_threshold ? "Low nappy stock" : "Stock level OK";
      alertDetailEl.textContent = `${status.remaining_count} left, threshold ${status.threshold_count}.`;
      if (!status.estimated_empty_at_utc) {
        forecastEl.textContent = "Forecast appears after at least one nappy log.";
      } else {
        const emptyDate = formatStockDate(status.estimated_empty_at_utc);
        const days = formatDays(Number(status.days_until_empty));
        const thresholdDate = status.estimated_threshold_at_utc
          ? formatStockDate(status.estimated_threshold_at_utc)
          : "already below threshold";
        forecastEl.textContent = `Estimated empty: ${emptyDate} (${days}). Threshold: ${thresholdDate}.`;
      }
    }
    renderHistory(status ? status.history : []);
  }

  function resetEditMode() {
    editMode = false;
    formTitleEl.textContent = "Add stock batch";
    saveEl.textContent = "Save stock";
    cancelEditEl.hidden = true;
    formHintEl.textContent = "Saving a new batch resets the stock baseline.";
  }

  function enterEditMode() {
    const batch = statusCache && statusCache.batch;
    if (!batch) {
      setStatus("Add stock before editing.");
      return;
    }
    editMode = true;
    formTitleEl.textContent = "Edit latest stock batch";
    saveEl.textContent = "Save edit";
    cancelEditEl.hidden = false;
    totalEl.value = String(batch.total_count || "");
    thresholdEl.value = String(batch.threshold_count || "");
    addedAtEl.value = toLocalDateTimeValue(new Date(batch.stock_added_at_utc));
    notesEl.value = batch.notes || "";
    formHintEl.textContent = "Editing updates the latest stock batch.";
  }

  function buildFormPayload() {
    const total = Number.parseInt(totalEl.value, 10);
    const threshold = Number.parseInt(thresholdEl.value, 10);
    if (!Number.isInteger(total) || total < 0) {
      setStatus("Total stock must be a whole number.");
      totalEl.focus();
      return null;
    }
    if (!Number.isInteger(threshold) || threshold < 0) {
      setStatus("Threshold must be a whole number.");
      thresholdEl.focus();
      return null;
    }
    if (threshold > total) {
      setStatus("Threshold cannot be higher than total stock.");
      thresholdEl.focus();
      return null;
    }
    const addedAt = addedAtEl.value ? new Date(addedAtEl.value) : new Date();
    if (Number.isNaN(addedAt.getTime())) {
      setStatus("Stock added date is invalid.");
      addedAtEl.focus();
      return null;
    }
    return {
      total_count: total,
      threshold_count: threshold,
      stock_added_at_utc: addedAt.toISOString(),
      notes: notesEl.value,
    };
  }

  async function submitForm(event) {
    event.preventDefault();
    const payload = buildFormPayload();
    if (!payload) {
      return;
    }
    try {
      const nextStatus = editMode
        ? await updateLatest(payload)
        : await saveBatch(payload);
      renderStatus(nextStatus);
      if (editMode) {
        resetEditMode();
        formHintEl.textContent = "Stock edit saved.";
      } else {
        notesEl.value = "";
        formHintEl.textContent = "Stock saved.";
      }
      setStatus("");
    } catch (error) {
      setStatus(`Failed to save nappy stock: ${error.message || "unknown error"}`);
    }
  }

  async function applyAdjustment(direction) {
    const count = Number.parseInt(adjustCountEl.value, 10);
    if (!Number.isInteger(count) || count <= 0) {
      setStatus("Adjustment must be a positive whole number.");
      adjustCountEl.focus();
      return;
    }
    try {
      const nextStatus = await adjustRemaining(direction * count);
      renderStatus(nextStatus);
      adjustHintEl.textContent = `Applied ${direction > 0 ? "+" : "-"}${count} to current stock.`;
      setStatus("");
    } catch (error) {
      setStatus(`Failed to adjust stock: ${error.message || "unknown error"}`);
    }
  }

  applyTheme(getTheme());
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
      localStorage.setItem("baby-tracker-theme", next);
      applyTheme(next);
    });
  }
  if (navMenuToggle && navMenuPanel) {
    navMenuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setNavOpen(!navMenuPanel.classList.contains("open"));
    });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (navMenuPanel.contains(event.target) || navMenuToggle.contains(event.target)) {
        return;
      }
      setNavOpen(false);
    });
  }
  if (addedAtEl && !addedAtEl.value) {
    addedAtEl.value = toLocalDateTimeValue(new Date());
  }
  formEl.addEventListener("submit", submitForm);
  incrementEl.addEventListener("click", () => {
    void applyAdjustment(1);
  });
  decrementEl.addEventListener("click", () => {
    void applyAdjustment(-1);
  });
  editLatestEl.addEventListener("click", enterEditMode);
  cancelEditEl.addEventListener("click", resetEditMode);
  void fetchStatus()
    .then(renderStatus)
    .catch((error) => {
      setStatus(`Failed to load nappy stock: ${error.message || "unknown error"}`);
    });
})();
