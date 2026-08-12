import type { ActionType, CharacterStats, CombatEnemy, ElementType, EnemyUnit, PathType } from '../types/hsr';

/**
 * Break base damage scales with the *attacker's* level. The app models level
 * 80 accounts, which is the level every endgame build guide assumes.
 */
export const BREAK_BASE_DAMAGE_LV80 = 3767.5533;

/** One Action Value cycle. Cycle N ends at 150 + 100 * (N - 1) AV. */
export const FIRST_CYCLE_AV = 150;
export const CYCLE_AV = 100;

/** AV = 10000 / SPD. */
export function calculateBaseAV(speed: number): number {
  return speed <= 0 ? 10_000 : 10_000 / speed;
}

export function cycleAtAV(av: number): number {
  if (av <= FIRST_CYCLE_AV) return 1;
  return Math.ceil((av - FIRST_CYCLE_AV) / CYCLE_AV) + 1;
}

export function cyclesUsed(av: number): number {
  return Math.max(1, cycleAtAV(av));
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
 * (1 + rate * dmg) rather than a dice roll so repeated runs of the predictor
 * give the same plan for the same build.
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
    isSuperBreak = false,
    toughnessDepletion = 30
  } = input;

  const hitsWeakness = target.weaknesses.includes(element);
  const toughnessDamage = hitsWeakness ? toughnessDepletion : 0;

  let baseDamage = (stats[scalingStat] || stats.atk) * skillMultiplier;
  if (isSuperBreak) {
    baseDamage =
      BREAK_BASE_DAMAGE_LV80 * (toughnessDepletion / 30) * (1 + stats.breakEffect / 100) * skillMultiplier;
  }

  const dmgBoost = isSuperBreak ? 1 : 1 + stats.dmgBonus / 100;

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
    : 1 + (Math.min(100, stats.critRate) / 100) * (stats.critDmg / 100);

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

const DPS_PATHS: PathType[] = ['Destruction', 'The Hunt', 'Erudition', 'Elation', 'Remembrance'];
const SUPPORT_PATHS: PathType[] = ['Harmony', 'Nihility'];

export type CombatRole = 'dps' | 'support' | 'sustain';

/** Roles are derived from the Path rather than a hand-kept list of characters. */
export function roleOf(path: PathType): CombatRole {
  if (DPS_PATHS.includes(path)) return 'dps';
  if (SUPPORT_PATHS.includes(path)) return 'support';
  return 'sustain';
}

export function formatAV(av: number): string {
  return av.toFixed(1);
}
