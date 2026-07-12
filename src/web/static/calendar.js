import { buildUrl } from "./app/core/config.js";
import { startOfWeekMonday } from "./app/core/dates.js";
import {
  formatDayDate,
  formatDayLabel,
  formatWeekRange,
} from "./app/core/formatters.js";

const calendarDaysEl = document.getElementById("calendar-days");
const calendarWeekRangeEl = document.getElementById("week-range");
const calendarEmptyEl = document.getElementById("calendar-empty");
const calendarPrevBtn = document.querySelector("[data-week-nav='prev']");
const calendarNextBtn = document.querySelector("[data-week-nav='next']");
const calendarTodayBtn = document.querySelector("[data-week-nav='today']");
const statusEl = document.getElementById("status");

const CALENDAR_CATEGORY_LABELS = {
  group: "Group",
  meetup: "Meetup",
  hub: "Family hub",
  other: "Other",
};

let calendarWeekOffset = 0;
let calendarWeekStart = null;
let calendarLoading = false;

function setStatus(message) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toLocalIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function buildEventCard(event) {
  const card = document.createElement("article");
  card.className = "calendar-event";

  const time = document.createElement("div");
  time.className = "event-time";
  const endTime = event.end_time_local;
  time.textContent = endTime
    ? `${event.start_time_local}-${endTime}`
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

function renderWeek(startDate, occurrences) {
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
        eventsWrap.appendChild(buildEventCard(event));
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

async function loadWeek() {
  if (calendarLoading) {
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
      renderWeek(calendarWeekStart, []);
      return;
    }
    const data = await response.json();
    renderWeek(calendarWeekStart, Array.isArray(data) ? data : []);
  } catch (err) {
    setStatus("Failed to load calendar events.");
  } finally {
    calendarLoading = false;
  }
}

async function deleteEvent(eventId) {
  try {
    const response = await fetch(buildUrl(`/api/calendar/events/${eventId}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("Failed to delete calendar event.");
      return;
    }
    void loadWeek();
  } catch (err) {
    setStatus("Failed to delete calendar event.");
  }
}

function initHandlers() {
  if (calendarPrevBtn) {
    calendarPrevBtn.addEventListener("click", () => {
      calendarWeekOffset -= 1;
      void loadWeek();
    });
  }
  if (calendarNextBtn) {
    calendarNextBtn.addEventListener("click", () => {
      calendarWeekOffset += 1;
      void loadWeek();
    });
  }
  if (calendarTodayBtn) {
    calendarTodayBtn.addEventListener("click", () => {
      calendarWeekOffset = 0;
      void loadWeek();
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
      void deleteEvent(eventId);
    });
  }
}

initHandlers();
void loadWeek();
