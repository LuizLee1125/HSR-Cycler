import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

for (const script of ['fetch-endgame.mjs', 'fetch-characters.mjs']) {
  console.log(`\n▸ ${script}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, [join(here, script)], {
    maxBuffer: 64 * 1024 * 1024
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

console.log('\nData refresh complete.');
