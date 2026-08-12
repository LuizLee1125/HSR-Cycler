import type {
  ActionType,
  BuffEffects,
  CharacterSkill,
  CharacterStats,
  CombatEnemy,
  ElementType,
  EndgameMode,
  EnemyUnit,
  PathType,
  SkillLevels
} from '../types/hsr';
import { levelOf } from '../data/team';
import type { GearTotals } from '../data/gear';

/**
 * Break base damage is a per-level constant published in the game's own table.
 * Only the level-80 value is available to this project, and endgame build cards
 * are level 80 in practice, so break damage is computed at 80 regardless of the
 * level read off the card. Everything else uses the card's real level.
 */
export const BREAK_BASE_DAMAGE_LV80 = 3767.5533;

/** One Action Value cycle. The first is longer than the rest. */
export const FIRST_CYCLE_AV = 150;
export const CYCLE_AV = 100;

export interface CycleModel {
  firstCycleAV: number;
  cycleAV: number;
  /**
   * Memory of Chaos and Anomaly Arbitration count the opening cycle as **0**,
   * so a clear inside the first 150 AV is "0 cycles", not 1. The score-based
   * modes have no cycle display and count from 1.
   */
  startsAtZero: boolean;
}

/**
 * Per-mode, because the modes genuinely differ.
 *
 * Open question, flagged rather than guessed: the user reports that Anomaly
 * Arbitration counts differently from Memory of Chaos beyond both starting at
 * zero. Anomaly Arbitration's records carry no `countdown` and no cycle
 * `challenge`, so nanoka publishes nothing to derive that difference from. It
 * uses the Memory of Chaos timing here; correcting it is a one-line change to
 * this table once the real rule is known.
 */
export const CYCLE_MODEL: Record<EndgameMode, CycleModel> = {
  'Memory of Chaos': { firstCycleAV: 150, cycleAV: 100, startsAtZero: true },
  'Pure Fiction': { firstCycleAV: 150, cycleAV: 100, startsAtZero: false },
  'Apocalyptic Shadow': { firstCycleAV: 150, cycleAV: 100, startsAtZero: false },
  'Anomaly Arbitration': { firstCycleAV: 150, cycleAV: 100, startsAtZero: true }
};

/** AV = 10000 / SPD. */
export function calculateBaseAV(speed: number): number {
  return speed <= 0 ? 10_000 : 10_000 / speed;
}

export function cycleAtAV(av: number, mode: EndgameMode): number {
  const model = CYCLE_MODEL[mode];
  const oneBased =
    av <= model.firstCycleAV ? 1 : Math.ceil((av - model.firstCycleAV) / model.cycleAV) + 1;
  return model.startsAtZero ? oneBased - 1 : oneBased;
}

/** The AV at which `cycles` cycles have elapsed, on the mode's own scale. */
export function avForCycles(cycles: number, mode: EndgameMode): number {
  const model = CYCLE_MODEL[mode];
  const elapsed = model.startsAtZero ? cycles : Math.max(0, cycles - 1);
  return model.firstCycleAV + model.cycleAV * Math.max(0, elapsed);
}

/** Turns a generated `EnemyUnit` into a mutable per-run combatant. */
export function spawn(enemy: EnemyUnit, instance: number): CombatEnemy {
  return {
    ...enemy,
    instanceId: `${enemy.monsterId}-${instance}`,
    // Multi-phase bosses refill, so effective HP is HP per phase * phases.
    maxHp: enemy.hp * Math.max(1, enemy.phases),
    currentHp: enemy.hp * Math.max(1, enemy.phases),
    currentToughness: enemy.toughness,
    isBroken: false
  };
}

/* ------------------------------------------------------------------ *
 * Ability multipliers
 * ------------------------------------------------------------------ */

export interface AbilityDamage {
  /** Total multiplier against the main target, e.g. `2.5` for 250%. */
  main: number;
  /** Multiplier against each adjacent target on a Blast. */
  adjacent: number;
  stat: 'atk' | 'hp' | 'def';
  /** False for buffs, heals and shields — those deal no damage at all. */
  dealsDamage: boolean;
}

/**
 * Resolves an ability to its multiplier at the level read off the build card.
 *
 * Every distinct damage percentage the description names against the main
 * target is added up, which is how the game's own tooltips read a multi-hit
 * ability. Two known limits, stated rather than papered over:
 *
 * - kits whose damage scales with stacks, charges or a transformed state
 *   (Acheron's Slashed Dream, Firefly's enhanced Skill) read low, because the
 *   conditional half of the kit is prose the parser cannot price;
 * - kits that list both per-hit and combined figures read slightly high.
 *
 * Prydwen's measured average cycles is shown next to the prediction as the
 * reality check for exactly this reason.
 */
