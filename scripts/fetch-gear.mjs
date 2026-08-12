import { fetchJson, writeGenerated } from './lib/fetch.mjs';
import { buildLightCones, buildRelicSets } from './lib/gear.mjs';

const SRR = 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';
const SRR_INDEX = `${SRR}/index_new/en`;

async function main() {
  const [cones, ranks, sets] = await Promise.all([
    fetchJson(`${SRR_INDEX}/light_cones.json`),
    fetchJson(`${SRR_INDEX}/light_cone_ranks.json`),
    fetchJson(`${SRR_INDEX}/relic_sets.json`)
  ]);

  const lightCones = buildLightCones(cones, ranks);
  const relicSets = buildRelicSets(sets);

  const withConditional = lightCones.filter((cone) => cone.conditionalEffects.length).length;
  const setsWithConditional = relicSets.filter((set) =>
    set.bonuses.some((bonus) => bonus.conditionalEffects.length)
  ).length;

  console.log(
    `  light cones: ${lightCones.length} (${withConditional} with conditional effects) | ` +
      `relic sets: ${relicSets.length} (${setsWithConditional} with conditional effects)`
  );

  const target = await writeGenerated('src/data/generated/gear.json', {
    source: 'https://github.com/Mar-7th/StarRailRes',
    generatedAt: new Date().toISOString(),
    lightCones,
    relicSets
  });
  console.log(`gear -> ${target}`);
}

await main();
