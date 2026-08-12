import type { HSRCharacter, TeamSlot } from '../types/hsr';

/**
 * Why a character cannot go into a slot, or null when they can.
 *
 * Two rules, both because the game itself forbids the line-up:
 * - the same character cannot be fielded twice;
 * - the Trailblazer is one unit with several Paths, so two Trailblazers of any
 *   Paths cannot be on the same team.
 */
export function slotConflict(team: TeamSlot[], character: HSRCharacter, slot: number): string | null {
  for (let index = 0; index < team.length; index += 1) {
    if (index === slot) continue;
    const occupant = team[index]?.character;
    if (!occupant) continue;

    if (occupant.id === character.id) {
      return `${character.name} is already in slot ${index + 1}.`;
    }
    if (isTrailblazer(occupant) && isTrailblazer(character)) {
      return `${occupant.name} is already in slot ${index + 1} — only one Trailblazer per team.`;
    }
  }
  return null;
}

/** Every Trailblazer kit shares the in-game unit, whatever the Path. */
export function isTrailblazer(character: HSRCharacter): boolean {
  return character.id.startsWith('trailblazer');
}
