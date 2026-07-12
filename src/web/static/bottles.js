import {
  bodyEl,
  buildUrl,
  MILK_EXPRESS_TYPE,
  statusEl,
} from "./app/core/config.js";

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

let bottlesCache = [];
let bottleExpressedMl = null;

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message || "";
  }
}

function formatWeightG(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} g` : `${rounded.toFixed(1)} g`;
}

function formatMl(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} ml` : `${rounded.toFixed(1)} ml`;
}

async function readResponse(response) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }
  let detail = "";
  try {
    const err = await response.json();
    detail = err.error || JSON.stringify(err);
  } catch (parseError) {
    detail = await response.text();
  }
  throw new Error(detail || `HTTP ${response.status}`);
}

async function fetchBottles() {
  const data = await readResponse(await fetch(buildUrl("/api/bottles")));
  return Array.isArray(data) ? data : [];
}

async function createBottle(payload) {
  return readResponse(await fetch(buildUrl("/api/bottles"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

async function updateBottle(bottleId, payload) {
  return readResponse(await fetch(buildUrl(`/api/bottles/${bottleId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

async function deleteBottle(bottleId) {
  await readResponse(await fetch(buildUrl(`/api/bottles/${bottleId}`), {
    method: "DELETE",
  }));
}

async function saveMilkExpressEntry(expressedMl) {
  const userSlug = bodyEl?.dataset.user || "";
  const userValid = bodyEl?.dataset.userValid === "true" && Boolean(userSlug);
  if (!userValid) {
    throw new Error("Choose a user below to start logging.");
  }
  const response = await fetch(buildUrl(`/api/users/${encodeURIComponent(userSlug)}/entries`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: MILK_EXPRESS_TYPE,
      timestamp_utc: new Date().toISOString(),
      expressed_ml: Math.round(expressedMl * 10) / 10,
      client_event_id: crypto.randomUUID(),
    }),
  });
  await readResponse(response);
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

function updateBottleLogButton() {
  if (!bottleLogMilkBtnEl) {
    return;
  }
  const userValid = bodyEl?.dataset.userValid === "true";
  const canLog = userValid && Number.isFinite(bottleExpressedMl) && bottleExpressedMl > 0;
  bottleLogMilkBtnEl.classList.toggle("is-disabled", !canLog);
  if (canLog) {
    bottleLogMilkBtnEl.removeAttribute("disabled");
  } else {
    bottleLogMilkBtnEl.setAttribute("disabled", "true");
  }
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

function initBottlesHandlers() {
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
      if (!Number.isFinite(bottleExpressedMl) || bottleExpressedMl <= 0) {
        setStatus("Enter a bottle and total weight first.");
        return;
      }
      try {
        await saveMilkExpressEntry(bottleExpressedMl);
        if (bottleTotalWeightEl) {
          bottleTotalWeightEl.value = "";
        }
        updateBottleResult();
      } catch (err) {
        setStatus(err.message || "Failed to log milk express.");
      }
    });
  }
}

initBottlesHandlers();
void loadBottles();
