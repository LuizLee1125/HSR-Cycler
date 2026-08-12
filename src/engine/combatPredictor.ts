import type {
  ActionType,
  CombatEnemy,
  EndgameMode,
  EndgameStage,
  SimulationResult,
  StageNode,
  TeamMemberConfig,
  TurnActionInstruction
} from '../types/hsr';
import { allWaves, cycleBudget } from '../data/endgameStages';
import {
  CYCLE_AV,
  FIRST_CYCLE_AV,
  breakDamage,
  calculateBaseAV,
  calculateDamage,
  cycleAtAV,
  roleOf,
  spawn
} from './hsrMechanics';

const ATTACKER_LEVEL = 80;

interface UnitState {
  member: TeamMemberConfig;
  av: number;
  energy: number;
  turns: number;
}

/** Skill/Ultimate multipliers by role, tuned to endgame-level kits. */
const SKILL_MULTIPLIER = { dps: 2.4, support: 0.8, sustain: 0.6 } as const;
const ULT_MULTIPLIER = { dps: 3.8, support: 1.6, sustain: 1.4 } as const;

export function runCombatSimulation(
  team: TeamMemberConfig[],
  stage: EndgameStage,
  mode: EndgameMode,
  nodeIndex = 0
): SimulationResult {
  const node: StageNode | undefined = stage.nodes[nodeIndex];
  const budget = cycleBudget(stage, mode);
  const avLimit = FIRST_CYCLE_AV + CYCLE_AV * (budget - 1);

  const waves = node ? allWaves(node) : [];
  const instructions: TurnActionInstruction[] = [];
  const spHistory: { av: number; sp: number }[] = [];

  if (!team.length || !waves.length) {
    return {
      mode,
      stageName: stage.name,
      nodeIndex,
      cyclesUsed: 0,
      cycleLimit: budget,
      estimatedDamage: 0,
      breakableEnemies: 0,
      totalEnemies: 0,
      breaksAchieved: 0,
      spStarvedTurns: 0,
      instructions,
      spHistory,
      summaryTips: ['Add characters to the team to generate a turn plan.']
    };
  }

  // Weakness coverage is exact: real toughness values, real weakness lists.
  const teamElements = new Set(team.map((member) => member.character.element));
  const rosterEnemies = waves.flatMap((wave) => wave.enemies);
  const breakableEnemies = rosterEnemies.filter((enemy) =>
    enemy.weaknesses.some((element) => teamElements.has(element))
  ).length;

  // Sparkle-style kits raise the SP ceiling; everything else caps at 5.
  const maxSp = team.some((member) => member.character.id === 'sparkle') ? 7 : 5;
  let sp = 3;
  let totalDamage = 0;
  let av = 0;
  let turn = 1;
  let waveIndex = 0;

  const units: UnitState[] = team.map((member) => ({
    member,
    av: calculateBaseAV(member.stats.spd),
    energy: Math.floor((member.character.maxEnergy ?? 120) * 0.5),
    turns: 0
  }));

  let enemies: CombatEnemy[] = spawnWave(waves, 0);
  let breaksAchieved = 0;
  let spStarvedTurns = 0;

  spHistory.push({ av: 0, sp });

  while (av < avLimit) {
    units.sort((a, b) => a.av - b.av);
    const active = units[0];
    const step = active.av;
    if (av + step > avLimit) break;

    av += step;
    for (const unit of units) unit.av -= step;

    const { member } = active;
    const { character } = member;
    const role = roleOf(character.path);
    active.turns += 1;

    const target = pickTarget(enemies, character.element);
    if (!target) break;

    let action: ActionType = 'Basic Attack';
    let spChange = 1;
    let multiplier = 1;
    let toughness = 30;
    let reason = '';

    if (role === 'dps') {
      if (sp > 0) {
        action = 'Skill';
        spChange = -1;
        multiplier = SKILL_MULTIPLIER.dps;
        toughness = 60;
        reason = `Skill into ${target.name} — highest damage per Skill Point on the team.`;
      } else {
        spStarvedTurns += 1;
        reason = `Skill Points are empty. Basic ATK on ${target.name} to bank +1 SP for the next Skill.`;
      }
    } else if (role === 'support') {
      // Buff windows last ~3 turns, so re-cast on a 3-turn rhythm.
      if (active.turns % 3 === 1 && sp > 0) {
        action = 'Skill';
        spChange = -1;
        multiplier = SKILL_MULTIPLIER.support;
        reason = `Refresh ${character.name}'s buff window before the DPS turn.`;
      } else {
        reason = `${character.name}'s buff is still up — Basic ATK to feed the DPS a Skill Point.`;
      }
    } else if (sp >= 2) {
      action = 'Skill';
      spChange = -1;
      multiplier = SKILL_MULTIPLIER.sustain;
      reason = `Top up shields/healing while the team has Skill Points to spare.`;
    } else {
      reason = `Hold ${character.name}'s Skill — Basic ATK keeps the DPS supplied with Skill Points.`;
    }

    sp = Math.min(maxSp, Math.max(0, sp + spChange));
    spHistory.push({ av: Number(av.toFixed(1)), sp });

    const hit = calculateDamage({
      attackerLevel: ATTACKER_LEVEL,
      stats: member.stats,
      skillMultiplier: multiplier,
      actionType: action,
      element: character.element,
      target,
      defShredPercent: character.path === 'Nihility' ? 25 : 0,
      resPenPercent: character.path === 'Harmony' ? 20 : 0,
      isSuperBreak: member.stats.breakEffect >= 150 && character.path === 'Destruction',
      toughnessDepletion: toughness
    });

    totalDamage += hit.damage;
    applyDamage(target, hit.damage);

    let brokeWeakness = false;
    if (hit.toughnessDamage > 0 && !target.isBroken) {
      target.currentToughness = Math.max(0, target.currentToughness - hit.toughnessDamage);
      if (target.currentToughness === 0) {
        target.isBroken = true;
        brokeWeakness = true;
        breaksAchieved += 1;
        const burst = breakDamage(member.stats, character.element, target);
        totalDamage += burst;
        applyDamage(target, burst);
        reason += ` Weakness Broken — ${burst.toLocaleString()} Break DMG and the enemy's action is delayed.`;
      }
    }

    // Energy: roughly 30 per turn for an attacking action, scaled by ERR.
    active.energy += 30 * (member.stats.energyRegen / 100);
    let isUltQueued = false;
    const maxEnergy = character.maxEnergy ?? 120;
    if (active.energy >= maxEnergy) {
      active.energy = 0;
      isUltQueued = true;
      const ult = calculateDamage({
        attackerLevel: ATTACKER_LEVEL,
        stats: member.stats,
        skillMultiplier: ULT_MULTIPLIER[role],
        actionType: 'Ultimate',
        element: character.element,
        target,
        resPenPercent: character.path === 'Harmony' ? 20 : 0,
        toughnessDepletion: 60
      });
      totalDamage += ult.damage;
      applyDamage(target, ult.damage);
      reason += ` Fire ${character.name}'s Ultimate now (${ult.damage.toLocaleString()} DMG).`;
    }

    instructions.push({
      turnNumber: turn++,
      avTimestamp: Number(av.toFixed(1)),
      cycleNumber: cycleAtAV(av),
      characterName: character.name,
      characterIcon: character.icon,
      actionType: action,
      spChange,
      currentSpAfter: sp,
      targetName: target.name,
      estimatedDamage: hit.damage,
      toughnessDamage: hit.toughnessDamage,
      recommendationReason: reason,
      isUltQueued,
      brokeWeakness
    });

    active.av = calculateBaseAV(member.stats.spd);

    if (enemies.every((enemy) => enemy.currentHp <= 0)) {
      waveIndex += 1;
      if (waveIndex >= waves.length) break;
      enemies = spawnWave(waves, waveIndex);
      instructions.push({
        turnNumber: turn++,
        avTimestamp: Number(av.toFixed(1)),
        cycleNumber: cycleAtAV(av),
        characterName: 'Wave clear',
        characterIcon: '',
        actionType: 'Technique',
        spChange: 0,
        currentSpAfter: sp,
        targetName: `Wave ${waveIndex + 1}`,
        estimatedDamage: 0,
        toughnessDamage: 0,
        recommendationReason: `Wave ${waveIndex} down. Wave ${waveIndex + 1} spawns — re-check weaknesses before committing Ultimates.`
      });
    }
  }

  return {
    mode,
    stageName: stage.name,
    nodeIndex,
    cyclesUsed: Math.min(budget, cycleAtAV(av)),
    cycleLimit: budget,
    estimatedDamage: totalDamage,
    breakableEnemies,
    totalEnemies: rosterEnemies.length,
    breaksAchieved,
    spStarvedTurns,
    instructions,
    spHistory,
    summaryTips: buildTips(team, node, stage, breakableEnemies, rosterEnemies.length, spStarvedTurns)
  };
}

