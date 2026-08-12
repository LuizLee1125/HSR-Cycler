import { fetchText } from './fetch.mjs';

export const PRYDWEN = 'https://www.prydwen.gg';

/** Strips tags/entities from a fragment of Prydwen markup. */
export function text(html) {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prydwen shows a relative-DPS percentage where it has calculations and a plain
 * priority number where it does not.
 */
function score(raw) {
  if (!raw) return { relativeDps: null, priority: null };
  return raw.endsWith('%')
    ? { relativeDps: Number(raw.replace('%', '')) || null, priority: null }
    : { relativeDps: null, priority: Number(raw) || null };
}

/** Returns the markup between `startMarker` and the next `<h2>` (or `stopMarker`). */
function section(html, startMarker, stopMarker = '<div class="content-header') {
  const start = html.indexOf(startMarker);
  if (start === -1) return '';
  const from = start + startMarker.length;
  const stop = html.indexOf(stopMarker, from);
  return html.slice(from, stop === -1 ? html.length : stop);
}

/**
 * Prydwen renders each recommendation as an accordion button carrying an
 * `hsr-set-name` label, optionally preceded by a relative-DPS percentage.
 */
function entries(block, kindPattern) {
  const results = [];
  const re = new RegExp(
    `<div class="(percentage[^"]*)"><p>([^<]*)<\\/p><\\/div>|<div class="(${kindPattern})[^"]*">|<span class="hsr-set-name[^"]*">([\\s\\S]*?)<\\/span>`,
    'g'
  );
  let pendingPercent = null;
  let pendingKind = null;
  for (const match of block.matchAll(re)) {
    if (match[2] !== undefined) pendingPercent = match[2].trim();
    else if (match[3] !== undefined) pendingKind = match[3];
    else if (match[4] !== undefined) {
      const label = text(match[4]);
      if (label) {
        results.push({
          name: label.replace(/\s*\((\d)-PC\)$/i, '').trim(),
          pieces: Number(/\((\d)-PC\)/i.exec(label)?.[1]) || null,
          kind: pendingKind,
          ...score(pendingPercent)
        });
      }
      pendingPercent = null;
      pendingKind = null;
    }
  }
  return results;
}

export function parseLightCones(html) {
  const block = section(html, 'Best Light Cones');
  const cones = [];
  const re =
    /<div class="(percentage[^"]*)"><p>([^<]*)<\/p><\/div>|<span class="hsr-set-name[^"]*">([\s\S]*?)<\/span>(?:<span class="cone-super">\(S<!-- -->(\d)<!-- -->\)<\/span>)?/g;
  let percent = null;
  for (const match of block.matchAll(re)) {
    if (match[2] !== undefined) {
      percent = match[2].trim();
      continue;
    }
    const name = text(match[3] ?? '');
    if (!name) continue;
    cones.push({ name, superimposition: match[4] ? Number(match[4]) : null, ...score(percent) });
    percent = null;
  }
  return cones;
}

export function parseRelicSets(html) {
  const block = section(html, 'Best Relic Sets');
  const all = entries(block, 'hsr-set-image relic|hsr-set-image planetary');
  return {
    relics: all.filter((e) => e.kind?.includes('relic')).map(clean),
    planars: all.filter((e) => e.kind?.includes('planetary')).map(clean)
  };
}

function clean({ name, pieces, relativeDps, priority }) {
  return { name, pieces, relativeDps, priority };
}

const SLOTS = { Body: 'body', Feet: 'feet', 'Planar Sphere': 'sphere', 'Link Rope': 'rope' };

export function parseBestStats(html) {
  const block = section(html, 'Best Stats');
  const mainStats = {};
  // Slice per slot: from one stats-header to the next (list-stats nests divs,
  // so a non-greedy close-tag match truncates entries like "Lightning DMG").
  const chunks = block.split('<div class="stats-header">').slice(1);
  for (const chunk of chunks) {
    const label = /^<span>([^<]+)<\/span>/.exec(chunk)?.[1]?.trim();
    const key = SLOTS[label];
    if (!key) continue;
    const list = /<div class="list-stats">([\s\S]*?)(?=<div class="stats-header"|<div class="box sub-stats|$)/.exec(
      chunk
    )?.[1];
    if (!list) continue;
    // Keep Prydwen's own priority operators (">", ">=") between stat names.
    const parts = [...list.matchAll(/<span class="order">([^<]*)<\/span>|<span(?: class="hsr-dmg[^"]*")?>([^<]*)<\/span>/g)]
      .map(([, order, name]) => text(order ?? name ?? ''))
      .filter(Boolean);
    if (parts.length) mainStats[key] = parts.join(' ');
  }

  const substatsBox = /<div class="box sub-stats[^"]*">([\s\S]*?)<\/div>/.exec(block)?.[1];
  const note = /<div class="information[^"]*">([\s\S]*?)<\/div>/.exec(block)?.[1];

  // "Recommended endgame stats" is a separate section listing target values.
  const targetsBlock = section(html, 'Recommended endgame stats');
  const statTargets = [...targetsBlock.matchAll(/<li><p>([\s\S]*?)<\/p><\/li>/g)]
    .map(([, item]) => text(item))
    .filter(Boolean);

  return {
    mainStats,
    substats: substatsBox ? text(substatsBox).replace(/^Substats?:?\s*/i, '') || null : null,
    substatNote: note ? text(note) || null : null,
    statTargets
  };
}