export function abilityDamage(skill: CharacterSkill | undefined, levels: SkillLevels): AbilityDamage {
  const empty: AbilityDamage = { main: 0, adjacent: 0, stat: 'atk', dealsDamage: false };
  if (!skill || !skill.scalings.length) return empty;

  const params = skill.params[levelOf(skill, levels) - 1] ?? skill.params[0];
  if (!params) return empty;

  let main = 0;
  let adjacent = 0;
  for (const scaling of skill.scalings) {
    const value = params[scaling.paramIndex];
    if (!Number.isFinite(value) || value <= 0) continue;
    if (scaling.spread === 'adjacent') adjacent += value;
    else main += value;
  }

  if (main <= 0 && adjacent <= 0) return empty;
  return { main, adjacent, stat: skill.scalings[0].stat, dealsDamage: true };
}

/** Enemies the ability reaches beyond its main target. */
export function targetsHit(skill: CharacterSkill | undefined, aliveCount: number): number {
  if (!skill) return 1;
  if (skill.spread === 'aoe') return Math.max(1, aliveCount);
  if (skill.spread === 'blast') return Math.min(aliveCount, 3);
  return 1;
}

/* ------------------------------------------------------------------ *
 * Damage
 * ------------------------------------------------------------------ */

export interface DamageInput {
  attackerLevel: number;
  stats: CharacterStats;
  /** Multiplier on the scaling stat, e.g. `2.4` for 240% ATK. */
  skillMultiplier: number;
  scalingStat?: 'atk' | 'hp' | 'def';
  actionType: ActionType;
  element: ElementType;
  target: CombatEnemy;
  defShredPercent?: number;
  resPenPercent?: number;
  vulnerabilityPercent?: number;
  critDmgBonus?: number;
  dmgBonusExtra?: number;
  isSuperBreak?: boolean;
  /** Toughness removed on the in-game scale (Basic ATK = 30). */
  toughnessDepletion?: number;
}

export interface DamageOutput {
  damage: number;
  toughnessDamage: number;
  /** Expected value across crit/non-crit, so runs are reproducible. */
  critMultiplier: number;
}

/**
 * Standard HSR damage pipeline. CRIT is applied as an expectation
 * (1 + rate * dmg) rather than a dice roll — the branching in this app models
 * enemy behaviour, not crit luck, so crit stays deterministic.
 */
export function calculateDamage(input: DamageInput): DamageOutput {
  const {
    attackerLevel,
    stats,
    skillMultiplier,
    scalingStat = 'atk',
    element,
    target,
    defShredPercent = 0,
    resPenPercent = 0,
    vulnerabilityPercent = 0,
    critDmgBonus = 0,
    dmgBonusExtra = 0,
    isSuperBreak = false,
    toughnessDepletion = 30
  } = input;

  const hitsWeakness = target.weaknesses.includes(element);
  const toughnessDamage = hitsWeakness ? toughnessDepletion : 0;

  if (skillMultiplier <= 0) return { damage: 0, toughnessDamage, critMultiplier: 1 };

  let baseDamage = (stats[scalingStat] || stats.atk) * skillMultiplier;
  if (isSuperBreak) {
    baseDamage =
      BREAK_BASE_DAMAGE_LV80 * (toughnessDepletion / 30) * (1 + stats.breakEffect / 100) * skillMultiplier;
  }

  const dmgBoost = isSuperBreak ? 1 : 1 + (stats.dmgBonus + dmgBonusExtra) / 100;

  // DEF multiplier uses the enemy's real DEF stat from nanoka.
  const effectiveDef = Math.max(0, target.def * (1 - Math.min(1, defShredPercent / 100)));
  const defMultiplier = 1 - effectiveDef / (effectiveDef + 200 + 10 * attackerLevel);

  // Endgame enemies carry 20% RES to non-weakness elements, 0% to weaknesses.
  const baseRes = hitsWeakness ? 0 : 0.2;
  const resMultiplier = Math.max(0.1, 1 - (baseRes - resPenPercent / 100));

  const vulnerability = 1 + vulnerabilityPercent / 100;
  // Damage taken is reduced by 10% while the enemy still has toughness.
  const brokenMultiplier = target.isBroken ? 1 : 0.9;
  const critMultiplier = isSuperBreak
    ? 1
    : 1 + (Math.min(100, stats.critRate) / 100) * ((stats.critDmg + critDmgBonus) / 100);

  const damage =
    baseDamage * dmgBoost * defMultiplier * resMultiplier * vulnerability * brokenMultiplier * critMultiplier;

  return { damage: Math.max(1, Math.round(damage)), toughnessDamage, critMultiplier };
}

