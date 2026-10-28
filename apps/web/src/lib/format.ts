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
