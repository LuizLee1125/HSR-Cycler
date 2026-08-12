import type {
  CharacterSkill,
  HSRCharacter,
  SkillLevels,
  SkillSlot,
  TeamMemberConfig,
  TeamSlot
} from '../types/hsr';

/** The rows a build card shows a level for, in card order. */
export const SKILL_SLOTS: SkillSlot[] = [
  'basic',
  'skill',
  'ultimate',
  'talent',
  'memospriteSkill',
  'memospriteTalent',
  'elationSkill'
];

export const SKILL_SLOT_LABEL: Record<SkillSlot, string> = {
  basic: 'Basic ATK',
  skill: 'Skill',
  ultimate: 'Ultimate',
  talent: 'Talent',
  technique: 'Technique',
  memospriteSkill: 'Memosprite Skill',
  memospriteTalent: 'Memosprite Talent',
  elationSkill: 'Elation Skill',
  assist: 'Assist'
};

/** In-game ceiling with every trace unlocked and no Eidolons. */
export const DEFAULT_SKILL_LEVEL: Record<SkillSlot, number> = {
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

export function emptyTeam(): TeamSlot[] {
  return [null, null, null, null];
}

/** A slot only counts once a build card has supplied its stats. */
export function isImported(slot: TeamSlot): slot is TeamMemberConfig {
  return slot !== null && 'stats' in slot;
}

export function isTeamReady(team: TeamSlot[]): team is TeamMemberConfig[] {
  return team.length === 4 && team.every(isImported);
}

/** Slots the character actually has an ability in, so the UI shows no dead rows. */
export function skillSlotsOf(character: HSRCharacter): SkillSlot[] {
  return SKILL_SLOTS.filter((slot) => character.skills[slot]);
}

export function defaultSkillLevels(character: HSRCharacter): SkillLevels {
  const levels: SkillLevels = {};
  for (const slot of skillSlotsOf(character)) levels[slot] = DEFAULT_SKILL_LEVEL[slot];
  return levels;
}

/** Clamps a card-read level into the range the ability actually publishes. */
export function levelOf(skill: CharacterSkill | undefined, levels: SkillLevels): number {
  if (!skill) return 1;
  const wanted = levels[skill.slot] ?? DEFAULT_SKILL_LEVEL[skill.slot] ?? 1;
  return Math.min(Math.max(1, Math.round(wanted)), skill.params.length || skill.maxLevel);
}
