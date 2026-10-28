import { createApp } from './app.js';
import { env } from './config/env.js';
import { db } from './db.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`Spartan Hangout API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
