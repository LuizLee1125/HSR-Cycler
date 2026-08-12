/**
 * Light cones and relic sets, from StarRailRes.
 *
 * The important distinction this module makes is between the two halves of a
 * gear effect:
 *
 * - `properties` is the always-on stat line. A build card's displayed stats
 *   **already include it** — Saber's card reads 211.7% CRIT DMG because her
 *   gear alone gives 175.5% and A Thankless Coronation's `properties` entry
 *   adds the remaining 36%. Re-applying it would double-count.
 * - everything else in `desc` is conditional ("When using Ultimate, increases
 *   ATK by 40%…"). The card cannot show it, so the predictor applies it.
 *
 * Which param slots belong to `properties` is read out of the data rather than
 * guessed: a param whose value equals a property's value at the same
 * superimposition is that property, and is excluded from the conditional set.
 */

/** StarRailRes property ids -> the fields the damage pipeline understands. */
const PROPERTY_KEYS = {
  AttackAddedRatio: 'atk',
  HPAddedRatio: 'hp',
  DefenceAddedRatio: 'def',
  CriticalChanceBase: 'critRate',
  CriticalDamageBase: 'critDmg',
  BreakDamageAddedRatioBase: 'breakEffect',
  SpeedAddedRatio: 'spdPercent',
  StatusProbabilityBase: 'effectHitRate',
  SPRatioBase: 'energyRegen',
  AllDamageTypeAddedRatio: 'dmgBonus',
  PhysicalAddedRatio: 'dmgBonus',
  FireAddedRatio: 'dmgBonus',
  IceAddedRatio: 'dmgBonus',
  ThunderAddedRatio: 'dmgBonus',
  WindAddedRatio: 'dmgBonus',
  QuantumAddedRatio: 'dmgBonus',
  ImaginaryAddedRatio: 'dmgBonus'
};

/**
 * Conditional-effect rules. Same shape as the stage-buff rules, but matched
 * against `#n[i]%` slots so the magnitude comes from `params` at the wearer's
 * actual superimposition.
 */
