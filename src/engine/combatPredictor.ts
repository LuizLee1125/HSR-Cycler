import type {
  ActionType,
  CharacterSkill,
  CombatEnemy,
  EndgameMode,
  EndgameStage,
  OutcomeBranch,
  SimulationResult,
  SkillSlot,
  StageBuff,
  StageNode,
  TeamMemberConfig,
  TurnActionInstruction
} from '../types/hsr';
import { allWaves, simulationCycleCap } from '../data/endgameStages';
import { SKILL_SLOT_LABEL, levelOf } from '../data/team';
import { conditionalTotals, type GearTotals } from '../data/gear';
import {
  abilityDamage,
  applyGear,
  avForCycles,
  breakDamage,
  buffInputs,
  calculateBaseAV,
  calculateDamage,
  collectBuffs,
  cycleAtAV,
  emptyBuffTotals,
  roleOf,
  spawn,
  targetsHit,
  type TeamBuffTotals
} from './hsrMechanics';
import { hashSeed, mulberry32, type Rng } from './rng';

/** Branches to roll. Enough spread to separate best from worst, still instant. */
const TRIALS = 25;

/** Cycles simulated past the three-star budget, so a failed run still reports. */
const OVERRUN_CYCLES = 6;

/**
 * Endgame enemies attack most turns and land a delay some of the time. Neither
 * number is published anywhere, so they are stated here as the model's own
 * assumptions rather than presented as sourced data.
 */
const ENEMY_ATTACK_CHANCE = 0.85;
const ENEMY_DELAY_CHANCE = 0.3;
const ENEMY_DELAY_AV = 0.25;
/** Weakness Break pushes the broken enemy's next turn back. */
const BREAK_DELAY_AV = 0.25;

interface AllyState {
  member: TeamMemberConfig;
  av: number;
  energy: number;
  turns: number;
  role: ReturnType<typeof roleOf>;
  isSupport: boolean;
  /** Buffs this unit's last cast put on the team, replaced when it casts again. */
  granted: TeamBuffTotals;
  /** Light cone and relic conditionals — personal, not shared with the team. */
  gear: GearTotals;
}

/** Sums every ally's live grants plus the stage buff into one set of numbers. */
function totalBuffs(allies: AllyState[], stage: ReturnType<typeof buffInputs>): TeamBuffTotals {
  const total = emptyBuffTotals();
  for (const ally of allies) {
    for (const key of Object.keys(total) as (keyof TeamBuffTotals)[]) total[key] += ally.granted[key];
  }
  total.dmgBonus += stage.dmgBonusExtra;
  total.resPen += stage.resPenPercent;
  total.defIgnore += stage.defShredPercent;
  total.critDmg += stage.critDmgBonus;
  total.vulnerability += stage.vulnerabilityPercent;
  return total;
}

interface EnemyState {
  enemy: CombatEnemy;
  av: number;
}

interface TrialOutcome {
  cycles: number;
  cleared: boolean;
  /** 0 on a clear; otherwise how much of the node was still standing. */
  hpRemaining: number;
  damage: number;
  seed: number;
  instructions: TurnActionInstruction[];
  spHistory: { av: number; sp: number }[];
}

/**
 * Branches that never clear all report the same cycle cap, so progress is the
 * real separator: a branch that ended with 4% of the node left is closer than
 * one that ended with 40%.
 */
function compareOutcomes(a: TrialOutcome, b: TrialOutcome): number {
  if (a.cleared !== b.cleared) return a.cleared ? -1 : 1;
  if (a.cycles !== b.cycles) return a.cycles - b.cycles;
  return a.hpRemaining - b.hpRemaining;
}

export interface SimulationOptions {
  nodeIndex?: number;
  buff?: StageBuff | null;
  trials?: number;
}

