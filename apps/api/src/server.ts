import { createApp } from './app.js';
import { systemClock } from './common/time.js';
import { env } from './config/env.js';
import { db } from './db.js';
import { startCompleteActivitiesJob } from './jobs/completeActivities.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`Spartan Hangout API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
const stopJob = startCompleteActivitiesJob({ db, clock: systemClock });

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  stopJob();
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