const EFFECT_RULES = [
  ['defIgnore', /ignores?\s+#(\d+)\[[a-z0-9]*\]%\s+of[^,;]*?DEF/i],
  ['resPen', /ignores?\s+#(\d+)\[[a-z0-9]*\]%\s+of[^,;]*?RES/i],
  ['resPen', /RES\s+PEN[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['resPen', /(?:decreases?|reduces?)[^,;]*?RES[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['critRate', /CRIT\s+Rate\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['critDmg', /CRIT\s+DMG\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['breakEffect', /Break\s+Effect\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['vulnerability', /DMG\s+taken[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  // "Follow-Up ATK" and "Basic ATK" name an ability, not the stat — without
  // this guard Inert Salsotto's "Follow-Up ATK increases by 15%" reads as an
  // ATK buff instead of the DMG bonus it is.
  ['atk', /(?<!(?:Follow-up|Follow-Up|Basic|Normal)\s)\bATK\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['hp', /\bMax\s+HP\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['def', /\bDEF\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['spdPercent', /\bSPD\s+(?:by|increases?\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  // Deliberately loose: gear prose reads "DMG dealt by Skill and Ultimate by
  // 20%", so the number is not adjacent to the word it modifies. Clause
  // splitting keeps the reach bounded, and the earlier rules claim RES PEN and
  // vulnerability first.
  ['dmgBonus', /DMG[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i]
];

/** The `#n[i]%` slot, as it appears inside a rule's `source`. */
const SLOT_SOURCE = '#(\\d+)\\[[a-z0-9]*\\]%';

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** Param slots whose value matches an always-on property, at any tier. */
function staticParamSlots(params, properties) {
  const slots = new Set();
  const tiers = Math.max(params.length, properties.length);

  for (let tier = 0; tier < tiers; tier += 1) {
    const row = params[tier] ?? [];
    for (const property of properties[tier] ?? []) {
      const value = num(property.value);
      if (!value) continue;
      const index = row.findIndex((param) => Math.abs(num(param) - value) < 1e-9);
      if (index >= 0) slots.add(index);
    }
  }
  return slots;
}

/**
 * Reads the conditional half of an effect: every `#n[i]%` slot the description
 * uses that is not one of the always-on property slots.
 */
function parseConditional(desc, params, properties) {
  const statics = staticParamSlots(params, properties);
  const effects = [];
  const seen = new Set();

  for (const clause of String(desc ?? '').split(/[,;.]\s*/)) {
    if (!clause.trim()) continue;
    for (const [key, pattern] of EFFECT_RULES) {
      const paramIndex = Number(pattern.exec(clause)?.[1]) - 1;
      if (!Number.isFinite(paramIndex) || paramIndex < 0) continue;
      if (statics.has(paramIndex)) break;

      const signature = `${key}:${paramIndex}`;
      if (seen.has(signature)) break;
      seen.add(signature);
      effects.push({ key, paramIndex });
      break;
    }
  }
  return effects;
}

/** The always-on stats, kept so the UI can explain what the card already shows. */
function staticEffects(properties) {
  return (properties ?? []).map((tier) =>
    (tier ?? [])
      .map((property) => ({ key: PROPERTY_KEYS[property.type] ?? null, value: num(property.value) * 100 }))
      .filter((entry) => entry.key && entry.value)
  );
}

export function buildLightCones(cones, ranks) {
  return Object.entries(cones).map(([id, cone]) => {
    const rank = ranks[id] ?? {};
    const params = Array.isArray(rank.params) ? rank.params : [];
    const properties = Array.isArray(rank.properties) ? rank.properties : [];

    return {
      id,
      name: cone.name,
      rarity: cone.rarity,
      path: cone.path,
      skillName: rank.skill ?? '',
      params,
      /** Already reflected in a build card's numbers — never re-applied. */
      staticEffects: staticEffects(properties),
      /** Not on the card, so the predictor applies these. */
      conditionalEffects: parseConditional(rank.desc, params, properties)
    };
  });
}

/**
 * Relic set descriptions carry literal numbers ("Increases CRIT Rate by 8%")
 * rather than the `#n[i]%` slots light cones use, so they need their own pass.
 */
const LITERAL_RULES = EFFECT_RULES.map(([key, pattern]) => [
  key,
  new RegExp(pattern.source.split(SLOT_SOURCE).join('(\\d+(?:\\.\\d+)?)%'), 'i')
]);

function parseLiteral(desc, staticList) {
  const effects = [];
  const seen = new Set();

  for (const clause of String(desc ?? '').split(/[,;.]\s*/)) {
    if (!clause.trim()) continue;
    for (const [key, pattern] of LITERAL_RULES) {
      const value = Number(pattern.exec(clause)?.[1]);
      if (!Number.isFinite(value) || value <= 0) continue;
      // Drop the clause that merely restates the always-on property — the
      // build card already includes it.
      if (staticList.some((entry) => entry.key === key && Math.abs(entry.value - value) < 1e-6)) break;

      const signature = `${key}:${value}`;
      if (seen.has(signature)) break;
      seen.add(signature);
      effects.push({ key, value });
      break;
    }
  }
  return effects;
}

export function buildRelicSets(sets) {
  return Object.entries(sets).map(([id, set]) => {
    const descriptions = Array.isArray(set.desc) ? set.desc : [];
    const properties = Array.isArray(set.properties) ? set.properties : [];

    // A set's tiers are its 2-piece and 4-piece effects, parsed independently.
    const bonuses = descriptions.map((desc, tier) => {
      const statics = staticEffects([properties[tier] ?? []])[0] ?? [];
      return {
        pieces: tier === 0 ? 2 : 4,
        description: desc,
        staticEffects: statics,
        conditionalEffects: parseLiteral(desc, statics)
      };
    });

    return {
      id,
      name: set.name,
      /** Planar ornaments only ever publish a 2-piece bonus. */
      planar: descriptions.length === 1,
      bonuses
    };
  });
}