export function runCombatSimulation(
  team: TeamMemberConfig[],
  stage: EndgameStage,
  mode: EndgameMode,
  options: SimulationOptions = {}
): SimulationResult {
  const { nodeIndex = 0, buff = null, trials = TRIALS } = options;
  const node: StageNode | undefined = stage.nodes[nodeIndex];
  const budget = simulationCycleCap(stage, mode);
  const waves = node ? allWaves(node) : [];

  if (team.length !== 4 || !waves.length) {
    return emptyResult(stage, mode, nodeIndex, buff);
  }

  const seedBase = hashSeed(
    `${stage.id}:${nodeIndex}:${buff?.id ?? 'none'}:${team.map((m) => `${m.character.id}@${m.stats.spd}`).join(',')}`
  );

  const outcomes: TrialOutcome[] = [];
  for (let trial = 0; trial < trials; trial += 1) {
    outcomes.push(runTrial(team, waves, mode, budget, buff, seedBase + trial * 7919));
  }

  const sorted = [...outcomes].sort(compareOutcomes);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const cleared = outcomes.filter((outcome) => outcome.cleared).length;

  return {
    mode,
    stageName: stage.name,
    nodeIndex,
    bestCaseCycles: best.cycles,
    worstCaseCycles: worst.cycles,
    medianCycles: median.cycles,
    cycleLimit: stage.cycleLimit ? budget : null,
    clearProbability: cleared / outcomes.length,
    estimatedDamage: Math.round(median.damage),
    branches: describeBranches(best, median, worst, budget),
    buff,
    instructions: median.instructions,
    spHistory: median.spHistory,
    summaryTips: buildTips(team, stage, buff, best, worst, cleared / outcomes.length)
  };
}

/* ------------------------------------------------------------------ *
 * One rolled branch
 * ------------------------------------------------------------------ */

function runTrial(
  team: TeamMemberConfig[],
  waves: ReturnType<typeof allWaves>,
  mode: EndgameMode,
  budget: number,
  buff: StageBuff | null,
  seed: number
): TrialOutcome {
  const rng = mulberry32(seed);
  const mods = buffInputs(buff?.effects);
  const avCap = avForCycles(budget + OVERRUN_CYCLES, mode);

  const instructions: TurnActionInstruction[] = [];
  const spHistory: { av: number; sp: number }[] = [{ av: 0, sp: 3 }];

  const allies: AllyState[] = team.map((member) => {
    const damage = abilityDamage(member.character.skills.skill, member.skillLevels);
    const role = roleOf(member.character.path, damage.dealsDamage);
    const isSupport = role !== 'dps';
    // Talents are passive, so their grants are up from the first turn.
    const granted = collectBuffs(member.character.skills.talent, member.skillLevels, emptyBuffTotals(), {
      isSupport
    });
    const gear = conditionalTotals(member.gear);
    return {
      member,
      av: calculateBaseAV(
        member.stats.spd * mods.spdMultiplier * (1 + (granted.spdPercent + (gear.spdPercent ?? 0)) / 100)
      ),
      energy: Math.floor((member.character.maxEnergy ?? 120) * 0.5),
      turns: 0,
      role,
      isSupport,
      granted,
      gear
    };
  });

  let sp = 3;
  let totalDamage = 0;
  let av = 0;
  let turn = 1;
  let waveIndex = 0;
  let enemies = spawnWave(waves, 0);

  while (av < avCap && enemies.length) {
    // Wave cleared — advance, or finish if that was the last one.
    if (enemies.every((state) => state.enemy.currentHp <= 0)) {
      waveIndex += 1;
      if (waveIndex >= waves.length) {
        return {
          cycles: cycleAtAV(av, mode),
          cleared: true,
          hpRemaining: 0,
          damage: totalDamage,
          seed,
          instructions,
          spHistory
        };
      }
      enemies = spawnWave(waves, waveIndex);
      instructions.push({
        turnNumber: turn++,
        avTimestamp: Number(av.toFixed(1)),
        cycleNumber: cycleAtAV(av, mode),
        side: 'ally',
        characterName: 'Wave clear',
        characterIcon: '',
        actionType: 'Technique',
        abilityName: '',
        spChange: 0,
        currentSpAfter: sp,
        targetName: `Wave ${waveIndex + 1}`,
        estimatedDamage: 0,
        toughnessDamage: 0,
        recommendationReason: `Wave ${waveIndex} down. Wave ${waveIndex + 1} spawns — re-check weaknesses before committing Ultimates.`
      });
      continue;
    }

    const nextAlly = allies.reduce((a, b) => (a.av <= b.av ? a : b));
    const nextEnemy = enemies
      .filter((state) => state.enemy.currentHp > 0)
      .reduce((a, b) => (a.av <= b.av ? a : b));

    const allyFirst = nextAlly.av <= nextEnemy.av;
    const step = allyFirst ? nextAlly.av : nextEnemy.av;
    if (av + step > avCap) break;

    av += step;
    for (const ally of allies) ally.av -= step;
    for (const state of enemies) state.av -= step;

    if (allyFirst) {
      sp = takeAllyTurn({
        actor: nextAlly,
        allies,
        mode,
        enemies,
        sp,
        av,
        turn: turn++,
        mods,
        instructions,
        onDamage: (amount) => {
          totalDamage += amount;
        }
      });
      spHistory.push({ av: Number(av.toFixed(1)), sp });
      nextAlly.av = calculateBaseAV(nextAlly.member.stats.spd * mods.spdMultiplier);
    } else {
      takeEnemyTurn(nextEnemy, allies, mode, rng, av, turn++, instructions, mods);
    }
  }

  // Whatever is still alive in the current wave, plus every wave not reached.
  const standing =
    enemies.reduce((total, state) => total + state.enemy.currentHp, 0) +
    waves.slice(waveIndex + 1).reduce((total, wave) => total + waveHp(wave), 0);

  return {
    cycles: cycleAtAV(av, mode),
    cleared: false,
    hpRemaining: standing / Math.max(1, waves.reduce((total, wave) => total + waveHp(wave), 0)),
    damage: totalDamage,
    seed,
    instructions,
    spHistory
  };
}

