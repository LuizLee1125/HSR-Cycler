/**
 * Per-level ability multipliers, sourced from StarRailRes' copy of the game's
 * own skill table.
 *
 * Prydwen renders its skill tab client-side, so a scraper cannot read the
 * percentages off the page. StarRailRes ships the same numbers the game (and
 * therefore Prydwen) uses, keyed by ability level, which is exactly what a
 * build card's talent levels index into.
 */

/** SRR `type` -> the slot a build card labels it with. */
const SLOT_BY_TYPE = {
  Normal: 'basic',
  BPSkill: 'skill',
  Ultra: 'ultimate',
  Talent: 'talent',
  Maze: 'technique',
  MemospriteSkill: 'memospriteSkill',
  MemospriteTalent: 'memospriteTalent',
  ElationDamage: 'elationSkill',
  Assist: 'assist'
};

/**
 * Toughness (stance) damage is not published by StarRailRes or Prydwen. These
 * are the game's standard values per action tier and spread; the predictor
 * flags anything derived here rather than presenting it as sourced.
 */
const TOUGHNESS = {
  basic: { single: 30, blast: 30, aoe: 20 },
  skill: { single: 60, blast: 60, aoe: 30 },
  ultimate: { single: 90, blast: 90, aoe: 60 },
  talent: { single: 30, blast: 30, aoe: 20 },
  memospriteSkill: { single: 60, blast: 60, aoe: 30 },
  memospriteTalent: { single: 30, blast: 30, aoe: 20 },
  elationSkill: { single: 60, blast: 60, aoe: 30 },
  assist: { single: 30, blast: 30, aoe: 20 },
  technique: { single: 30, blast: 30, aoe: 20 }
};

/** Skill Point delta, and the energy an action generates. */
const ECONOMY = {
  basic: { spCost: 1, energy: 20 },
  skill: { spCost: -1, energy: 30 },
  ultimate: { spCost: 0, energy: 5 },
  talent: { spCost: 0, energy: 10 },
  memospriteSkill: { spCost: -1, energy: 30 },
  memospriteTalent: { spCost: 0, energy: 10 },
  elationSkill: { spCost: 0, energy: 0 },
  assist: { spCost: 0, energy: 10 },
  technique: { spCost: 0, energy: 0 }
};

/** In-game ceiling with every trace unlocked and no Eidolons. */
export const DEFAULT_SKILL_LEVEL = {
  basic: 6,
  skill: 10,
  ultimate: 10,
  talent: 10,
  technique: 1,
  memospriteSkill: 10,
  memospriteTalent: 10,
  elationSkill: 10,
  assist: 1
};

const STATS = { ATK: 'atk', HP: 'hp', 'MAX HP': 'hp', DEF: 'def' };

const SCALING_RE = /#(\d+)\[[a-z0-9]*\]%\s+of\s+[^;#%]{0,45}?\b(Max HP|ATK|HP|DEF)\b/gi;

/** Clause bounds, so a match is read against its own sentence and no further. */
function clauseAround(desc, start, end) {
  let from = 0;
  for (let i = start - 1; i >= 0; i -= 1) {
    if (desc[i] === ',' || desc[i] === ';' || desc[i] === '.') {
      from = i + 1;
      break;
    }
  }
  let to = desc.length;
  for (let i = end; i < desc.length; i += 1) {
    if (desc[i] === ',' || desc[i] === ';' || desc[i] === '.') {
      to = i;
      break;
    }
  }
  return { head: desc.slice(from, start), tail: desc.slice(end, to) };
}

/**
 * Reads the scaling stat and param slot straight out of the description, e.g.
 * `"dealing Lightning DMG equal to #1[i]% of Acheron's ATK to this target, as
 * well as ... #2[i]% of Acheron's ATK to adjacent targets"` yields param 1
 * scaling off ATK against the main target and param 2 against adjacent ones.
 *
 * Two guards keep healing and bookkeeping numbers out:
 * - the clause has to be about DMG, so `"restores HP ... equal to #1[i]% of
 *   Max HP"` is skipped;
 * - the param has to change between level 1 and max, so stack counts and hit
 *   counts (which sit in the same array and never scale) are skipped.
 */
function parseScalings(rawDesc = '', params = []) {
  // "Dr. Ratio's ATK" would otherwise read as a sentence break.
  const desc = String(rawDesc).replace(/\bDr\.\s/g, 'Dr ');
  const first = params[0];
  const last = params[params.length - 1];

  const scalings = [];
  const seen = new Set();
  for (const match of desc.matchAll(SCALING_RE)) {
    const paramIndex = Number(match[1]) - 1;
    const stat = STATS[match[2].toUpperCase()];
    if (!stat || paramIndex < 0 || seen.has(paramIndex)) continue;

    const { head, tail } = clauseAround(desc, match.index, match.index + match[0].length);
    if (!/DMG/i.test(head)) continue;
    if (params.length > 1 && first?.[paramIndex] === last?.[paramIndex]) continue;

    seen.add(paramIndex);
    const spread = /adjacent/i.test(tail)
      ? 'adjacent'
      : /all enemies|all targets|each enemy/i.test(tail)
        ? 'all'
        : 'single';
    scalings.push({ paramIndex, stat, spread });
  }
  return scalings;
}

