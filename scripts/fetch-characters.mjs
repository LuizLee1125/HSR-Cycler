import { fetchJson, mapLimit, writeGenerated } from './lib/fetch.mjs';
import {
  fetchCharacterPage,
  fetchRoster,
  parseBestStats,
  parseLastUpdated,
  parseLightCones,
  parseMetaStats,
  parseRelicSets,
  parseStatTargets,
  parseTeams
} from './lib/prydwen.mjs';

const SRR = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';
const SRR_INDEX = `${SRR}/index_new/en`;

const PATHS = {
  Warrior: 'Destruction',
  Rogue: 'The Hunt',
  Mage: 'Erudition',
  Shaman: 'Harmony',
  Warlock: 'Nihility',
  Knight: 'Preservation',
  Priest: 'Abundance',
  Memory: 'Remembrance',
  Elation: 'Elation'
};

const ELEMENTS = { Thunder: 'Lightning' };

/**
 * Prydwen slugs that do not normalise onto the StarRailRes display name —
 * alternate versions, collab units and the two March 7th kits.
 */
const SLUG_TO_ID = {
  topaz: '1112',
  'dr-ratio': '1305',
  'imbibitor-lunae': '1213',
  'dan-heng-permansor-terrae': '1414',
  'tingyun-fugue': '1225',
  'march-7th': '1001',
  'march-7th-swordmaster': '1224',
  'march-7th-evernight': '1413',
  'blade-mortenax': '1507',
  'himeko-nova': '1510',
  'silver-wolf-lv-999': '1506',
  'the-herta': '1401',
  'the-dahlia': '1321'
};

/** Trailblazer ships as one entry per path per gender; Prydwen lists one per path. */
const TRAILBLAZER_PATHS = {
  'trailblazer-destruction': 'Destruction',
  'trailblazer-preservation': 'Preservation',
  'trailblazer-harmony': 'Harmony',
  'trailblazer-remembrance': 'Remembrance',
  'trailblazer-elation': 'Elation'
};

function normalise(value) {
  return String(value)
    .toLowerCase()
    .replace(/[•·]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Level 80 value of a promotion stat: base + step * (level - 1). */
function atLevel80(entry) {
  return entry ? entry.base + entry.step * 79 : 0;
}

function buildBaseStats(promotion) {
  const top = promotion?.values?.at(-1) ?? {};
  return {
    hp: Math.round(atLevel80(top.hp)),
    atk: Math.round(atLevel80(top.atk)),
    def: Math.round(atLevel80(top.def)),
    spd: Math.round(atLevel80(top.spd)),
    critRate: Number(((top.crit_rate?.base ?? 0.05) * 100).toFixed(1)),
    critDmg: Number(((top.crit_dmg?.base ?? 0.5) * 100).toFixed(1)),
    breakEffect: 0,
    energyRegen: 100,
    effectHitRate: 0,
    dmgBonus: 0
  };
}

function resolveSourceId(slug, name, srrCharacters) {
  if (SLUG_TO_ID[slug]) return SLUG_TO_ID[slug];

  const trailblazerPath = TRAILBLAZER_PATHS[slug];
  if (trailblazerPath) {
    const match = Object.entries(srrCharacters).find(
      ([id, character]) => id.startsWith('80') && PATHS[character.path] === trailblazerPath
    );
    return match?.[0] ?? null;
  }

  const target = normalise(name);
  const match = Object.entries(srrCharacters).find(([, character]) => normalise(character.name) === target);
  return match?.[0] ?? null;
}

async function main() {
  const [roster, srrCharacters, srrPromotions] = await Promise.all([
    fetchRoster(),
    fetchJson(`${SRR_INDEX}/characters.json`),
    fetchJson(`${SRR_INDEX}/character_promotions.json`)
  ]);

  const released = roster.filter((entry) => !entry.unreleased);
  console.log(
    `  roster: ${roster.length} listed, ${roster.length - released.length} unreleased excluded (${roster
      .filter((e) => e.unreleased)
      .map((e) => e.slug)
      .join(', ')})`
  );

  const unresolved = [];
  const characters = await mapLimit(released, 6, async (entry) => {
    const sourceId = resolveSourceId(entry.slug, entry.name, srrCharacters);
    if (!sourceId) {
      unresolved.push(entry.slug);
      return null;
    }
    const source = srrCharacters[sourceId];
    const html = await fetchCharacterPage(entry.slug);
    const sets = parseRelicSets(html);
    const stats = parseBestStats(html);

    return {
      id: entry.slug,
      gameId: sourceId,
      name: entry.name,
      element: ELEMENTS[source.element] ?? source.element,
      path: PATHS[source.path] ?? source.path,
      rarity: source.rarity,
      maxEnergy: source.max_sp ?? null,
      icon: `${SRR}/${source.icon}`,
      preview: `${SRR}/${source.preview}`,
      splash: `${SRR}/${source.portrait}`,
      baseStats: buildBaseStats(srrPromotions[sourceId]),
      build: {
        relicSets: sets.relics,
        planarSets: sets.planars,
        lightCones: parseLightCones(html),
        mainStats: stats.mainStats,
        substats: stats.substats,
        substatNote: stats.substatNote,
        statTargets: stats.statTargets,
        // Numeric form of the targets above, used to seed a realistic build
        // instead of dropping level-80 base stats into the predictor.
        statBaseline: parseStatTargets(stats.statTargets)
      },
      // Prydwen server-renders only the Memory of Chaos tab; the other three
      // modes are fetched client-side and are not available to a scraper.
      teams: parseTeams(html),
      meta: parseMetaStats(html),
      guideUpdated: parseLastUpdated(html)
    };
  });

  const resolved = characters.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  if (unresolved.length) {
    throw new Error(`Could not map Prydwen slugs to game data: ${unresolved.join(', ')}`);
  }

  const withTeams = resolved.filter((c) => c.teams.length).length;
  const withRelics = resolved.filter((c) => c.build.relicSets.length).length;
  console.log(`  characters: ${resolved.length} | ${withRelics} with relic sets | ${withTeams} with teams`);

  const target = await writeGenerated('src/data/generated/characters.json', {
    sources: ['https://www.prydwen.gg/star-rail', 'https://github.com/Mar-7th/StarRailRes'],
    generatedAt: new Date().toISOString(),
    characters: resolved
  });
  console.log(`characters -> ${target}`);
}

await main();
