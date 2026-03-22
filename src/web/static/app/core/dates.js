function padNumber(value) {
  return String(value).padStart(2, "0");
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

function getLocalMidnightTs(anchorTs = Date.now()) {
  const date = new Date(anchorTs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getNextLocalMidnightTs(anchorTs = Date.now()) {
  const date = new Date(anchorTs);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

function getDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function getHourKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return `${getDateKey(date)}T${padNumber(date.getHours())}`;
}

function toLocalDateTimeValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function formatDateInputValue(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
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

function getDateKeyFromTimestamp(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatDateInputValue(parsed);
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

function getGoalDayWindow(dateKey) {
  const parsed = parseDateInputValue(dateKey);
  if (!parsed) {
    return null;
  }
  return getSummaryDayWindow(parsed);
}

function startOfWeekMonday(value) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export {
  formatDateInputValue,
  getDateKey,
  getDateKeyFromTimestamp,
  getGoalDayWindow,
  getHourKey,
  getLocalMidnightTs,
  getNextLocalMidnightTs,
  getSummaryDayWindow,
  isSameDay,
  parseDateInputValue,
  parseDob,
  startOfWeekMonday,
  toLocalDateTimeValue,
};
