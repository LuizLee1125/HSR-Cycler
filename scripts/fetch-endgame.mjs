import { fetchJson, writeGenerated } from './lib/fetch.mjs';
import {
  cdnUrl,
  extractBuffs,
  gameVersionOf,
  listReleasedSeasons,
  loadCoreTables,
  renderGameText,
  resolveDataVersion,
  resolveEnemy,
  toElement
} from './lib/nanoka.mjs';

/**
 * The four endgame modes live in separate index/detail file pairs on nanoka's
 * CDN, and each one nests its stages slightly differently.
 */
/** How many released seasons to keep per mode. Enough to cover a few patches. */
const SEASON_HISTORY = 4;

const MODES = [
  { mode: 'Memory of Chaos', index: 'maze.json', detail: 'en/maze' },
  { mode: 'Pure Fiction', index: 'maze_extra.json', detail: 'en/story' },
  { mode: 'Apocalyptic Shadow', index: 'maze_boss.json', detail: 'en/boss' },
  { mode: 'Anomaly Arbitration', index: 'maze_peak.json', detail: 'en/peak' }
];

/** `{ monster0: 123, monster1: 456 }` -> `[123, 456]` */
function waveMonsterIds(wave) {
  return Object.entries(wave ?? {})
    .filter(([key, value]) => key.startsWith('monster') && Number.isFinite(Number(value)))
    .map(([, value]) => Number(value));
}

/** Collapses repeats into `{ id, count }` so a 45-slot Pure Fiction wave stays readable. */
function tally(ids) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, count }));
}

function buildEnemies(tables, entries, stageEvent, infiniteWave, options) {
  const enemies = [];
  for (const { id, count } of entries) {
    const enemy = resolveEnemy(tables, id, stageEvent, infiniteWave, options);
    if (enemy) enemies.push({ ...enemy, count });
  }
  return enemies;
}

function buildNode(tables, index, stageEvent, infiniteList, damageTypes, options = {}) {
  if (!stageEvent) return null;

  const waves = (stageEvent.monster_list ?? []).map((wave, waveIndex) => ({
    waveIndex: waveIndex + 1,
    enemies: buildEnemies(tables, tally(waveMonsterIds(wave)), stageEvent, null, options)
  }));

  const endlessWaves = Object.values(infiniteList ?? {}).map((wave, waveIndex) => ({
    waveIndex: waveIndex + 1,
    maxOnField: wave.max_monster_count ?? null,
    hpMultiplier: Number((1 + (wave.param_list?.[1] ?? 0)).toFixed(2)),
    enemies: buildEnemies(tables, tally(wave.monster_group_id_list ?? []), stageEvent, wave, options)
  }));

  return {
    index,
    level: stageEvent.level ?? null,
    recommendedElements: (damageTypes ?? []).map(toElement),
    waves,
    endlessWaves
  };
}

function buildStarConditions(challenge = []) {
  return challenge
    .filter(Boolean)
    .map((condition) => renderGameText(condition.name, condition.param))
    .filter(Boolean);
}

/** Deduped by name — both Apocalyptic Shadow boss configs carry the same tags. */
function buildModifiers(list = []) {
  const byName = new Map();
  for (const entry of list ?? []) {
    if (!entry?.name) continue;
    const name = renderGameText(entry.name, entry.param);
    if (!name || byName.has(name)) continue;
    byName.set(name, {
      name,
      description: renderGameText(entry.desc, entry.param ?? entry.param_fix)
    });
  }
  return [...byName.values()];
}

function dedupeModifiers(list) {
  const byName = new Map();
  for (const entry of list) if (!byName.has(entry.name)) byName.set(entry.name, entry);
  return [...byName.values()];
}