/**
 * The other half of a kit: what an ability does for the team. Same technique as
 * the damage scalings — the description names the stat and the param slot, so
 * the magnitude at any level comes out of `params` rather than a guess.
 */
const BUFF_RULES = [
  ['critDmg', /CRIT\s+DMG\s+(?:by|increases\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['critRate', /CRIT\s+Rate\s+(?:by|increases\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['breakEffect', /Break\s+Effect\s+(?:by|increases\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['defIgnore', /ignores?\s+#(\d+)\[[a-z0-9]*\]%\s+of[^,;]*?DEF/i],
  ['resPen', /RES\s+PEN[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['resPen', /(?:decreases?|reduces?)[^,;]*?RES[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['vulnerability', /DMG\s+taken[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  // "Follow-Up ATK" / "Basic ATK" name an ability, not the stat.
  ['atk', /(?<!(?:Follow-up|Follow-Up|Basic|Normal)\s)\bATK\s+(?:by|increases\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['spdPercent', /\bSPD\s+(?:by|increases\s+by)\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['dmgBonus', /DMG\s+dealt[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i],
  ['dmgBonus', /increases?[^,;]*?DMG[^,;]*?by\s+#(\d+)\[[a-z0-9]*\]%/i]
];

const TEAM_WORDS = /all allies|ally targets|all ally|teammates|all characters|other allies/i;

function parseAllyBuffs(rawDesc = '', params = []) {
  const desc = String(rawDesc).replace(/\bDr\.\s/g, 'Dr ');
  const buffs = [];
  const seen = new Set();

  for (const clause of desc.split(/[,;.]\s*/)) {
    if (!clause.trim()) continue;
    for (const [key, pattern] of BUFF_RULES) {
      const paramIndex = Number(pattern.exec(clause)?.[1]) - 1;
      if (!Number.isFinite(paramIndex) || paramIndex < 0) continue;

      const signature = `${key}:${paramIndex}`;
      if (seen.has(signature)) break;
      // A value that never moves between levels is a duration or a stack cap.
      if (params.length > 1 && params[0]?.[paramIndex] === params[params.length - 1]?.[paramIndex]) break;

      seen.add(signature);
      buffs.push({ key, paramIndex, target: TEAM_WORDS.test(clause) ? 'team' : 'self' });
      break;
    }
  }
  return buffs;
}

function spreadOf(effect, scalings) {
  if (/Blast/i.test(effect)) return 'blast';
  if (/AoE/i.test(effect)) return 'aoe';
  if (scalings.some((entry) => entry.spread === 'all')) return 'aoe';
  if (scalings.some((entry) => entry.spread === 'adjacent')) return 'blast';
  return 'single';
}

/**
 * Collects one canonical ability per slot for `gameId`. Characters whose
 * Ultimate is split into several sub-entries (Acheron's Rainblade hits) list
 * the real ability under the lowest id, so that one wins.
 */
export function buildSkills(allSkills, gameId) {
  const bySlot = {};
  // Memosprite abilities are filed under the owner's id with a `1` in front:
  // Castorice is `1407`, her memosprite's Skill is `1140701`.
  const ownPrefix = String(gameId);
  const memospritePrefix = `1${gameId}`;

  for (const [id, raw] of Object.entries(allSkills)) {
    const slot = SLOT_BY_TYPE[raw.type];
    if (!slot) continue;
    const prefix = slot.startsWith('memosprite') ? memospritePrefix : ownPrefix;
    if (!id.startsWith(prefix) || id.length !== prefix.length + 2) continue;
    if (bySlot[slot] && Number(bySlot[slot].id) <= Number(id)) continue;

    const params = Array.isArray(raw.params) ? raw.params : [];
    const scalings = parseScalings(raw.desc, params);
    const spread = spreadOf(raw.effect ?? '', scalings);

    bySlot[slot] = {
      id,
      name: raw.name ?? slot,
      slot,
      type: raw.type,
      effect: raw.effect ?? '',
      maxLevel: Math.max(1, Number(raw.max_level) || 1),
      params,
      scalings,
      allyBuffs: parseAllyBuffs(raw.desc, params),
      spread,
      // Non-damaging abilities (shields, buffs, heals) remove no toughness.
      toughness: scalings.length ? (TOUGHNESS[slot]?.[spread] ?? 30) : 0,
      toughnessDerived: scalings.length > 0,
      ...ECONOMY[slot]
    };
  }

  return bySlot;
}
