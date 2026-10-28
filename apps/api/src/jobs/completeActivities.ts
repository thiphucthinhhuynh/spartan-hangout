import { MINUTE_MS, type Clock } from '../common/time.js';
import type { DbClient } from '../db.js';
import { completeEndedActivities } from '../modules/activities/activities.repository.js';

/**
 * FR20: once a minute, store Completed for activities whose end time has passed. Running it twice
 * is harmless. Responses don't wait for it: the mapper already shows ended activities as Completed.
 * Returns a function that stops the job.
 */
export function startCompleteActivitiesJob(
  { db, clock }: { db: DbClient; clock: Clock },
  intervalMs = MINUTE_MS,
) {
  const run = async () => {
    try {
      const count = await completeEndedActivities(db, clock.now());
      if (count > 0)
        console.log(`Marked ${count} ended activit${count === 1 ? 'y' : 'ies'} Completed`);
    } catch (err) {
      console.error('completeActivities job failed:', err);
    }
  };
  void run();
  const timer = setInterval(() => void run(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