/** Memory of Chaos, Pure Fiction and Apocalyptic Shadow all use the two-half layout. */
function buildSplitStage(tables, mode, stage, stageNumber, extraModifiers) {
  // Apocalyptic Shadow pits one two-phase boss per half.
  const options = { estimatePhases: mode === 'Apocalyptic Shadow' };
  const nodes = [
    buildNode(tables, 1, stage.event_id_list1?.[0], stage.infinite_list1, stage.damage_type1, options),
    buildNode(tables, 2, stage.event_id_list2?.[0], stage.infinite_list2, stage.damage_type2, options)
  ].filter(Boolean);

  return {
    id: `${slug(mode)}-${stage.id}`,
    stageId: stage.id,
    stageNumber,
    name: stage.name,
    starward: false,
    turbulence: stage.desc
      ? { name: stage.group_name || stage.name, description: renderGameText(stage.desc, stage.param) }
      : null,
    modifiers: dedupeModifiers([...extraModifiers, ...bossTagsOf(stage)]),
    cycleLimit: cycleLimitOf(stage.countdown),
    starConditions: buildStarConditions(stage.challenge),
    specialCondition: null,
    nodes
  };
}

/**
 * `countdown` means cycles in Memory of Chaos (30, or 45 on Starward) but
 * carries a score-scale number in Pure Fiction (45000), which is not a cycle
 * budget. Anything outside a believable cycle count is not one.
 */
function cycleLimitOf(...candidates) {
  for (const value of candidates) {
    if (Number.isFinite(value) && value > 0 && value <= 100) return value;
  }
  return null;
}

function bossTagsOf(stage) {
  return [stage.boss_monster_config1, stage.boss_monster_config2, stage.boss_monster_config]
    .filter(Boolean)
    .flatMap((config) => buildModifiers(config.tag_list));
}

/**
 * Starward is a bonus difficulty layered on the hardest normal stage. Its
 * record carries no name and points back with `pre_id`, holds a single
 * `event_id_list` node scaled by its own elite group (Memory of Chaos: 167
 * against the normal 164), and raises the bar — a 45-cycle countdown instead of
 * 30, and star thresholds at 15/30 cycles left plus a `challenge_special`.
 *
 * The three nodes are therefore the base stage's two halves followed by the
 * Starward node, which is the only reading of `pre_id` that yields three.
 */
function buildStarwardStage(tables, mode, base, extra, stageNumber, extraModifiers) {
  const options = { estimatePhases: mode === 'Apocalyptic Shadow' };
  const nodes = [
    buildNode(tables, 1, base.event_id_list1?.[0], base.infinite_list1, base.damage_type1, options),
    buildNode(tables, 2, base.event_id_list2?.[0], base.infinite_list2, base.damage_type2, options),
    buildNode(tables, 3, extra.event_id_list?.[0], extra.infinite_list, extra.damage_type, options)
  ].filter(Boolean);

  const special = extra.challenge_special;
  return {
    id: `${slug(mode)}-${extra.id}-starward`,
    stageId: extra.id,
    stageNumber,
    name: `${base.name} · Starward`,
    starward: true,
    turbulence: base.desc
      ? { name: base.group_name || base.name, description: renderGameText(base.desc, base.param) }
      : null,
    modifiers: dedupeModifiers([...extraModifiers, ...bossTagsOf(base), ...bossTagsOf(extra)]),
    cycleLimit: cycleLimitOf(extra.countdown, base.countdown),
    starConditions: buildStarConditions(extra.challenge),
    /** The extra clear condition Starward adds on top of the three stars. */
    specialCondition: special ? renderGameText(special.name, special.param) : null,
    nodes
  };
}

function slug(mode) {
  return mode.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
}