function spawnWave(waves: ReturnType<typeof allWaves>, index: number): CombatEnemy[] {
  const wave = waves[index];
  if (!wave) return [];
  return wave.enemies.flatMap((enemy) =>
    Array.from({ length: Math.max(1, enemy.count) }, (_, i) => spawn(enemy, i))
  );
}

function applyDamage(target: CombatEnemy, amount: number) {
  target.currentHp = Math.max(0, target.currentHp - amount);
}

/** Prefer a live enemy this element can break, then bosses, then anything alive. */
function pickTarget(enemies: CombatEnemy[], element: string): CombatEnemy | null {
  const alive = enemies.filter((enemy) => enemy.currentHp > 0);
  if (!alive.length) return null;
  return (
    alive.find((enemy) => enemy.weaknesses.includes(element as never) && !enemy.isBroken) ??
    alive.find((enemy) => enemy.isBoss) ??
    alive[0]
  );
}

function buildTips(
  team: TeamMemberConfig[],
  node: StageNode | undefined,
  stage: EndgameStage,
  breakable: number,
  totalEnemies: number,
  spStarvedTurns: number
): string[] {
  const tips: string[] = [];
  const covered = new Set(team.map((member) => member.character.element));
  const needed = new Set(node?.recommendedElements ?? []);
  const missing = [...needed].filter((element) => !covered.has(element));

  if (breakable < totalEnemies) {
    tips.push(
      `${totalEnemies - breakable} of ${totalEnemies} enemies here have no weakness this team can hit — they can only be broken by a weakness implant.`
    );
  } else if (totalEnemies) {
    tips.push(`Every enemy in this node has a weakness the team covers.`);
  }

  if (missing.length) {
    tips.push(`The node's recommended elements include ${missing.join(' and ')}, which nobody on the team brings.`);
  }

  const slowest = [...team].sort((a, b) => a.stats.spd - b.stats.spd)[0];
  if (slowest && slowest.stats.spd < 134) {
    tips.push(
      `${slowest.character.name} is at ${slowest.stats.spd} SPD. 134 is the usual breakpoint for an extra turn in the first cycle.`
    );
  }

  if (spStarvedTurns > 2) {
    tips.push(
      `${spStarvedTurns} turns were spent on Basic ATK purely to refill Skill Points — this line-up is Skill Point negative.`
    );
  }

  if (stage.turbulence) tips.push(`Turbulence — ${stage.turbulence.description}`);
  for (const modifier of stage.modifiers.slice(0, 2)) {
    tips.push(`${modifier.name} — ${modifier.description}`);
  }

  return tips;
}
