import { buildUrl, statusEl } from "./app/core/config.js";
import { formatDateInputValue } from "./app/core/dates.js";
import { formatGoalDateLabel, formatMl } from "./app/core/formatters.js";

const goalsFormEl = document.getElementById("goals-form");
const goalAmountInputEl = document.getElementById("goal-amount");
const goalStartDateInputEl = document.getElementById("goal-start-date");
const goalHistoryEl = document.getElementById("goal-history");
const goalEmptyEl = document.getElementById("goal-empty");

let activeFeedingGoal = null;

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message || "";
  }
}

function setLoadingState(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
  if (isLoading) {
    document.body.setAttribute("aria-busy", "true");
  } else {
    document.body.removeAttribute("aria-busy");
  }
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

async function fetchFeedingGoals(limit) {
  const query = limit ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const data = await readResponse(await fetch(buildUrl(`/api/feeding-goals${query}`)));
  return normalizeGoalsResponse(data);
}

async function fetchCurrentGoal() {
  return readResponse(await fetch(buildUrl("/api/feeding-goals/current")));
}

async function saveFeedingGoal(payload) {
  setStatus("Saving goal...");
  await readResponse(await fetch(buildUrl("/api/feeding-goals"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  setStatus("Goal saved");
}

async function updateFeedingGoal(goalId, payload) {
  setStatus("Updating goal...");
  await readResponse(await fetch(buildUrl(`/api/feeding-goals/${goalId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  setStatus("Goal updated");
}

async function deleteFeedingGoal(goalId) {
  setStatus("Deleting goal...");
  await readResponse(await fetch(buildUrl(`/api/feeding-goals/${goalId}`), {
    method: "DELETE",
  }));
  setStatus("Goal deleted");
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

    const label = document.createElement("div");
    label.className = "goal-meta";
    const badge = activeFeedingGoal && goal.id === activeFeedingGoal.id
      ? "Active"
      : (index === 0 ? "Latest" : "Past");
    label.textContent = `${badge} · ${formatGoalDateLabel(goal.start_date)}`;

    const amount = document.createElement("div");
    amount.className = "goal-amount";
    amount.textContent = formatMl(Number.parseFloat(goal.goal_ml));

    const details = document.createElement("div");
    details.appendChild(label);
    details.appendChild(amount);

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
          start_date: nextDate || null,
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

    item.appendChild(details);
    item.appendChild(actions);
    goalHistoryEl.appendChild(item);
  });
}

async function loadGoalHistory() {
  setLoadingState(true);
  try {
    const goals = await fetchFeedingGoals(50);
    activeFeedingGoal = await fetchCurrentGoal();
    renderGoalHistory(goals);
    if (goalStartDateInputEl && !goalStartDateInputEl.value) {
      goalStartDateInputEl.value = formatDateInputValue(new Date());
    }
  } catch (err) {
    setStatus(`Failed to load goals: ${err.message || "unknown error"}`);
  } finally {
    setLoadingState(false);
  }
}

function initGoalsHandlers() {
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
      }).catch((err) => {
        setStatus(`Error: ${err.message || "unable to save goal"}`);
      });
    });
  }
}

initGoalsHandlers();
void loadGoalHistory();
