import { fetchJson, fetchText } from './fetch.mjs';

const SITE = 'https://hsr.nanoka.cc';
const CDN = 'https://static.nanoka.cc/hsr';

/**
 * nanoka.cc inlines its data URLs into the SSR payload as
 * `<script data-sveltekit-fetched data-url="https://static.nanoka.cc/hsr/<version>/...">`.
 * Reading the version back out of the live page means the generator tracks new
 * patches without anyone editing a constant here.
 */
export async function resolveDataVersion() {
  const html = await fetchText(`${SITE}/maze`);
  const versions = [...html.matchAll(/static\.nanoka\.cc\/hsr\/([0-9][0-9.]*)\//g)].map((m) => m[1]);
  if (!versions.length) throw new Error('Could not resolve nanoka dataVersion from /maze');
  // Highest version wins; the page references one version but be defensive.
  return versions.sort(compareVersions).at(-1);
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

/** `4.4.55` -> `4.4` */
export function gameVersionOf(dataVersion) {
  return dataVersion.split('.').slice(0, 2).join('.');
}

export function cdnUrl(dataVersion, path) {
  return `${CDN}/${dataVersion}/${path}`;
}

export async function loadCoreTables(dataVersion) {
  const [monster, monsterValue, eliteGroups, hardLevelGroups, infiniteEliteGroups] = await Promise.all([
    fetchJson(cdnUrl(dataVersion, 'monster.json')),
    fetchJson(cdnUrl(dataVersion, 'monstervalue.json')),
    fetchJson(cdnUrl(dataVersion, 'EliteGroup.json')),
    fetchJson(cdnUrl(dataVersion, 'HardLevelGroup.json')),
    fetchJson(cdnUrl(dataVersion, 'InfiniteEliteGroup.json'))
  ]);

  const eliteById = new Map();
  for (const row of Object.values(eliteGroups)) eliteById.set(row.EliteGroup, row);

  const infiniteEliteById = new Map();
  for (const row of Object.values(infiniteEliteGroups)) infiniteEliteById.set(row.EliteGroup, row);

  const hardByKey = new Map();
  for (const row of Object.values(hardLevelGroups)) {
    hardByKey.set(`${row.HardLevelGroup}:${row.Level}`, row);
  }

  return { monster, monsterValue, eliteById, infiniteEliteById, hardByKey };
}

/** Concrete stage ids extend the 7-digit template id (5012110 -> 501211002). */
function baseId(id) {
  const text = String(id);
  return text.length > 7 ? Number(text.slice(0, 7)) : Number(text);
}

function pickChild(template, monsterId) {
  const children = Array.isArray(template?.child) ? template.child : [];
  if (!children.length) return null;
  const base = baseId(monsterId);
  return (
    children.find((c) => Number(c.Id) === Number(monsterId)) ??
    children.find((c) => baseId(c.Id) === base) ??
    children[0]
  );
}

const IDENTITY_RATIOS = { HPRatio: 1, AttackRatio: 1, DefenceRatio: 1, SpeedRatio: 1, StanceRatio: 1 };

function pickElite(tables, child, stageEvent, infiniteWave, isInfinite) {
  const primary = Number((isInfinite ? infiniteWave?.elite_group : stageEvent?.elite_group) ?? 0);
  let row = tables.eliteById.get(primary);
  if (!row && isInfinite) row = tables.infiniteEliteById.get(primary);
  if (!row) {
    const fallback = Number(child?.EliteGroup ?? 0);
    row = tables.eliteById.get(fallback);
    if (!row && isInfinite) row = tables.infiniteEliteById.get(fallback);
  }
  return row ?? IDENTITY_RATIOS;
}

const ELEMENTS = {
  Thunder: 'Lightning',
  Physical: 'Physical',
  Fire: 'Fire',
  Ice: 'Ice',
  Wind: 'Wind',
  Quantum: 'Quantum',
  Imaginary: 'Imaginary'
};

export function toElement(raw) {
  return ELEMENTS[raw] ?? raw;
}

const BOSS_RANKS = new Set(['Boss', 'LittleBoss']);

export function isBossRank(rank) {
  return BOSS_RANKS.has(rank);
}

const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/**
 * Resolves a stage-instanced enemy to its live combat stats.
 *
 * This mirrors nanoka's own client-side resolution so the numbers match the
 * site exactly. Verified against Memory of Chaos 12 (Stormcleanse XII, level
 * 95, elite group 164) — Frigid Prowler 2,723,431 HP / 132 SPD and Stellaron
 * Hunter: Sam 11,347,629 HP — and against Pure Fiction "Domain Genesis (IV)",
 * where the infinite-wave `param_list[1]` HP multiplier is what turns a raw
 * 52,525 into the 525,255 the site shows.
 */
export function resolveEnemy(tables, monsterId, stageEvent, infiniteWave = null, { estimatePhases = false } = {}) {
  const template = tables.monsterValue[String(baseId(monsterId))];
  const meta = tables.monster[String(baseId(monsterId))];
  const child = pickChild(template, monsterId);
  if (!template || !meta || !child) return null;

  const isInfinite = Boolean(infiniteWave);
  const elite = pickElite(tables, child, stageEvent, infiniteWave, isInfinite);
  const level = num(stageEvent?.level, 1);
  const hard = tables.hardByKey.get(`${num(stageEvent?.hard_level_group)}:${level}`) ?? IDENTITY_RATIOS;

  let hp =
    num(template.HPBase) * num(child.HPModifyRatio, 1) * num(elite.HPRatio, 1) * num(hard.HPRatio, 1);
  // Endless waves (Pure Fiction, Anomaly Arbitration) carry their own HP scalar.
  if (isInfinite && Array.isArray(infiniteWave.param_list)) {
    hp *= 1 + num(infiniteWave.param_list[1], 0);
  }

  const atk =
    num(template.AttackBase) * num(child.AttackModifyRatio, 1) * num(elite.AttackRatio, 1) * num(hard.AttackRatio, 1);
  const def =
    num(template.DefenceBase) * num(child.DefenceModifyRatio, 1) * num(elite.DefenceRatio, 1) * num(hard.DefenceRatio, 1);
  const spd =
    num(template.SpeedBase) * num(child.SpeedModifyRatio, 1) * num(elite.SpeedRatio, 1) * num(hard.SpeedRatio, 1) +
    num(child.SpeedModifyValue, 0);
  const stance =
    num(template.StanceBase) * num(child.StanceModifyRatio, 1) * num(elite.StanceRatio, 1) * num(hard.StanceRatio, 1) +
    num(child.StanceModifyValue, 0);
  // Raw stance is 3x the toughness number the game (and every guide) quotes,
  // where a single-target Basic ATK removes 30.
  const toughness = stance / 3;

  // Enemies gain up to 10% extra Effect RES from level scaling past level 50.
  const levelEffectRes = level >= 51 ? Math.min((level - 50) * 0.4, 10) : 0;
  const rank = String(template.Rank ?? meta.rank ?? 'Minion');
  const phaseRatios = (Array.isArray(template.PhaseList) ? template.PhaseList : [])
    .map((phase) => num(phase?.PhaseMaxHPRatio, 1))
    .filter(Number.isFinite);

  return {
    monsterId: Number(monsterId),
    templateId: baseId(monsterId),
    name: meta.en || `Unknown ${monsterId}`,
    rank,
    isBoss: isBossRank(rank),
    level,
    hp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(def),
    spd: Math.round(spd),
    toughness: Math.round(toughness),
    // Multi-phase bosses restore to full HP for each phase. Apocalyptic Shadow
    // bosses rarely declare it, so fall back to the two-phase norm.
    phases: Math.max(1, num(template.MaxMonsterPhase, estimatePhases ? 2 : 1)),
    phasesEstimated: estimatePhases && !Number.isFinite(Number(template.MaxMonsterPhase)),
    phaseRatios: phaseRatios.length ? phaseRatios : [1],
    weaknesses: (child.StanceWeakList ?? meta.weak ?? []).map(toElement),
    effectRes: Number((num(template.StatusResistanceBase) * 100 + levelEffectRes).toFixed(1)),
    icon: iconUrl(meta.icon)
  };
}

function iconUrl(spritePath) {
  if (!spritePath) return '';
  // "SpriteOutput/MonsterFigure/Monster_3013010.png"
  //   -> "https://static.nanoka.cc/assets/hsr/monsterfigure/Monster_3013010.webp"
  const parts = spritePath.replace(/^SpriteOutput\//, '').split('/');
  const file = parts.pop().replace(/\.png$/i, '.webp');
  const dir = parts.map((p) => p.toLowerCase()).join('/');
  return `https://static.nanoka.cc/assets/hsr/${dir}/${file}`;
}

/**
 * Game text carries markup (`<color=#..>`, `<unbreak>`) and `#n[i]` parameter
 * slots. A slot followed by `%` reads its param as a ratio.
 */
export function renderGameText(text, params = []) {
  if (!text) return '';
  return text
    .replace(/#(\d+)\[([a-z]+\d*)\](%?)/gi, (_, index, format, percent) => {
      const raw = params[Number(index) - 1];
      if (raw === undefined) return '';
      const value = percent ? raw * 100 : raw;
      const decimals = /^f(\d+)$/i.exec(format);
      if (decimals) return `${value.toFixed(Number(decimals[1]))}${percent}`;
      return `${Math.round(value)}${percent}`;
    })
    .replace(/<\/?(?:unbreak|color|i|b)[^>]*>/gi, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Some modes publish `<detail>/version.json`, mapping game version -> season
 * ids (with unreleased seasons filed under `"unknown"`). That is the most
 * reliable way to skip beta content, so use it whenever it exists.
 */
export async function pickSeasonForVersion(dataVersion, detailPath, gameVersion, index) {
  try {
    const map = await fetchJson(cdnUrl(dataVersion, `${detailPath}/version.json`));
    const ids = map[gameVersion];
    if (Array.isArray(ids) && ids.length) {
      const id = String(ids.at(-1));
      const season = index[id] ?? Object.values(index).find((s) => String(s.id) === id);
      if (season) return { ...season, id };
    }
  } catch {
    // Mode has no version map; fall through to the naming heuristic.
  }
  return pickLiveSeason(index);
}

/** Newest season with a localised English name — unnamed rows are unreleased. */
export function pickLiveSeason(index) {
  // Anomaly Arbitration's index omits `id`, so fall back to the record key.
  const released = Object.entries(index)
    .map(([key, season]) => ({ ...season, id: season.id ?? key }))
    .filter((season) => season.en && season.en.trim());
  if (!released.length) throw new Error('No named season found');
  return released.sort((a, b) => Number(a.id) - Number(b.id)).at(-1);
}
