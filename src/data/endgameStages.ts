import type { EndgameStage } from '../types/hsr';

export const ENDGAME_STAGES_DATABASE: EndgameStage[] = [
  {
    id: 'moc_12_node1',
    mode: 'Memory of Chaos',
    stageName: 'Memory of Chaos 12 - Stage 1 (Hoolay)',
    stageNumber: 12,
    maxCycles: 10,
    targetScore: undefined,
    recommendedElements: ['Fire', 'Wind', 'Physical', 'Imaginary'],
    turbulence: {
      name: 'Turbulence: Unstable Reality',
      description: 'At cycle start, apply 4 stacks of Memory Imprint to all allies. When an ally consumes SP or casts Ultimate, gain +2 stacks. At cycle end, deal heavy True DMG to all enemies based on total stacks.',
      effectType: 'cycle_end_blast',
      stackLimit: 10,
      bonusMultiplier: 1.5
    },
    waves: [
      {
        waveIndex: 1,
        name: 'Wave 1: Senior Staff Leader & Fortune Trotter',
        enemies: [
          {
            id: 'trotter_1',
            name: 'Fortune Trotter',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/8001010.png',
            isBoss: false,
            hp: 420000,
            currentHp: 420000,
            speed: 132,
            toughness: 60,
            currentToughness: 60,
            weaknesses: ['Physical', 'Fire', 'Wind'],
            resistances: { Physical: 0.10, Fire: 0.10, Ice: 0.20, Lightning: 0.20, Wind: 0.10, Quantum: 0.20, Imaginary: 0.20 },
            def: 1100,
            isBroken: false,
            brokenDelayAV: 0
          },
          {
            id: 'senior_staff_1',
            name: 'Senior Staff: Team Leader',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/8013010.png',
            isBoss: false,
            hp: 980000,
            currentHp: 980000,
            speed: 148,
            toughness: 120,
            currentToughness: 120,
            weaknesses: ['Fire', 'Wind', 'Imaginary'],
            resistances: { Physical: 0.20, Fire: 0.0, Ice: 0.20, Lightning: 0.20, Wind: 0.0, Quantum: 0.20, Imaginary: 0.0 },
            def: 1150,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      },
      {
        waveIndex: 2,
        name: 'Wave 2: Hoolay, Borisin Warmaster (Boss)',
        enemies: [
          {
            id: 'hoolay_boss',
            name: 'Hoolay, Borisin Warmaster',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/3024010.png',
            isBoss: true,
            hp: 3400000,
            currentHp: 3400000,
            speed: 158,
            toughness: 180,
            currentToughness: 180,
            weaknesses: ['Fire', 'Wind', 'Physical'],
            resistances: { Physical: 0.0, Fire: 0.0, Ice: 0.20, Lightning: 0.20, Wind: 0.0, Quantum: 0.20, Imaginary: 0.20 },
            def: 1250,
            isBroken: false,
            brokenDelayAV: 0
          },
          {
            id: 'borisin_minion_1',
            name: 'Sableclaw Pack Wolf',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/3024020.png',
            isBoss: false,
            hp: 480000,
            currentHp: 480000,
            speed: 144,
            toughness: 90,
            currentToughness: 90,
            weaknesses: ['Fire', 'Wind'],
            resistances: { Physical: 0.20, Fire: 0.0, Ice: 0.20, Lightning: 0.20, Wind: 0.0, Quantum: 0.20, Imaginary: 0.20 },
            def: 1100,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      }
    ]
  },
  {
    id: 'moc_12_node2',
    mode: 'Memory of Chaos',
    stageName: 'Memory of Chaos 12 - Stage 2 (Aventurine)',
    stageNumber: 12,
    maxCycles: 10,
    targetScore: undefined,
    recommendedElements: ['Lightning', 'Quantum', 'Physical'],
    turbulence: {
      name: 'Turbulence: Shattered Memory',
      description: 'When an enemy is inflicted with a debuff, increase team CRIT Rate by 5% and CRIT DMG by 15% (stacks up to 4 times). At 4 stacks, Ultimate attacks unleash 1 extra blast.',
      effectType: 'break_dmg_boost',
      stackLimit: 4,
      bonusMultiplier: 1.6
    },
    waves: [
      {
        waveIndex: 1,
        name: 'Wave 1: Automaton Direwolf',
        enemies: [
          {
            id: 'direwolf_1',
            name: 'Automaton Direwolf',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/2003010.png',
            isBoss: false,
            hp: 1100000,
            currentHp: 1100000,
            speed: 152,
            toughness: 140,
            currentToughness: 140,
            weaknesses: ['Lightning', 'Ice', 'Imaginary'],
            resistances: { Physical: 0.20, Fire: 0.20, Ice: 0.0, Lightning: 0.0, Wind: 0.20, Quantum: 0.20, Imaginary: 0.0 },
            def: 1180,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      },
      {
        waveIndex: 2,
        name: 'Wave 2: Aventurine of Stratagems (Boss)',
        enemies: [
          {
            id: 'aventurine_boss',
            name: 'Aventurine of Stratagems',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/3013010.png',
            isBoss: true,
            hp: 3900000,
            currentHp: 3900000,
            speed: 162,
            toughness: 180,
            currentToughness: 180,
            weaknesses: ['Lightning', 'Quantum', 'Physical'],
            resistances: { Physical: 0.0, Fire: 0.20, Ice: 0.20, Lightning: 0.0, Wind: 0.20, Quantum: 0.0, Imaginary: 0.40 },
            def: 1280,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      }
    ]
  },
  {
    id: 'pf_4_node1',
    mode: 'Pure Fiction',
    stageName: 'Pure Fiction Stage 4 - Words of Wisdom',
    stageNumber: 4,
    maxCycles: 4,
    targetScore: 40000,
    recommendedElements: ['Ice', 'Lightning', 'Wind', 'Quantum'],
    turbulence: {
      name: 'Whimsicality: Words of Wisdom',
      description: 'Whenever an ally uses Ultimate, accumulated points multiplier increases by 30%. On enemy defeat, trigger Shatter effect dealing 40,000 AoE True DMG.',
      effectType: 'ult_stack_nuke',
      bonusMultiplier: 2.0
    },
    waves: [
      {
        waveIndex: 1,
        name: 'Wave 1: Swarm & Mara-Struck Horde',
        enemies: [
          { id: 'pf_m1', name: 'Gilded Minion A', icon: '', isBoss: false, hp: 120000, currentHp: 120000, speed: 120, toughness: 30, currentToughness: 30, weaknesses: ['Ice', 'Lightning'], resistances: { Physical: 0, Fire: 0, Ice: 0, Lightning: 0, Wind: 0, Quantum: 0, Imaginary: 0 }, def: 900, isBroken: false, brokenDelayAV: 0 },
          { id: 'pf_m2', name: 'Gilded Minion B', icon: '', isBoss: false, hp: 120000, currentHp: 120000, speed: 120, toughness: 30, currentToughness: 30, weaknesses: ['Wind', 'Quantum'], resistances: { Physical: 0, Fire: 0, Ice: 0, Lightning: 0, Wind: 0, Quantum: 0, Imaginary: 0 }, def: 900, isBroken: false, brokenDelayAV: 0 },
          { id: 'pf_m4', name: 'Elite Sanctus Medicus', icon: '', isBoss: true, hp: 850000, currentHp: 850000, speed: 145, toughness: 100, currentToughness: 100, weaknesses: ['Ice', 'Wind'], resistances: { Physical: 0, Fire: 0, Ice: 0, Lightning: 0, Wind: 0, Quantum: 0, Imaginary: 0 }, def: 1050, isBroken: false, brokenDelayAV: 0 }
        ]
      }
    ]
  },
  {
    id: 'as_4_node1',
    mode: 'Apocalyptic Shadow',
    stageName: 'Apocalyptic Shadow 4 - Cocolia Boss',
    stageNumber: 4,
    maxCycles: 10,
    targetScore: 3600,
    recommendedElements: ['Fire', 'Lightning', 'Quantum'],
    turbulence: {
      name: 'Finality\'s Story: Eclipse of the Sun',
      description: 'When the Boss enters Weakness Broken state, grant all allies 100% Action Advance and increase Break DMG taken by 250%.',
      effectType: 'break_dmg_boost',
      bonusMultiplier: 3.5
    },
    waves: [
      {
        waveIndex: 1,
        name: 'Phase 1 & 2: Cocolia, Mother of Deception',
        enemies: [
          {
            id: 'as_cocolia',
            name: 'Cocolia, Mother of Deception',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/1003010.png',
            isBoss: true,
            hp: 12000000,
            currentHp: 12000000,
            speed: 170,
            toughness: 240,
            currentToughness: 240,
            weaknesses: ['Fire', 'Lightning', 'Quantum'],
            resistances: { Physical: 0.20, Fire: 0.0, Ice: 0.60, Lightning: 0.0, Wind: 0.20, Quantum: 0.0, Imaginary: 0.20 },
            def: 1300,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      }
    ]
  },
  {
    id: 'aa_stage1',
    mode: 'Anomaly Arbitration',
    stageName: 'Anomaly Arbitration - Sovereign Domain',
    stageNumber: 1,
    maxCycles: 10,
    targetScore: 50000,
    recommendedElements: ['Fire', 'Imaginary', 'Physical'],
    turbulence: {
      name: 'Arbitration Decree: Sovereign Resonance',
      description: 'Triggers Assist Skill "Aether Sovereign Strike" every 100 AV dealing 1,500,000 Super Break DMG and advancing all allies by 50%.',
      effectType: 'assist_skill_burst',
      bonusMultiplier: 4.0
    },
    waves: [
      {
        waveIndex: 1,
        name: 'Arbitration Sovereign Dominicus',
        enemies: [
          {
            id: 'aa_sovereign',
            name: 'Aether Sovereign Dominicus',
            icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/monster/3014010.png',
            isBoss: true,
            hp: 24000000,
            currentHp: 24000000,
            speed: 185,
            toughness: 300,
            currentToughness: 300,
            weaknesses: ['Fire', 'Imaginary', 'Physical', 'Wind'],
            resistances: { Physical: 0.0, Fire: 0.0, Ice: 0.30, Lightning: 0.30, Wind: 0.0, Quantum: 0.30, Imaginary: 0.0 },
            def: 1400,
            isBroken: false,
            brokenDelayAV: 0
          }
        ]
      }
    ]
  }
];
