// Stops early with a clear message when the terminal isn't on the Node version in .nvmrc.
// Without this, the API crashes silently on older Node (the argon2 native module core-dumps on
// Node 20), and the web app only shows "502 Bad Gateway". Keep this file free of new syntax/APIs
// so it runs on old Node versions too.
import { readFileSync } from 'node:fs';

const required = Number(readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim());
const current = Number(process.versions.node.split('.')[0]);

if (current < required) {
  console.error(
    [
      '',
      `✖ Spartan Hangout needs Node ${required} (see .nvmrc), but this terminal is using Node ${process.versions.node}.`,
      '',
      '  Fix it in this terminal:   nvm install && nvm use',
      `  Make it your default:      nvm alias default ${required}`,
      '',
    ].join('\n'),
  );
  process.exit(1);
}
