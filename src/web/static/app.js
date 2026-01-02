const entriesEl = document.getElementById("entries");
const statusEl = document.getElementById("status");
const bodyEl = document.body;
const activeUser = bodyEl.dataset.user || "";
const userValid = bodyEl.dataset.userValid === "true";

function setStatus(message) {
  statusEl.textContent = message || "";
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

function renderEntries(entries) {
  entriesEl.innerHTML = "";
  entries.forEach((entry) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${entry.type} · ${formatTimestamp(entry.timestamp_utc)}`;

    const actions = document.createElement("span");
    actions.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editEntry(entry));

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteEntry(entry));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(label);
    item.appendChild(actions);
    entriesEl.appendChild(item);
  });
}

async function fetchEntries() {
  const response = await fetch(`/api/users/${activeUser}/entries?limit=20`);
  const data = await response.json();
  renderEntries(data);
}

async function addEntry(type) {
  setStatus("Saving...");
  const payload = {
    type,
    timestamp_utc: new Date().toISOString(),
    client_event_id: generateId(),
  };
  const response = await fetch(`/api/users/${activeUser}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 201) {
    setStatus("Saved");
  } else if (response.status === 409) {
    setStatus("Already saved (duplicate tap)");
  } else {
    const err = await response.json();
    setStatus(`Error: ${err.error || "unknown"}`);
  }
  await fetchEntries();
}

async function editEntry(entry) {
  const nextType = window.prompt("Type (feed or poo)", entry.type);
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
    await fetchEntries();
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
    await fetchEntries();
  } else {
    const err = await response.json();
    setStatus(`Error: ${err.error || "unknown"}`);
  }
}

const feedBtn = document.getElementById("log-feed");
const pooBtn = document.getElementById("log-poo");

if (!userValid) {
  feedBtn.classList.add("disabled");
  pooBtn.classList.add("disabled");
  setStatus("Choose a valid /<name> URL to start logging.");
} else {
  feedBtn.addEventListener("click", () => addEntry("feed"));
  pooBtn.addEventListener("click", () => addEntry("poo"));
  fetchEntries().catch(() => setStatus("Failed to load entries"));
}