/**
 * Teams come with the meta telemetry Prydwen collects from player runs. Only
 * the Memory of Chaos tab is server-rendered; the other three load client-side.
 */
const TARGET_KEYS = [
  [/^hp\b/i, 'hp'],
  [/^atk\b/i, 'atk'],
  [/^def\b/i, 'def'],
  [/^(spd|speed)\b/i, 'spd'],
  [/^crit\s*rate\b/i, 'critRate'],
  [/^crit\s*dmg\b/i, 'critDmg'],
  [/^break\s*effect\b/i, 'breakEffect'],
  [/^energy\s*regen/i, 'energyRegen'],
  [/^effect\s*hit\s*rate\b/i, 'effectHitRate'],
  [/^effect\s*res\b/i, null]
];

/**
 * Turns Prydwen's "Recommended endgame stats" prose into numbers, e.g.
 * `ATK: 2900-3200+` -> `{ atk: 2900 }`. Entries whose value is a paragraph
 * rather than a figure are skipped.
 */
export function parseStatTargets(targets) {
  const stats = {};
  for (const target of targets) {
    const [rawLabel, ...rest] = target.split(':');
    const value = rest.join(':').trim();
    if (!rawLabel || !value) continue;

    const match = TARGET_KEYS.find(([pattern]) => pattern.test(rawLabel.trim()));
    const key = match?.[1];
    if (!key) continue;

    // Prose answers ("The Herta has many different Speed Breakpoints…") have
    // no leading figure — ignore them rather than grabbing a stray number.
    const number = /^(\d+(?:\.\d+)?)/.exec(value.replace(/^~/, ''));
    if (!number) continue;

    const parsed = Number(number[1]);
    if (Number.isFinite(parsed)) stats[key] = parsed;
  }
  return stats;
}

export function parseTeams(html) {
  const block = section(html, '<div class="team-container-moc">', '<div class="footer');
  const teams = [];
  const rowRe = /<div class="team-row">([\s\S]*?)(?=<div class="team-row">|$)/g;
  for (const [, row] of block.matchAll(rowRe)) {
    const info = text(/<div class="column info">([\s\S]*?)<\/div>\s*<div class="column characters">/.exec(row)?.[1] ?? '');
    const members = [...row.matchAll(/href="\/star-rail\/characters\/([a-z0-9-]+)"[\s\S]{0,220}?<img alt="([^"]+)"/g)].map(
      ([, slug, name]) => ({ slug, name })
    );
    if (!members.length) continue;
    teams.push({
      rank: Number(/Rank\s*(\d+)/.exec(info)?.[1]) || null,
      appearanceRate: Number(/App\. rate:\s*([\d.]+)/.exec(info)?.[1]) || null,
      averageCycles: Number(/Avg\. cycles\s*:\s*([\d.]+)/.exec(info)?.[1]) || null,
      averageCyclesE1: Number(/Avg\. cycles\s*\(E1\+\):\s*([\d.]+)/.exec(info)?.[1]) || null,
      members
    });
  }
  return teams;
}

/** The pill row under the portrait: usage %, and per-mode performance. */
export function parseMetaStats(html) {
  const pills = [...html.matchAll(/<div class="pill">([\s\S]{0,160}?)<\/div>/g)].map(([, pill]) => text(pill));
  const find = (prefix) => pills.find((p) => p.startsWith(prefix));
  const number = (value) => {
    const parsed = Number(String(value ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    usage: number(/Usage:\s*([\d.]+)/.exec(find('Usage:') ?? '')?.[1]),
    mocAverageCycles: number(/MoC:\s*([\d.]+)/.exec(find('MoC:') ?? '')?.[1]),
    pureFictionScore: number(/PF:\s*([\d.]+)/.exec(find('PF:') ?? '')?.[1]),
    apocalypticShadowScore: number(/AS:\s*([\d.]+)/.exec(find('AS:') ?? '')?.[1])
  };
}

export function parseLastUpdated(html) {
  return /Last updated:\s*(?:<!-- -->)?<span>([^<]+)<\/span>/.exec(html)?.[1]?.trim() ?? null;
}

/** Slug + released flag for every character card on the roster page. */
export async function fetchRoster() {
  const html = await fetchText(`${PRYDWEN}/star-rail/characters`);
  const cardRe =
    /<a href="\/star-rail\/characters\/([a-z0-9-]+)">([\s\S]{0,900}?)<\/a>/g;
  const seen = new Map();
  for (const [, slug, card] of html.matchAll(cardRe)) {
    if (seen.has(slug)) continue;
    const name = text(/<span class="emp-name">([\s\S]*?)<\/span>/.exec(card)?.[1] ?? '');
    // Unreleased characters carry a `future` tag on their card.
    const unreleased = /class="tag future"/.test(card);
    if (name) seen.set(slug, { slug, name, unreleased });
  }
  return [...seen.values()];
}

export async function fetchCharacterPage(slug) {
  return fetchText(`${PRYDWEN}/star-rail/characters/${slug}`);
}
