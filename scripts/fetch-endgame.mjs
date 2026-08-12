import { fetchJson, writeGenerated } from './lib/fetch.mjs';
import {
  cdnUrl,
  gameVersionOf,
  loadCoreTables,
  pickSeasonForVersion,
  renderGameText,
  resolveDataVersion,
  resolveEnemy,
  toElement
} from './lib/nanoka.mjs';

/**
 * The four endgame modes live in separate index/detail file pairs on nanoka's
 * CDN, and each one nests its stages slightly differently.
 */
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
    .map((condition) => renderGameText(condition.name, [condition.param]))
    .filter(Boolean);
}

function buildModifiers(list = []) {
  return list
    .filter((entry) => entry && entry.name)
    .map((entry) => ({
      name: renderGameText(entry.name, entry.param),
      description: renderGameText(entry.desc, entry.param ?? entry.param_fix)
    }));
}

/** Memory of Chaos, Pure Fiction and Apocalyptic Shadow all use the two-half layout. */
function buildSplitStage(tables, mode, stage, stageNumber, extraModifiers) {
  // Apocalyptic Shadow pits one two-phase boss per half.
  const options = { estimatePhases: mode === 'Apocalyptic Shadow' };
  const nodes = [
    buildNode(tables, 1, stage.event_id_list1?.[0], stage.infinite_list1, stage.damage_type1, options),
    buildNode(tables, 2, stage.event_id_list2?.[0], stage.infinite_list2, stage.damage_type2, options)
  ].filter(Boolean);

  const bossTags = [stage.boss_monster_config1, stage.boss_monster_config2]
    .filter(Boolean)
    .flatMap((config) => buildModifiers(config.tag_list));

  return {
    id: `${slug(mode)}-${stage.id}`,
    stageId: stage.id,
    stageNumber,
    name: stage.name,
    turbulence: stage.desc
      ? { name: stage.group_name || stage.name, description: renderGameText(stage.desc, stage.param) }
      : null,
    modifiers: [...extraModifiers, ...bossTags],
    cycleLimit: stage.countdown ?? null,
    starConditions: buildStarConditions(stage.challenge),
    nodes
  };
}

function slug(mode) {
  return mode.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
}

async function buildSeason(tables, dataVersion, gameVersion, { mode, index, detail }) {
  const seasonIndex = await fetchJson(cdnUrl(dataVersion, index));
  const season = await pickSeasonForVersion(dataVersion, detail, gameVersion, seasonIndex);
  const data = await fetchJson(cdnUrl(dataVersion, `${detail}/${season.id}.json`));

  let stages;
  if (mode === 'Anomaly Arbitration') {
    // Anomaly Arbitration is three escalating pre-stages plus one boss stage,
    // all sharing a single buff pool, and none of them carry their own name.
    const levels = [...(data.pre_level ?? []), data.boss_level].filter(Boolean);
    const modifiers = buildModifiers(data.boss_config?.buff_list);
    stages = levels.map((level, i) => {
      const isBoss = i === levels.length - 1;
      const node = buildNode(tables, 1, level.event_id_list?.[0], level.infinite_list, level.damage_type);
      return {
        id: `${slug(mode)}-${data.id}-${level.id ?? i + 1}`,
        stageId: level.id ?? i + 1,
        stageNumber: i + 1,
        name: isBoss
          ? renderGameText(data.boss_config?.hard_name) || 'Final Stage'
          : `Preliminary ${i + 1}`,
        turbulence: null,
        modifiers: [...modifiers, ...buildModifiers(level.tag_list)],
        cycleLimit: null,
        starConditions: buildStarConditions(level.challenge),
        nodes: node ? [node] : []
      };
    });
  } else {
    const raw = Array.isArray(data) ? data : (data.level ?? []);
    // Every mode ships a trailing unnamed placeholder row for the next patch.
    const named = raw.filter((stage) => stage && stage.name);
    const extraModifiers = [
      ...buildModifiers(data.option),
      ...buildModifiers(data.buff ? [data.buff] : [])
    ];
    stages = named.map((stage, i) => buildSplitStage(tables, mode, stage, i + 1, extraModifiers));
  }

  return {
    mode,
    seasonId: Number(season.id),
    seasonName: renderGameText(season.en),
    stages
  };
}

async function main() {
  const dataVersion = await resolveDataVersion();
  const gameVersion = gameVersionOf(dataVersion);
  const tables = await loadCoreTables(dataVersion);

  const modes = [];
  for (const config of MODES) {
    const season = await buildSeason(tables, dataVersion, gameVersion, config);
    modes.push(season);
    const enemies = season.stages.reduce(
      (sum, stage) =>
        sum +
        stage.nodes.reduce(
          (n, node) =>
            n +
            node.waves.reduce((w, wave) => w + wave.enemies.length, 0) +
            node.endlessWaves.reduce((w, wave) => w + wave.enemies.length, 0),
          0
        ),
      0
    );
    console.log(
      `  ${config.mode}: ${season.seasonName} (#${season.seasonId}) — ${season.stages.length} stages, ${enemies} enemy entries`
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