/** Break damage dealt the moment an enemy's toughness hits zero. */
export function breakDamage(stats: CharacterStats, element: ElementType, target: CombatEnemy): number {
  const elementMultiplier: Record<ElementType, number> = {
    Physical: 2,
    Fire: 2,
    Ice: 1,
    Lightning: 1,
    Wind: 1.5,
    Quantum: 0.5,
    Imaginary: 0.5
  };
  const defMultiplier = 1 - target.def / (target.def + 200 + 10 * 80);
  return Math.round(
    BREAK_BASE_DAMAGE_LV80 * elementMultiplier[element] * (1 + stats.breakEffect / 100) * defMultiplier
  );
}

/** Everything the team is currently granting itself, as percentages. */
export interface TeamBuffTotals {
  atk: number;
  dmgBonus: number;
  critRate: number;
  critDmg: number;
  breakEffect: number;
  resPen: number;
  defIgnore: number;
  vulnerability: number;
  spdPercent: number;
}

export function emptyBuffTotals(): TeamBuffTotals {
  return {
    atk: 0,
    dmgBonus: 0,
    critRate: 0,
    critDmg: 0,
    breakEffect: 0,
    resPen: 0,
    defIgnore: 0,
    vulnerability: 0,
    spdPercent: 0
  };
}

/**
 * Reads an ability's buff grants at the level on the build card.
 *
 * `self` on a character whose Skill deals no damage is still a team buff in
 * practice — a pure support's Skill exists to be pointed at someone else — so
 * those are folded in too. On a damage dealer, `self` stays personal.
 */
export function collectBuffs(
  skill: CharacterSkill | undefined,
  levels: SkillLevels,
  into: TeamBuffTotals,
  { isSupport }: { isSupport: boolean }
): TeamBuffTotals {
  if (!skill?.allyBuffs.length) return into;
  const params = skill.params[levelOf(skill, levels) - 1] ?? skill.params[0];
  if (!params) return into;

  for (const buff of skill.allyBuffs) {
    if (buff.target === 'self' && !isSupport) continue;
    const value = params[buff.paramIndex];
    if (!Number.isFinite(value) || value <= 0) continue;
    into[buff.key] += value * 100;
  }
  return into;
}

/** Folds a member's conditional gear bonuses into the running buff totals. */
export function applyGear(into: TeamBuffTotals, gear: GearTotals): TeamBuffTotals {
  for (const [key, value] of Object.entries(gear) as [keyof TeamBuffTotals, number][]) {
    if (key in into && Number.isFinite(value)) into[key] += value;
  }
  return into;
}

/** Folds the stage buff the player picked into the damage pipeline's inputs. */
export function buffInputs(effects: BuffEffects | undefined) {
  return {
    dmgBonusExtra: effects?.dmgBonus ?? 0,
    resPenPercent: effects?.resPen ?? 0,
    defShredPercent: effects?.defIgnore ?? 0,
    critDmgBonus: effects?.critDmg ?? 0,
    vulnerabilityPercent: effects?.vulnerability ?? 0,
    breakEfficiency: 1 + (effects?.breakEfficiency ?? 0) / 100,
    spdMultiplier: 1 + (effects?.spdPercent ?? 0) / 100
  };
}

const DPS_PATHS: PathType[] = ['Destruction', 'The Hunt', 'Erudition', 'Elation'];
const SUPPORT_PATHS: PathType[] = ['Harmony', 'Nihility'];

export type CombatRole = 'dps' | 'support' | 'sustain';

/**
 * Path is the starting point, but Remembrance covers both damage dealers and
 * healers, so the character's own Skill decides: an ability with a damage
 * multiplier means the unit is here to attack.
 */
export function roleOf(path: PathType, skillDealsDamage: boolean): CombatRole {
  if (DPS_PATHS.includes(path)) return 'dps';
  if (path === 'Remembrance') return skillDealsDamage ? 'dps' : 'sustain';
  if (SUPPORT_PATHS.includes(path)) return skillDealsDamage ? 'dps' : 'support';
  return 'sustain';
}

export function formatAV(av: number): string {
  return av.toFixed(1);
}
