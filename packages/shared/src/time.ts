import { CAMPUS_TIME_ZONE as CAMPUS_TZ } from './constants.js';

/** Days indexed like JavaScript's Date#getDay() and the availability_slot table: 0 = Sunday. */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** 24-hour wall-clock time, "HH:mm" (e.g. "09:30", "16:00"). */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "09:30" → 570 (minutes after midnight). Assumes a valid HH:mm string. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 570 → "09:30" */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ─── Campus time (ADR-0011) ─────────────────────────────────────────────────
// Instants are stored in UTC; students enter and read dates and times in SJSU's time zone.
// Built on Intl only, so it handles daylight saving without a date library.

/** "YYYY-MM-DD" */
export const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export interface CampusDateTimeParts {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function wallClock(instant: Date, timeZone: string) {
  let format = partsFormatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsFormatters.set(timeZone, format);
  }
  const parts = Object.fromEntries(format.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: String(parts.weekday),
  };
}

/** Milliseconds the time zone is ahead of UTC at `instant` (negative in California). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * A campus-local date and time → the UTC instant. E.g. ("2026-10-21", "16:00") → 23:00Z.
 * Times skipped by the spring-forward change resolve to the hour after.
 */
export function campusDateTimeToUtc(date: string, time: string, timeZone = CAMPUS_TZ): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes: the offset at the first guess can differ from the offset at the answer near a DST change.
  const firstGuess = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  return new Date(wallAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A UTC instant → its campus-local date, time and weekday. */
export function utcToCampusParts(instant: Date, timeZone = CAMPUS_TZ): CampusDateTimeParts {
  const w = wallClock(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${w.year}-${pad(w.month)}-${pad(w.day)}`,
    time: `${pad(w.hour)}:${pad(w.minute)}`,
    dayOfWeek: WEEKDAYS.indexOf(w.weekday),
  };
}
