import { USER_RE } from "./config.js";
import {
  isSameDay,
  parseDateInputValue,
  toLocalDateTimeValue,
} from "./dates.js";

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

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatTimelineDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimelineHour(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hexToRgba(hex, alpha) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeEntryType(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function getTimelineTypeConfig(type) {
  const normalized = normalizeEntryType(type);
  const palette = [
    { color: "#ff8a5b", icon: "local_fire_department" },
    { color: "#2dd4bf", icon: "water_drop" },
    { color: "#fbbf24", icon: "spa" },
    { color: "#38bdf8", icon: "rainy" },
    { color: "#a78bfa", icon: "bedtime" },
    { color: "#f97316", icon: "local_cafe" },
    { color: "#22c55e", icon: "event" },
  ];

  if (normalized.includes("feed")) {
    return { color: "#23c96b", icon: "local_drink" };
  }
  if (normalized.includes("breast")) {
    return { color: "#f97316", icon: "favorite" };
  }
  if (normalized.includes("formula")) {
    return { color: "#38bdf8", icon: "science" };
  }
  if (normalized.includes("express") || normalized.includes("pump")) {
    return { color: "#f59e0b", icon: "local_cafe" };
  }
  if (normalized.includes("wee") || normalized.includes("wet")) {
    return { color: "#38bdf8", icon: "rainy" };
  }
  if (normalized.includes("poo") || normalized.includes("soiled")) {
    return { color: "#fbbf24", icon: "spa" };
  }
  if (normalized.includes("sleep") || normalized.includes("nap")) {
    return { color: "#a78bfa", icon: "bedtime" };
  }
  if (normalized.includes("cry")) {
    return { color: "#f97316", icon: "mood_bad" };
  }

  const pick = palette[hashString(normalized || "event") % palette.length];
  return { color: pick.color, icon: pick.icon };
}

function formatSummaryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

function formatFeedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildFeedShortcutUrl(target) {
  const inputValue = toLocalDateTimeValue(target);
  if (!inputValue) {
    return "";
  }
  const encoded = encodeURIComponent(inputValue);
  return `shortcuts://run-shortcut?name=feedreminderpwa&input=${encoded}`;
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

function formatDurationMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0 min";
  }
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (!hours) {
    return `${minutes} min`;
  }
  if (!minutes) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatMl(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 ml";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} ml` : `${rounded.toFixed(1)} ml`;
}

function formatAverageDuration(totalMinutes, feedCount) {
  if (!feedCount) {
    return "--";
  }
  return formatDurationMinutes(totalMinutes / feedCount);
}

function formatAverageMl(totalMl, feedCount) {
  if (!feedCount) {
    return "--";
  }
  return formatMl(totalMl / feedCount);
}

function parseMilkExpressNotes(value) {
  if (typeof value !== "string") {
    return { ml: 0, minutes: 0 };
  }
  let ml = 0;
  let minutes = 0;
  const pattern = /(\d+(?:\.\d+)?)(?:\s*(ml|milliliter|milliliters|min|mins|minute|minutes))?/gi;
  let match = pattern.exec(value);
  while (match) {
    const amount = Number.parseFloat(match[1]);
    if (Number.isFinite(amount)) {
      const unit = (match[2] || "").toLowerCase();
      if (unit.startsWith("min")) {
        minutes += amount;
      } else {
        ml += amount;
      }
    }
    match = pattern.exec(value);
  }
  return { ml, minutes };
}

function formatEntryTypeLabel(type) {
  const normalized = normalizeEntryType(type);
  if (!normalized) {
    return "Event";
  }
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return `Week of ${fmt.format(startDate)} - ${fmt.format(endDate)}`;
}

function formatDayLabel(date) {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  return fmt.format(date);
}

function formatDayDate(date) {
  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  return fmt.format(date);
}

function formatGoalDateLabel(value) {
  const parsed = parseDateInputValue(value);
  if (!parsed) {
    return value || "--";
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatRangeLabel(since, until) {
  const pad = (value) => String(value).padStart(2, "0");
  const format = (value) => {
    return `${pad(value.getMonth() + 1)}/${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };
  return `${format(since)} - ${format(until)}`;
}

export {
  buildFeedShortcutUrl,
  formatAge,
  formatAverageDuration,
  formatAverageMl,
  formatDayDate,
  formatDayLabel,
  formatDurationMinutes,
  formatEntryTypeLabel,
  formatFeedTime,
  formatGoalDateLabel,
  formatMl,
  formatRangeLabel,
  formatRelativeTime,
  formatSummaryDateLabel,
  formatSummaryTime,
  formatTimeUntil,
  formatTimelineDay,
  formatTimelineHour,
  formatTimestamp,
  formatWeekRange,
  getTimelineTypeConfig,
  hexToRgba,
  normalizeEntryType,
  normalizeUserSlug,
  parseMilkExpressNotes,
};
