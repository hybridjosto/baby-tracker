import { bodyEl, buildUrl } from "./app/core/config.js";

const calendarFormEl = document.getElementById("calendar-form");
const calendarFormTitleEl = document.getElementById("calendar-form-title");
const calendarFormSubtitleEl = document.getElementById("calendar-form-subtitle");
const calendarTitleInputEl = document.getElementById("calendar-title");
const calendarCategorySelectEl = document.getElementById("calendar-category");
const calendarDateInputEl = document.getElementById("calendar-date");
const calendarLocationInputEl = document.getElementById("calendar-location");
const calendarStartTimeInputEl = document.getElementById("calendar-start-time");
const calendarEndTimeInputEl = document.getElementById("calendar-end-time");
const calendarNotesInputEl = document.getElementById("calendar-notes");
const calendarRecurrenceSelectEl = document.getElementById("calendar-recurrence");
const calendarRepeatUntilInputEl = document.getElementById("calendar-repeat-until");
const calendarRepeatUntilFieldEl = document.getElementById("calendar-repeat-until-field");
const calendarSubmitBtn = document.getElementById("calendar-submit");
const calendarDeleteBtn = document.getElementById("calendar-delete");
const statusEl = document.getElementById("status");

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

function updateRecurrenceUI() {
  if (!calendarRecurrenceSelectEl || !calendarRepeatUntilFieldEl || !calendarRepeatUntilInputEl) {
    return;
  }
  const isWeekly = calendarRecurrenceSelectEl.value === "weekly";
  calendarRepeatUntilFieldEl.hidden = !isWeekly;
  calendarRepeatUntilInputEl.disabled = !isWeekly;
  if (!isWeekly) {
    calendarRepeatUntilInputEl.value = "";
  }
}

async function loadForm(eventId) {
  try {
    const response = await fetch(buildUrl(`/api/calendar/events/${eventId}`));
    if (!response.ok) {
      setStatus("Event not found.");
      return;
    }
    const event = await response.json();
    if (calendarTitleInputEl) {
      calendarTitleInputEl.value = event.title || "";
    }
    if (calendarCategorySelectEl) {
      calendarCategorySelectEl.value = event.category || "group";
    }
    if (calendarDateInputEl) {
      calendarDateInputEl.value = event.date_local || "";
    }
    if (calendarLocationInputEl) {
      calendarLocationInputEl.value = event.location || "";
    }
    if (calendarStartTimeInputEl) {
      calendarStartTimeInputEl.value = event.start_time_local || "";
    }
    if (calendarEndTimeInputEl) {
      calendarEndTimeInputEl.value = event.end_time_local || "";
    }
    if (calendarNotesInputEl) {
      calendarNotesInputEl.value = event.notes || "";
    }
    if (calendarRecurrenceSelectEl) {
      calendarRecurrenceSelectEl.value = event.recurrence || "none";
    }
    if (calendarRepeatUntilInputEl) {
      calendarRepeatUntilInputEl.value = event.recurrence_until_local || "";
    }
    updateRecurrenceUI();
  } catch (err) {
    setStatus("Failed to load event.");
  }
}

async function deleteEvent(eventId) {
  try {
    const response = await fetch(buildUrl(`/api/calendar/events/${eventId}`), {
      method: "DELETE",
    });
    if (!response.ok) {
      setStatus("Failed to delete calendar event.");
      return false;
    }
    return true;
  } catch (err) {
    setStatus("Failed to delete calendar event.");
    return false;
  }
}

async function submitForm(eventId) {
  if (!calendarTitleInputEl || !calendarDateInputEl || !calendarStartTimeInputEl) {
    return;
  }
  const payload = {
    title: calendarTitleInputEl.value.trim(),
    date_local: calendarDateInputEl.value,
    start_time_local: calendarStartTimeInputEl.value,
    end_time_local: calendarEndTimeInputEl ? calendarEndTimeInputEl.value || null : null,
    location: calendarLocationInputEl ? calendarLocationInputEl.value.trim() || null : null,
    notes: calendarNotesInputEl ? calendarNotesInputEl.value.trim() || null : null,
    category: calendarCategorySelectEl ? calendarCategorySelectEl.value : "group",
    recurrence: calendarRecurrenceSelectEl ? calendarRecurrenceSelectEl.value : "none",
    recurrence_until_local: calendarRepeatUntilInputEl ? calendarRepeatUntilInputEl.value || null : null,
  };
  if (payload.recurrence !== "weekly") {
    payload.recurrence_until_local = null;
  }
  if (calendarSubmitBtn) {
    calendarSubmitBtn.disabled = true;
  }
  try {
    const response = await fetch(
      buildUrl(eventId ? `/api/calendar/events/${eventId}` : "/api/calendar/events"),
      {
        method: eventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data.error || "Failed to save event.");
      return;
    }
    window.location.href = buildUrl("/calendar");
  } catch (err) {
    setStatus("Failed to save event.");
  } finally {
    if (calendarSubmitBtn) {
      calendarSubmitBtn.disabled = false;
    }
  }
}

function initForm() {
  if (!calendarFormEl) {
    return;
  }
  const eventId = Number.parseInt(bodyEl.dataset.eventId || "", 10);
  const isEdit = Number.isFinite(eventId) && eventId > 0;
  if (isEdit) {
    if (calendarFormTitleEl) {
      calendarFormTitleEl.textContent = "Edit event";
    }
    if (calendarFormSubtitleEl) {
      calendarFormSubtitleEl.textContent = "Update the details for this meetup or group.";
    }
    if (calendarDeleteBtn) {
      calendarDeleteBtn.hidden = false;
    }
    void loadForm(eventId);
  } else {
    if (calendarDateInputEl) {
      calendarDateInputEl.value = toLocalIsoDate(new Date());
    }
    updateRecurrenceUI();
  }
  if (calendarRecurrenceSelectEl) {
    calendarRecurrenceSelectEl.addEventListener("change", updateRecurrenceUI);
  }
  calendarFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(isEdit ? eventId : null);
  });
  if (calendarDeleteBtn && isEdit) {
    calendarDeleteBtn.addEventListener("click", async () => {
      if (!window.confirm("Delete this event?")) {
        return;
      }
      const deleted = await deleteEvent(eventId);
      if (deleted) {
        window.location.href = buildUrl("/calendar");
      }
    });
  }
}

initForm();