function waveHp(wave: ReturnType<typeof allWaves>[number]): number {
  return wave.enemies.reduce(
    (total, enemy) => total + enemy.hp * Math.max(1, enemy.phases) * Math.max(1, enemy.count),
    0
  );
}

/* ------------------------------------------------------------------ *
 * Ally turns
 * ------------------------------------------------------------------ */

interface AllyTurnInput {
  actor: AllyState;
  allies: AllyState[];
  mode: EndgameMode;
  enemies: EnemyState[];
  sp: number;
  av: number;
  turn: number;
  mods: ReturnType<typeof buffInputs>;
  instructions: TurnActionInstruction[];
  onDamage: (amount: number) => void;
}

const ACTION_BY_SLOT: Partial<Record<SkillSlot, ActionType>> = {
  basic: 'Basic Attack',
  skill: 'Skill',
  ultimate: 'Ultimate',
  talent: 'Follow-Up Attack',
  memospriteSkill: 'Skill',
  elationSkill: 'Assist Skill'
};

function takeAllyTurn({
  actor,
  allies,
  mode,
  enemies,
  sp,
  av,
  turn,
  mods,
  instructions,
  onDamage
}: AllyTurnInput): number {
  const { member } = actor;
  const { character } = member;
  actor.turns += 1;

  const chosen = chooseAction(actor, sp);
  const skill = chosen.skill;
  const damage = abilityDamage(skill, member.skillLevels);
  const alive = enemies.filter((state) => state.enemy.currentHp > 0);
  const target = pickTarget(alive, character.element);

  // The cast replaces this unit's previous grants; the passive Talent stays.
  actor.granted = collectBuffs(
    skill,
    member.skillLevels,
    collectBuffs(character.skills.talent, member.skillLevels, emptyBuffTotals(), { isSupport: actor.isSupport }),
    { isSupport: actor.isSupport }
  );

  // Team grants and the stage buff, then this member's own gear conditionals.
  const buffs = applyGear(totalBuffs(allies, mods), actor.gear);
  const buffedStats = {
    ...member.stats,
    atk: member.stats.atk * (1 + buffs.atk / 100),
    critRate: Math.min(100, member.stats.critRate + buffs.critRate),
    critDmg: member.stats.critDmg + buffs.critDmg,
    breakEffect: member.stats.breakEffect + buffs.breakEffect,
    dmgBonus: member.stats.dmgBonus + buffs.dmgBonus
  };

  let spChange = chosen.slot === 'ultimate' ? 0 : (skill?.spCost ?? 0);
  if (chosen.slot === 'basic') spChange = 1;
  const nextSp = Math.min(5, Math.max(0, sp + spChange));

  let dealt = 0;
  let toughnessDealt = 0;
  let brokeWeakness = false;
  let reason = '';

  if (!target) {
    reason = 'No enemies left standing.';
  } else if (!damage.dealsDamage) {
    // Buffers, healers and shielders contribute no damage — the plan says so
    // rather than inventing a number for them.
    reason = supportReason(character.name, skill, chosen.slot);
  } else {
    const hitCount = targetsHit(skill, alive.length);
    const spread = hitCount > 1 ? alive.slice(0, hitCount) : [target];

    for (const state of spread) {
      const isMain = state === target || spread.length === 1;
      const multiplier = isMain ? damage.main : damage.adjacent || damage.main;
      if (multiplier <= 0) continue;

      const hit = calculateDamage({
        attackerLevel: member.level,
        stats: buffedStats,
        skillMultiplier: multiplier,
        scalingStat: damage.stat,
        actionType: chosen.action,
        element: character.element,
        target: state.enemy,
        defShredPercent: buffs.defIgnore,
        resPenPercent: buffs.resPen,
        vulnerabilityPercent: buffs.vulnerability,
        toughnessDepletion: (skill?.toughness ?? 30) * (isMain ? 1 : 0.5) * mods.breakEfficiency
      });

      dealt += hit.damage;
      state.enemy.currentHp = Math.max(0, state.enemy.currentHp - hit.damage);
      if (isMain) toughnessDealt = hit.toughnessDamage;

      if (hit.toughnessDamage > 0 && !state.enemy.isBroken) {
        state.enemy.currentToughness = Math.max(0, state.enemy.currentToughness - hit.toughnessDamage);
        if (state.enemy.currentToughness === 0) {
          state.enemy.isBroken = true;
          if (isMain) brokeWeakness = true;
          const burst = breakDamage(buffedStats, character.element, state.enemy);
          dealt += burst;
          state.enemy.currentHp = Math.max(0, state.enemy.currentHp - burst);
          state.av += calculateBaseAV(state.enemy.spd) * BREAK_DELAY_AV;
        }
      }
    }

    reason = `${skill?.name ?? chosen.action} into ${target.enemy.name} — ${Math.round(damage.main * 100)}% ${damage.stat.toUpperCase()} at ${SKILL_SLOT_LABEL[chosen.slot]} Lv.${levelOf(skill, member.skillLevels)}.`;
    if (brokeWeakness) reason += ' Weakness Broken — the enemy loses its next action.';
  }

  onDamage(dealt);

  // Energy: the ability's own generation, reset on Ultimate.
  const maxEnergy = character.maxEnergy ?? 120;
  if (chosen.slot === 'ultimate') actor.energy = skill?.energy ?? 5;
  else actor.energy = Math.min(maxEnergy, actor.energy + (skill?.energy ?? 20) * (member.stats.energyRegen / 100));

  instructions.push({
    turnNumber: turn,
    avTimestamp: Number(av.toFixed(1)),
    cycleNumber: cycleAtAV(av, mode),
    side: 'ally',
    characterName: character.name,
    characterIcon: character.icon,
    actionType: chosen.action,
    abilityName: skill?.name ?? '',
    spChange,
    currentSpAfter: nextSp,
    targetName: target?.enemy.name ?? '',
    estimatedDamage: dealt,
    toughnessDamage: toughnessDealt,
    recommendationReason: reason,
    isUltQueued: chosen.slot === 'ultimate',
    brokeWeakness
  });

  return nextSp;
}

