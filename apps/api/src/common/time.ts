/** Source of "now". Services take a Clock so time-based rules can be tested (ADR-0011). */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export const MINUTE_MS = 60 * 1000;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}
