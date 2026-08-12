import type { CharacterStats, ElementType, EnemyUnit, ActionType } from '../types/hsr';

export const LEVEL_80_BREAK_BASE_DAMAGE = 3767.55;

export interface DamageCalculationParams {
  attackerLevel: number;
  defenderLevel: number;
  attackerStats: CharacterStats;
  skillMultiplier: number; // e.g. 2.0 for 200% ATK
  statType?: 'atk' | 'hp' | 'def';
  actionType: ActionType;
  element: ElementType;
  targetEnemy: EnemyUnit;
  defShredPercent?: number;
  resPenPercent?: number;
  vulnerabilityPercent?: number;
  isSuperBreak?: boolean;
  toughnessDepletion?: number;
}

/**
 * Calculates Action Value (AV) for a given speed.
 * AV = 10000 / Speed
 */
export function calculateBaseAV(speed: number): number {
  if (speed <= 0) return 1000;
  return 10000 / speed;
}

/**
 * Calculates total damage dealt based on standard HSR damage formula
 */
export function calculateDamage(params: DamageCalculationParams): {
  damage: number;
  isCrit: boolean;
  toughnessDamage: number;
} {
  const {
    attackerLevel = 80,
    defenderLevel = 90,
    attackerStats,
    skillMultiplier,
    statType = 'atk',
    element,
    targetEnemy,
    defShredPercent = 0,
    resPenPercent = 0,
    vulnerabilityPercent = 0,
    isSuperBreak = false,
    toughnessDepletion = 30
  } = params;

  // 1. Base Damage
  const baseStatValue = attackerStats[statType] || attackerStats.atk;
  let baseDmg = baseStatValue * skillMultiplier;

  // 2. Super Break Override
  if (isSuperBreak) {
    const breakEffectMultiplier = 1 + (attackerStats.breakEffect / 100);
    const toughnessMultiplier = toughnessDepletion / 30;
    baseDmg = LEVEL_80_BREAK_BASE_DAMAGE * toughnessMultiplier * breakEffectMultiplier * skillMultiplier;
  }

  // 3. DMG Boost Multiplier
  const dmgBoostMultiplier = 1 + (attackerStats.dmgBonus / 100);

  // 4. DEF Multiplier
  const totalDefShred = Math.min(1.0, defShredPercent / 100);
  const attackerLevelTerm = attackerLevel * 10 + 200;
  const defenderLevelTerm = (defenderLevel * 10 + 200) * (1 - totalDefShred);
  const defMultiplier = attackerLevelTerm / (attackerLevelTerm + defenderLevelTerm);

  // 5. RES Multiplier
  const baseEnemyRes = targetEnemy.resistances[element] ?? 0.20;
  const resPen = resPenPercent / 100;
  const effectiveRes = baseEnemyRes - resPen;
  const resMultiplier = Math.max(0.1, 1 - effectiveRes);

  // 6. Vulnerability Multiplier
  const vulnerabilityMultiplier = 1 + (vulnerabilityPercent / 100);

  // 7. Toughness / Broken Multiplier
  const brokenMultiplier = targetEnemy.isBroken ? 1.0 : 0.9;

  // 8. CRIT Multiplier
  let critMultiplier = 1.0;
  let isCrit = false;
  if (!isSuperBreak) {
    const effectiveCritRate = Math.min(100, attackerStats.critRate) / 100;
    // We average or simulate CRIT hit
    isCrit = Math.random() < effectiveCritRate;
    critMultiplier = isCrit ? (1 + attackerStats.critDmg / 100) : 1.0;
  }

  const finalDamage = Math.floor(
    baseDmg *
    (isSuperBreak ? 1 : dmgBoostMultiplier) *
    defMultiplier *
    resMultiplier *
    vulnerabilityMultiplier *
    brokenMultiplier *
    critMultiplier
  );

  // Calculate Toughness Damage
  let effectiveToughnessDmg = toughnessDepletion;
  if (targetEnemy.weaknesses.includes(element)) {
    effectiveToughnessDmg = toughnessDepletion;
  } else {
    // Non-weakness hit deals 0 toughness damage unless weakness implant or omni-break
    effectiveToughnessDmg = 0;
  }

  return {
    damage: Math.max(1, finalDamage),
    isCrit,
    toughnessDamage: effectiveToughnessDmg
  };
}

/**
 * Formats Action Value to human readable string (1 decimal)
 */
export function formatAV(av: number): string {
  return av.toFixed(1);
}