interface ChosenAction {
  slot: SkillSlot;
  action: ActionType;
  skill: CharacterSkill | undefined;
}

/**
 * Ultimate the moment it is charged, otherwise the Skill when the Skill Point
 * economy allows it, otherwise a Basic ATK to bank one back. Supports re-cast
 * on a three-turn rhythm because that is how long a buff window lasts.
 */
function chooseAction(actor: AllyState, sp: number): ChosenAction {
  const skills = actor.member.character.skills;
  const maxEnergy = actor.member.character.maxEnergy ?? 120;

  if (skills.ultimate && actor.energy >= maxEnergy) {
    return { slot: 'ultimate', action: 'Ultimate', skill: skills.ultimate };
  }

  const skill = skills.memospriteSkill ?? skills.skill;
  const slot: SkillSlot = skills.memospriteSkill ? 'memospriteSkill' : 'skill';
  const wantsSkill =
    actor.role === 'dps'
      ? sp > 0
      : actor.role === 'support'
        ? sp > 1 && actor.turns % 3 === 1
        : sp > 2 && actor.turns % 2 === 1;

  if (skill && wantsSkill) return { slot, action: ACTION_BY_SLOT[slot] ?? 'Skill', skill };
  return { slot: 'basic', action: 'Basic Attack', skill: skills.basic };
}

