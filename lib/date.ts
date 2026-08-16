/**
 * Date helpers shared by the data layer and the screens.
 *
 * Everything the user logs is bucketed by *server* local date rather than the
 * browser's. On a single-timezone deployment those agree; if Repwisely ever
 * ships across timezones this is the one place that needs revisiting.
 */

/** YYYY-MM-DD in local time — `toISOString()` would shift the day near midnight. */
export function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return iso(new Date());
}

export function daysAgo(n: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Monday = 1 … Sunday = 7, matching plan_days.day_index. */
export function todayIndex() {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayLabel(dayIndex: number) {
  return WEEKDAY_LABELS[dayIndex - 1] ?? "";
}

/** Monday of the week containing `d`, at midnight. */
export function startOfWeek(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const js = out.getDay();
  out.setDate(out.getDate() - (js === 0 ? 6 : js - 1));
  return out;
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** "2 hours ago" / "Yesterday" — for the notification list. */
export function relativeTime(isoTimestamp: string) {
  const then = new Date(isoTimestamp).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(isoTimestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
