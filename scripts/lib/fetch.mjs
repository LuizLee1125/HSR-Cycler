import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_DIR = join(ROOT, '.cache');

/** Prydwen sits behind Cloudflare and 403s anything that does not look like a browser. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function cachePath(url) {
  return join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.cache`);
}

async function readCache(url) {
  try {
    const raw = await readFile(cachePath(url), 'utf8');
    const at = raw.indexOf('\n');
    const stamp = Number(raw.slice(0, at));
    if (!Number.isFinite(stamp) || Date.now() - stamp > CACHE_TTL_MS) return null;
    return raw.slice(at + 1);
  } catch {
    return null;
  }
}

const execFileAsync = promisify(execFile);

/**
 * Cloudflare fingerprints Node's TLS stack and 403s prydwen.gg requests no
 * matter what headers we send, so route those through curl (which ships with
 * Windows 10+, macOS and every mainstream Linux).
 */
async function viaCurl(url) {
  const { stdout } = await execFileAsync(
    'curl',
    ['-sSL', '--compressed', '--fail', '-A', UA, '-H', 'accept-language: en-US,en;q=0.9', url],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return stdout;
}

async function viaNode(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: '*/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Fetches `url` as text, backed by an on-disk cache so repeated runs of the
 * generators do not hammer prydwen.gg (~90 character pages per run).
 */
export async function fetchText(url, { retries = 3 } = {}) {
  const cached = await readCache(url);
  if (cached !== null) return cached;

  const transports = url.includes('prydwen.gg') ? [viaCurl, viaNode] : [viaNode, viaCurl];
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    for (const transport of transports) {
      try {
        const body = await transport(url);
        await mkdir(CACHE_DIR, { recursive: true });
        await writeFile(cachePath(url), `${Date.now()}\n${body}`);
        return body;
      } catch (error) {
        lastError = error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw lastError;
}

export async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

/** Runs `worker` over `items` with bounded concurrency, preserving input order. */
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

export async function writeGenerated(relativePath, data) {
  const target = join(ROOT, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  return target;
}

export { ROOT };
