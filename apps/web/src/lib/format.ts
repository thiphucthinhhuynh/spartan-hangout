import { CAMPUS_TIME_ZONE, DAYS_OF_WEEK } from '@sh/shared';

/** "16:00" → "4:00 PM" */
export function formatTimeOfDay(time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/** A weekly slot: "Wednesday · 4:00 PM – 6:00 PM" parts. */
export function formatSlot(slot: { dayOfWeek: number; start: string; end: string }) {
  return {
    day: DAYS_OF_WEEK[slot.dayOfWeek] ?? '',
    time: `${formatTimeOfDay(slot.start)} – ${formatTimeOfDay(slot.end)}`,
  };
}

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: CAMPUS_TIME_ZONE,
});

/** ISO instant → "Oct 21, 2026, 4:00 PM" in campus time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "Maya Chen" → "MC" (the avatar style in the mockups). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
  return letters
    .map((word) => word?.[0] ?? '')
    .join('')
    .toUpperCase();
}

const longDayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: CAMPUS_TIME_ZONE,
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: CAMPUS_TIME_ZONE,
});

/** "Wednesday, October 21, 2026" in campus time (mockup p.4). */
export function formatActivityDay(iso: string): string {
  return longDayFormat.format(new Date(iso));
}

/** 120 → "2 hours", 90 → "1 hr 30 min", 45 → "45 min" */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours} hr ${minutes} min`;
}

/** "4:00 PM – 6:00 PM · 2 hours" in campus time (mockup p.4). */
export function formatActivityTimes(startIso: string, endIso: string): string {
  const minutes = Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000);
  const start = timeFormat.format(new Date(startIso));
  const end = timeFormat.format(new Date(endIso));
  return `${start} – ${end} · ${formatDuration(minutes)}`;
}

const shortDayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: CAMPUS_TIME_ZONE,
});

/** "Wed, Oct 21 · 4:00 PM – 6:00 PM" in campus time, for activity cards (FR15, FR17). */
export function formatCardWhen(startIso: string, endIso: string): string {
  const day = shortDayFormat.format(new Date(startIso));
  return `${day} · ${timeFormat.format(new Date(startIso))} – ${timeFormat.format(new Date(endIso))}`;
}

/** "2026-10-22" → "Oct 22" (a campus-local date from a search field). */
export function formatShortDate(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "3 spots left", "1 spot left", "No spots left" */
export function formatOpenSpots(openSpots: number): string {
  if (openSpots <= 0) return 'No spots left';
  return `${openSpots} spot${openSpots === 1 ? '' : 's'} left`;
}
