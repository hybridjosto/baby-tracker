import { buildUrl, MILK_EXPRESS_TYPE } from "./app/core/config.js";
import {
  formatMl,
  formatTimestamp,
  normalizeEntryType,
  parseMilkExpressNotes,
} from "./app/core/formatters.js";

const ledgerTableEl = document.getElementById("milk-express-ledger-table");
const ledgerBodyEl = document.getElementById("milk-express-ledger-body");
const ledgerEmptyEl = document.getElementById("milk-express-ledger-empty");
const ledgerCountEl = document.getElementById("milk-express-ledger-count");
const ledgerTotalEl = document.getElementById("milk-express-ledger-total");
const ledgerSelectAllEl = document.getElementById("milk-express-ledger-select-all");
const ledgerClearEl = document.getElementById("milk-express-ledger-clear");
const ledgerRangeEl = document.getElementById("milk-express-ledger-range");
const ledgerTotalAllEl = document.getElementById("milk-express-ledger-total-all");
const ledgerSelectionEl = document.getElementById("milk-express-ledger-selection");
const statusEl = document.getElementById("status");

let ledgerEntries = [];
const ledgerSelections = new Set();

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function computeWindow(hours) {
  const until = new Date();
  const since = new Date(until.getTime() - hours * 60 * 60 * 1000);
  return {
    sinceIso: since.toISOString(),
    untilIso: until.toISOString(),
  };
}

function isMilkExpressType(value) {
  return normalizeEntryType(value) === MILK_EXPRESS_TYPE;
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

function entryKey(entry, index) {
  return entry.client_event_id || entry.id || `${entry.timestamp_utc}-${index}`;
}

function updateSubtotal() {
  if (!ledgerCountEl || !ledgerTotalEl) {
    return;
  }
  let totalMl = 0;
  ledgerEntries.forEach((entry, index) => {
    if (!ledgerSelections.has(entryKey(entry, index))) {
      return;
    }
    const { ml } = getMilkExpressAmounts(entry);
    if (Number.isFinite(ml)) {
      totalMl += ml;
    }
  });
  const count = ledgerSelections.size;
  ledgerCountEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  ledgerTotalEl.textContent = formatMl(totalMl);
}

function updateTotal(entries) {
  if (!ledgerTotalAllEl) {
    return;
  }
  const totalMl = entries.reduce((acc, entry) => {
    const { ml } = getMilkExpressAmounts(entry);
    return acc + (Number.isFinite(ml) ? ml : 0);
  }, 0);
  ledgerTotalAllEl.textContent = `Total: ${formatMl(totalMl)}`;
}

function setEmptyState(message) {
  if (!ledgerEmptyEl || !ledgerTableEl) {
    return;
  }
  ledgerEmptyEl.textContent = message;
  ledgerEmptyEl.hidden = false;
  ledgerTableEl.hidden = true;
  if (ledgerSelectionEl) {
    ledgerSelectionEl.hidden = true;
  }
}

function syncSelectAllState() {
  if (!ledgerSelectAllEl) {
    return;
  }
  ledgerSelectAllEl.checked = Boolean(ledgerEntries.length)
    && ledgerEntries.every((entry, index) => ledgerSelections.has(entryKey(entry, index)));
}

function renderLedger(entries) {
  if (!ledgerBodyEl || !ledgerEmptyEl || !ledgerTableEl) {
    return;
  }
  ledgerEntries = entries;
  ledgerSelections.clear();
  ledgerBodyEl.innerHTML = "";
  updateTotal(entries);
  if (!entries.length) {
    setEmptyState("No milk express events in the last 48 hours.");
    updateSubtotal();
    syncSelectAllState();
    return;
  }
  ledgerEmptyEl.hidden = true;
  ledgerTableEl.hidden = false;
  if (ledgerSelectionEl) {
    ledgerSelectionEl.hidden = false;
  }
  entries.forEach((entry, index) => {
    const key = entryKey(entry, index);
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
        ledgerSelections.add(key);
      } else {
        ledgerSelections.delete(key);
      }
      syncSelectAllState();
      updateSubtotal();
    });
    checkCell.appendChild(checkbox);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatTimestamp(entry.timestamp_utc);

    const valueCell = document.createElement("td");
    valueCell.textContent = formatMl(ml);

    row.append(checkCell, timeCell, valueCell);
    ledgerBodyEl.appendChild(row);
  });
  syncSelectAllState();
  updateSubtotal();
}

async function loadLedger() {
  if (!ledgerBodyEl) {
    return;
  }
  if (ledgerRangeEl) {
    ledgerRangeEl.textContent = "Last 48 hours";
  }
  const window = computeWindow(48);
  const params = new URLSearchParams({
    limit: "200",
    since: window.sinceIso,
    until: window.untilIso,
    type: MILK_EXPRESS_TYPE,
  });
  try {
    const response = await fetch(buildUrl(`/api/entries?${params.toString()}`));
    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(payload.error || response.status);
    }
    const entries = Array.isArray(payload)
      ? payload.filter((entry) => isMilkExpressType(entry.type))
      : [];
    renderLedger(entries);
    setStatus("");
  } catch (err) {
    setStatus(`Failed to load milk express entries: ${err.message || "unknown error"}`);
  }
}

function initHandlers() {
  if (ledgerSelectAllEl) {
    ledgerSelectAllEl.addEventListener("change", () => {
      const shouldSelectAll = ledgerSelectAllEl.checked;
      if (!ledgerBodyEl) {
        return;
      }
      const checkboxes = ledgerBodyEl.querySelectorAll("input[type=\"checkbox\"]");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = shouldSelectAll;
        const key = checkbox.dataset.entryId;
        if (!key) {
          return;
        }
        if (shouldSelectAll) {
          ledgerSelections.add(key);
        } else {
          ledgerSelections.delete(key);
        }
      });
      updateSubtotal();
    });
  }
  if (ledgerClearEl) {
    ledgerClearEl.addEventListener("click", (event) => {
      event.preventDefault();
      if (!ledgerBodyEl) {
        return;
      }
      ledgerSelections.clear();
      const checkboxes = ledgerBodyEl.querySelectorAll("input[type=\"checkbox\"]");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
      if (ledgerSelectAllEl) {
        ledgerSelectAllEl.checked = false;
      }
      updateSubtotal();
    });
  }
}

initHandlers();
void loadLedger();
