import type {
  TeamMemberConfig,
  EndgameStage,
  SimulationResult,
  TurnActionInstruction,
  ActionType,
  EnemyUnit
} from '../types/hsr';
import { calculateBaseAV, calculateDamage } from './hsrMechanics';

export function runCombatSimulation(
  team: TeamMemberConfig[],
  stage: EndgameStage
): SimulationResult {
  let currentSp = 3;
  const maxSp = team.some(t => t.character.id === 'sparkle') ? 7 : 5;
  let currentWaveIndex = 0;
  let activeEnemies: EnemyUnit[] = JSON.parse(JSON.stringify(stage.waves[0].enemies));
  
  let totalAvUsed = 0;
  const maxAvLimit = stage.mode === 'Pure Fiction' ? 450 : 1050; // 4 cycles for PF, 10 cycles for MoC
  
  const instructions: TurnActionInstruction[] = [];
  const spHistory: { av: number; sp: number }[] = [{ av: 0, sp: currentSp }];
  let totalDamageDealt = 0;
  let totalScore = 0;
  let turnCounter = 1;

  // Initialize Action Value timeline for team members
  const memberTimelines = team.map(member => ({
    member,
    currentAV: calculateBaseAV(member.stats.spd),
    energy: Math.floor(member.character.maxEnergy * 0.5), // start at 50% energy
    ultimateReady: false
  }));

  // Initial Technique setup
  instructions.push({
    turnNumber: 0,
    avTimestamp: 0,
    cycleNumber: 0,
    characterName: team[0]?.character.name || 'Team Leader',
    characterIcon: team[0]?.character.icon || '',
    actionType: 'Technique',
    spChange: 0,
    currentSpAfter: currentSp,
    targetName: 'All Enemies',
    estimatedDamage: 45000,
    toughnessDamage: 30,
    recommendationReason: 'Cast Techniques before entering battle (Firefly domain / Ruan Mei auto-break / Acheron instant strike).'
  });

  while (totalAvUsed < maxAvLimit && activeEnemies.some(e => e.currentHp > 0)) {
    // Sort timeline to find next unit turn
    memberTimelines.sort((a, b) => a.currentAV - b.currentAV);
    const activeMemberState = memberTimelines[0];
    const avAdvanceStep = activeMemberState.currentAV;

    totalAvUsed += avAdvanceStep;
    if (totalAvUsed >= maxAvLimit) break;

    // Deduct AV step from all units
    memberTimelines.forEach(m => {
      m.currentAV -= avAdvanceStep;
    });

    const member = activeMemberState.member;
    const char = member.character;
    const currentCycle = Math.floor((totalAvUsed - 150 < 0 ? 0 : totalAvUsed - 150) / 100) + (totalAvUsed <= 150 ? 0 : 1);

    // Target primary boss or highest HP enemy
    const targetEnemy = activeEnemies.find(e => e.isBoss && e.currentHp > 0) || activeEnemies.find(e => e.currentHp > 0)!;

    // Determine optimal action (Basic vs Skill)
    let chosenAction: ActionType = 'Basic Attack';
    let spChange = 1;
    let skillMultiplier = 1.0;
    let toughnessDmg = 30;
    let rationale = '';

    // Logic for Support / Buffer vs Main DPS
    const isMainDps = ['firefly', 'acheron', 'feixiao', 'jingliu', 'castorice'].includes(char.id);
    const isSuperBreakEngaged = team.some(t => t.character.id === 'harmony_mc' || t.character.id === 'firefly');

    if (isMainDps) {
      if (currentSp > 0) {
        chosenAction = 'Skill';
        spChange = -1;
        skillMultiplier = char.id === 'firefly' ? 2.6 : char.id === 'acheron' ? 2.4 : 2.2;
        toughnessDmg = char.id === 'firefly' ? 90 : 60;
        rationale = `Cast Skill on ${targetEnemy.name} for maximum damage output & toughness depletion.`;
      } else {
        chosenAction = 'Basic Attack';
        spChange = 1;
        skillMultiplier = 1.0;
        toughnessDmg = 30;
        rationale = `SP empty! Use Basic Attack on ${targetEnemy.name} to generate +1 SP for team.`;
      }
    } else {
      // Support / Sustain logic
      if (char.id === 'ruan_mei' || char.id === 'robin' || char.id === 'sparkle') {
        if (turnCounter % 3 === 1 && currentSp > 0) {
          chosenAction = 'Skill';
          spChange = -1;
          skillMultiplier = 0.5;
          rationale = `Cast Skill to deploy ${char.name} support field (Buffs team DMG & Action advance for 3 turns).`;
        } else {
          chosenAction = 'Basic Attack';
          spChange = 1;
          skillMultiplier = 1.0;
          rationale = `Use Basic Attack to generate +1 SP while support field remains active.`;
        }
      } else {
        // Sustain healer / shielder
        if (currentSp < 2) {
          chosenAction = 'Basic Attack';
          spChange = 1;
          rationale = `Use Basic Attack on minion to restore SP (+1 SP).`;
        } else {
          chosenAction = 'Skill';
          spChange = -1;
          rationale = `Use Skill to grant team shields / heals & emergency toughness damage.`;
        }
      }
    }

    // Adjust SP
    currentSp = Math.min(maxSp, Math.max(0, currentSp + spChange));
    spHistory.push({ av: Number(totalAvUsed.toFixed(1)), sp: currentSp });

    // Calculate Damage
    const dmgResult = calculateDamage({
      attackerLevel: 80,
      defenderLevel: 90,
      attackerStats: member.stats,
      skillMultiplier,
      actionType: chosenAction,
      element: char.element,
      targetEnemy,
      defShredPercent: char.id === 'firefly' ? 40 : char.id === 'acheron' ? 30 : 15,
      resPenPercent: char.id === 'ruan_mei' ? 25 : 10,
      isSuperBreak: isSuperBreakEngaged && (char.id === 'firefly' || char.id === 'harmony_mc'),
      toughnessDepletion: toughnessDmg
    });

    totalDamageDealt += dmgResult.damage;
    targetEnemy.currentHp = Math.max(0, targetEnemy.currentHp - dmgResult.damage);
    targetEnemy.currentToughness = Math.max(0, targetEnemy.currentToughness - dmgResult.toughnessDamage);

    if (targetEnemy.currentToughness === 0 && !targetEnemy.isBroken) {
      targetEnemy.isBroken = true;
      rationale += ` [WEAKNESS BROKEN!] Enemy action delayed by 30%.`;
    }

    // Check Ultimate trigger
    let isUltQueued = false;
    activeMemberState.energy += 30 * (1 + member.stats.energyRegen / 100);
    if (activeMemberState.energy >= char.maxEnergy) {
      activeMemberState.energy = 0;
      isUltQueued = true;
      const ultDmg = calculateDamage({
        attackerLevel: 80,
        defenderLevel: 90,
        attackerStats: member.stats,
        skillMultiplier: 3.5,
        actionType: 'Ultimate',
        element: char.element,
        targetEnemy,
        isSuperBreak: isSuperBreakEngaged,
        toughnessDepletion: 90
      }).damage;

      totalDamageDealt += ultDmg;
      targetEnemy.currentHp = Math.max(0, targetEnemy.currentHp - ultDmg);
      rationale += ` -> QUEUE ULTIMATE NOW! Unleash ${char.name}'s Ultimate for ${ultDmg.toLocaleString()} burst DMG!`;

      if (char.id === 'robin') {
        // Robin 100% team action advance
        memberTimelines.forEach(m => { m.currentAV = 0; });
        rationale += ` (Robin Ultimate triggers 100% Team Action Advance!)`;
      }
    }

    // Record turn instruction
    instructions.push({
      turnNumber: turnCounter++,
      avTimestamp: Number(totalAvUsed.toFixed(1)),
      cycleNumber: currentCycle,
      characterName: char.name,
      characterIcon: char.icon,
      actionType: chosenAction,
      spChange,
      currentSpAfter: currentSp,
      targetName: targetEnemy.name,
      estimatedDamage: dmgResult.damage,
      toughnessDamage: dmgResult.toughnessDamage,
      recommendationReason: rationale,
      isUltQueued
    });

    // Reset unit AV for next turn
    activeMemberState.currentAV = calculateBaseAV(member.stats.spd);

    // Wave transition check
    if (activeEnemies.every(e => e.currentHp <= 0)) {
      currentWaveIndex++;
      if (currentWaveIndex < stage.waves.length) {
        activeEnemies = JSON.parse(JSON.stringify(stage.waves[currentWaveIndex].enemies));
        instructions.push({
          turnNumber: turnCounter++,
          avTimestamp: Number(totalAvUsed.toFixed(1)),
          cycleNumber: currentCycle,
          characterName: 'System',
          characterIcon: '',
          actionType: 'Technique',
          spChange: 0,
          currentSpAfter: currentSp,
          targetName: `Wave ${currentWaveIndex + 1}`,
          estimatedDamage: 0,
          toughnessDamage: 0,
          recommendationReason: `[WAVE CLEARED] Transitioning to Wave ${currentWaveIndex + 1}: ${stage.waves[currentWaveIndex].name}`
        });
      } else {
        // All waves cleared!
        break;
      }
    }
  }

  const allCleared = activeEnemies.every(e => e.currentHp <= 0);
  const cyclesUsed = Math.ceil((totalAvUsed - 150 < 0 ? 150 : totalAvUsed) / 100);

  // Score calculation based on mode
  if (stage.mode === 'Pure Fiction') {
    totalScore = Math.min(40000, Math.floor((totalDamageDealt / 2500000) * 40000));
  } else if (stage.mode === 'Apocalyptic Shadow') {
    totalScore = Math.max(0, 3600 - Math.floor(totalAvUsed));
  } else {
    totalScore = allCleared ? (10 - cyclesUsed) * 1000 + 3000 : 1500;
  }

  return {
    cleared: allCleared,
    mode: stage.mode,
    cyclesUsed: Math.min(10, cyclesUsed),
    scoreAchieved: totalScore,
    totalDamageDealt,
    winProbability: allCleared ? 94.5 : Math.min(85, Math.floor((totalDamageDealt / 5000000) * 100)),
    instructions,
    spHistory,
    summaryTips: [
      `Maintain continuous SP balance above 2 for your main DPS turns.`,
      `Save Robin / Sparkle Ultimate until right before your main DPS turn for maximum AV efficiency.`,
      `Break enemy toughness before Boss unleashes powerful charge attack at AV timestamp.`,
      `Equip 160.1 Hyperspeed on support units (Ruan Mei / Sparkle / Tingyun) to gain an extra turn in Cycle 1.`
    ]
  };
}