async function buildSeason(tables, dataVersion, { mode, detail }, season) {
  const data = await fetchJson(cdnUrl(dataVersion, `${detail}/${season.id}.json`));

  let stages;
  let buffChoices = [];
  if (mode === 'Anomaly Arbitration') {
    // Anomaly Arbitration is three escalating pre-stages plus one boss stage.
    // `boss_config.buff_list` is the pool the player picks one buff from;
    // `tag_list` is the enemy modifier set, which is not a choice.
    const levels = [...(data.pre_level ?? []), data.boss_level].filter(Boolean);
    buffChoices = extractBuffs([data.boss_config?.buff_list]);
    stages = levels.map((level, i) => {
      const isBoss = i === levels.length - 1;
      const node = buildNode(tables, 1, level.event_id_list?.[0], level.infinite_list, level.damage_type);
      // The boss stage upgrades the prelim tags in place (`Enrage` -> `Enrage+`),
      // so its own list replaces rather than extends them.
      const tags = isBoss ? (data.boss_config?.tag_list ?? level.tag_list) : level.tag_list;
      return {
        id: `${slug(mode)}-${data.id}-${level.id ?? i + 1}`,
        stageId: level.id ?? i + 1,
        stageNumber: i + 1,
        name: isBoss
          ? renderGameText(data.boss_config?.hard_name) || 'Final Stage'
          : `Preliminary ${i + 1}`,
        starward: false,
        turbulence: null,
        modifiers: buildModifiers(tags),
        cycleLimit: null,
        starConditions: buildStarConditions(level.challenge),
        specialCondition: null,
        nodes: node ? [node] : []
      };
    });
  } else {
    const raw = Array.isArray(data) ? data : (data.level ?? []);
    // Every mode ships a trailing unnamed placeholder row for the next patch.
    const named = raw.filter((stage) => stage && stage.name);
    // Apocalyptic Shadow spreads its selectable buffs across three groups;
    // Pure Fiction offers `option` as its pool. `sub_option` and `buff` are
    // the season's always-on mechanics in both, so they stay as modifiers.
    buffChoices =
      mode === 'Apocalyptic Shadow'
        ? extractBuffs([data.buff_list1, data.buff_list2, data.buff_list3])
        : mode === 'Pure Fiction'
          ? extractBuffs([data.option])
          : [];
    const extraModifiers = [
      ...(buffChoices.length ? [] : buildModifiers(data.option)),
      ...buildModifiers(data.sub_option),
      ...buildModifiers(data.buff ? [data.buff] : [])
    ];
    // Only the hardest stage is worth planning for — the lower ones are the
    // same fight with weaker scaling.
    const base = named[named.length - 1];
    stages = base ? [buildSplitStage(tables, mode, base, named.length, extraModifiers)] : [];

    // The Starward stage is the unnamed row that points back at the hardest one.
    const starward = raw.find((stage) => stage && !stage.name && stage.pre_id === base?.id);
    if (base && starward) {
      stages.push(buildStarwardStage(tables, mode, base, starward, named.length, extraModifiers));
    }
  }

  return {
    mode,
    seasonId: Number(season.id),
    seasonName: renderGameText(season.en),
    /** Null for the modes that publish no version map (Pure Fiction, Apocalyptic Shadow). */
    gameVersion: season.gameVersion ?? null,
    /** Empty when the mode gives the player no buff choice. */
    buffChoices,
    stages
  };
}

async function main() {
  const dataVersion = await resolveDataVersion();
  const gameVersion = gameVersionOf(dataVersion);
  const tables = await loadCoreTables(dataVersion);

  const modes = [];
  for (const config of MODES) {
    const seasonIndex = await fetchJson(cdnUrl(dataVersion, config.index));
    // These rotations reset once or twice a patch, so a mode carries several
    // released seasons and the user picks which one they are planning for.
    const released = await listReleasedSeasons(dataVersion, config.detail, seasonIndex, SEASON_HISTORY);

    const seasons = [];
    for (const entry of released) {
      seasons.push(await buildSeason(tables, dataVersion, config, entry));
    }
    // Newest first, so the current rotation is the default.
    seasons.reverse();
    modes.push({ mode: config.mode, seasons });

    console.log(
      `  ${config.mode}: ${seasons.length} season(s) — ` +
        seasons
          .map(
            (season) =>
              `${season.seasonName} (#${season.seasonId}${season.gameVersion ? `, v${season.gameVersion}` : ''}, ` +
              `${season.stages.length} stage(s), ${season.buffChoices.length} buff(s))`
          )
          .join(' | ')
    );
  }

  const target = await writeGenerated('src/data/generated/endgame.json', {
    source: 'https://hsr.nanoka.cc',
    dataVersion,
    gameVersion,
    generatedAt: new Date().toISOString(),
    modes
  });
  console.log(`endgame -> ${target}`);
}

await main();
