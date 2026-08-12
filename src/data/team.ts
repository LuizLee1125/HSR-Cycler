import type { CharacterStats, HSRCharacter, TeamMemberConfig } from '../types/hsr';
import { roleOf } from '../engine/hsrMechanics';

/**
 * Rough multipliers from level-80 base stats to a geared endgame account,
 * used only to fill gaps Prydwen's published stat targets do not cover.
 * Calibrated so e.g. Acheron's 698 base ATK lands near her 2,900 ATK target.
 */
const GEAR_MULTIPLIER = { hp: 2.6, atk: 4, def: 2.2 } as const;

/**
 * An endgame-realistic stat line: Prydwen's own recommended numbers where it
 * publishes them, scaled base stats everywhere else. Dropping raw base stats
 * into the predictor would model an unequipped character.
 */
export function assumedStats(character: HSRCharacter): CharacterStats {
  const base = character.baseStats;
  const isDps = roleOf(character.path) === 'dps';

  const geared: CharacterStats = {
    hp: Math.round(base.hp * GEAR_MULTIPLIER.hp),
    atk: Math.round(base.atk * GEAR_MULTIPLIER.atk),
    def: Math.round(base.def * GEAR_MULTIPLIER.def),
    spd: base.spd,
    critRate: isDps ? 70 : base.critRate,
    critDmg: isDps ? 140 : base.critDmg,
    breakEffect: 0,
    energyRegen: 100,
    effectHitRate: 0,
    // Elemental DMG sphere plus set bonuses, only meaningful on a damage dealer.
    dmgBonus: isDps ? 40 : 0
  };

  return { ...geared, ...character.build.statBaseline };
}

/** A team slot seeded with an assumed endgame build and Prydwen's top gear. */
export function makeMember(character: HSRCharacter, slot: number): TeamMemberConfig {
  return {
    slot,
    character,
    stats: assumedStats(character),
    eidolon: 0,
    superimposition: 1,
    lightCone: character.build.lightCones[0]?.name ?? '',
    relicSets: character.build.relicSets.slice(0, 1).map((set) => set.name),
    planarSet: character.build.planarSets[0]?.name ?? ''
  };
}