function supportReason(name: string, skill: CharacterSkill | undefined, slot: SkillSlot): string {
  if (slot === 'basic') return `${name} has no Skill Points to spare — Basic ATK banks one back for the damage dealer.`;
  if (slot === 'ultimate') return `${name}'s Ultimate is charged. It deals no damage; fire it for the buff or the heal.`;
  return `${skill?.name ?? 'Skill'} — ${name} deals no damage here. This turn is spent on the buff, shield or heal.`;
}

/** Prefer a live enemy this element can break, then bosses, then anything alive. */
function pickTarget(alive: EnemyState[], element: string): EnemyState | null {
  if (!alive.length) return null;
  return (
    alive.find((state) => state.enemy.weaknesses.includes(element as never) && !state.enemy.isBroken) ??
    alive.find((state) => state.enemy.isBoss) ??
    alive[0]
  );
}

/* ------------------------------------------------------------------ *
 * Enemy turns — the source of the branching
 * ------------------------------------------------------------------ */

function takeEnemyTurn(
  state: EnemyState,
  allies: AllyState[],
  mode: EndgameMode,
  rng: Rng,
  av: number,
  turn: number,
  instructions: TurnActionInstruction[],
  mods: ReturnType<typeof buffInputs>
) {
  const victim = allies[Math.floor(rng() * allies.length)];
  const attacks = rng() < ENEMY_ATTACK_CHANCE;
  const delays = attacks && rng() < ENEMY_DELAY_CHANCE;

  if (delays) {
    victim.av += calculateBaseAV(victim.member.stats.spd * mods.spdMultiplier) * ENEMY_DELAY_AV;
  }

  const reason = !attacks
    ? `${state.enemy.name} spends its turn on a non-damaging move. Nobody is pushed back.`
    : delays
      ? `${state.enemy.name} attacks ${victim.member.character.name} and delays them by ${Math.round(ENEMY_DELAY_AV * 100)}% of a turn — the rotation slips.`
      : `${state.enemy.name} attacks ${victim.member.character.name}. No delay, so the rotation holds.`;

  instructions.push({
    turnNumber: turn,
    avTimestamp: Number(av.toFixed(1)),
    cycleNumber: cycleAtAV(av, mode),
    side: 'enemy',
    characterName: state.enemy.name,
    characterIcon: state.enemy.icon,
    actionType: 'Basic Attack',
    abilityName: '',
    spChange: 0,
    currentSpAfter: -1,
    targetName: victim.member.character.name,
    estimatedDamage: 0,
    toughnessDamage: 0,
    recommendationReason: reason
  });

  state.enemy.isBroken = false;
  state.enemy.currentToughness = state.enemy.toughness;
  state.av = calculateBaseAV(state.enemy.spd);
}

/* ------------------------------------------------------------------ *
 * Setup and reporting
 * ------------------------------------------------------------------ */

function spawnWave(waves: ReturnType<typeof allWaves>, index: number): EnemyState[] {
  const wave = waves[index];
  if (!wave) return [];
  const onField = wave.maxOnField ?? Number.POSITIVE_INFINITY;
  const states: EnemyState[] = [];

  for (const enemy of wave.enemies) {
    for (let i = 0; i < Math.max(1, enemy.count) && states.length < onField; i += 1) {
      const spawned = spawn(enemy, i);
      states.push({ enemy: spawned, av: calculateBaseAV(spawned.spd) });
    }
  }
  return states;
}

function describeBranches(
  best: TrialOutcome,
  median: TrialOutcome,
  worst: TrialOutcome,
  budget: number
): OutcomeBranch[] {
  return [
    {
      label: 'Best case',
      cycles: best.cycles,
      cleared: best.cleared,
      hpRemainingPercent: Number((best.hpRemaining * 100).toFixed(1)),
      note: 'Enemy attacks miss the rotation — nobody important gets delayed.'
    },
    {
      label: 'Typical',
      cycles: median.cycles,
      cleared: median.cleared,
      hpRemainingPercent: Number((median.hpRemaining * 100).toFixed(1)),
      note: `Half the rolled branches finish at or under this. Budget is ${budget} cycles.`
    },
    {
      label: 'Worst case',
      cycles: worst.cycles,
      cleared: worst.cleared,
      hpRemainingPercent: Number((worst.hpRemaining * 100).toFixed(1)),
      note: 'Delays land on the damage dealer repeatedly and turns get pushed out of the cycle.'
    }
  ];
}

function buildTips(
  team: TeamMemberConfig[],
  stage: EndgameStage,
  buff: StageBuff | null,
  best: TrialOutcome,
  worst: TrialOutcome,
  clearRate: number
): string[] {
  const tips: string[] = [];

  if (clearRate === 0) {
    tips.push('No rolled branch cleared this node inside the budget. The damage is not there yet.');
  } else if (clearRate < 1) {
    tips.push(
      `${Math.round(clearRate * 100)}% of branches cleared. The run turns on how often the enemies delay your damage dealer.`
    );
  }

  if (worst.cycles - best.cycles >= 2) {
    tips.push(
      `${worst.cycles - best.cycles} cycles separate the best and worst branch — this line-up is sensitive to enemy delays.`
    );
  }

  const slowest = [...team].sort((a, b) => a.stats.spd - b.stats.spd)[0];
  if (slowest && slowest.stats.spd < 134) {
    tips.push(
      `${slowest.character.name} is at ${slowest.stats.spd} SPD. 134 is the usual breakpoint for an extra turn in the first cycle.`
    );
  }

  if (buff) tips.push(`${buff.name} — ${buff.description}`);
  if (stage.turbulence) tips.push(`${stage.turbulence.name} — ${stage.turbulence.description}`);
  for (const modifier of stage.modifiers.slice(0, 2)) {
    tips.push(`${modifier.name} — ${modifier.description}`);
  }

  return tips;
}

function emptyResult(
  stage: EndgameStage,
  mode: EndgameMode,
  nodeIndex: number,
  buff: StageBuff | null
): SimulationResult {
  return {
    mode,
    stageName: stage.name,
    nodeIndex,
    bestCaseCycles: 0,
    worstCaseCycles: 0,
    medianCycles: 0,
    cycleLimit: stage.cycleLimit,
    clearProbability: 0,
    estimatedDamage: 0,
    branches: [],
    buff,
    instructions: [],
    spHistory: [],
    summaryTips: ['Import a build card for all four slots to generate a turn plan.']
  };
}
