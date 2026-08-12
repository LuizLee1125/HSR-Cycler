export type ElementType = 'Physical' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Quantum' | 'Imaginary';

export type PathType = 'Destruction' | 'The Hunt' | 'Erudition' | 'Harmony' | 'Nihility' | 'Preservation' | 'Abundance';

export type EndgameMode = 'Memory of Chaos' | 'Pure Fiction' | 'Apocalyptic Shadow' | 'Anomaly Arbitration';

export type ActionType = 'Basic Attack' | 'Skill' | 'Ultimate' | 'Assist Skill' | 'Technique' | 'Follow-Up Attack';

export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number; // percentage e.g. 70
  critDmg: number; // percentage e.g. 160
  breakEffect: number; // percentage e.g. 180
  energyRegen: number; // percentage e.g. 119.4
  effectHitRate: number; // percentage e.g. 40
  dmgBonus: number; // percentage e.g. 48.8
}

export interface CharacterTraceBonus {
  stat: keyof CharacterStats;
  value: number;
}

export interface RelicSetBonus {
  name: string;
  pieces: 2 | 4;
  description: string;
  statBoosts: Partial<CharacterStats>;
}

export interface PrydwenBuildInfo {
  bestRelicSets: string[];
  bestPlanarSets: string[];
  mainStats: {
    body: string;
    feet: string;
    sphere: string;
    rope: string;
  };
  substatPriority: string[];
  bestLightCones: string[];
  bestTeams: {
    name: string;
    role: string;
    teammates: string[];
    description: string;
  }[];
}

export interface HSRCharacter {
  id: string;
  name: string;
  element: ElementType;
  path: PathType;
  rarity: 4 | 5;
  icon: string;
  splash: string;
  baseStats: CharacterStats;
  traceBonuses: CharacterTraceBonus[];
  maxEnergy: number;
  skillSpCost: number; // usually +1 for basic, -1 for skill
  prydwenInfo: PrydwenBuildInfo;
  defaultLightCone: string;
  defaultRelics: string[];
  skillDescription: string;
  ultDescription: string;
  talentDescription: string;
}

export interface TeamMemberConfig {
  slot: number; // 0, 1, 2, 3
  character: HSRCharacter;
  stats: CharacterStats;
  eidolon: number; // 0..6
  superimposition: number; // 1..5
  lightCone: string;
  relicSets: string[];
  planarSet: string;
}

export interface EnemyUnit {
  id: string;
  name: string;
  icon: string;
  isBoss: boolean;
  hp: number;
  currentHp: number;
  speed: number;
  toughness: number; // max toughness
  currentToughness: number;
  weaknesses: ElementType[];
  resistances: Record<ElementType, number>; // e.g. 0.20 = 20% RES
  def: number;
  isBroken: boolean;
  brokenDelayAV: number;
}

export interface EnemyWave {
  waveIndex: number;
  name: string;
  enemies: EnemyUnit[];
}

export interface StageTurbulence {
  name: string;
  description: string;
  effectType: 'cycle_end_blast' | 'break_dmg_boost' | 'ult_stack_nuke' | 'assist_skill_burst';
  stackLimit?: number;
  bonusMultiplier?: number;
}

export interface EndgameStage {
  id: string;
  mode: EndgameMode;
  stageName: string;
  stageNumber: number;
  maxCycles: number; // e.g. 10 for MoC 3-star, 4 for PF
  targetScore?: number; // e.g. 40000 for PF, 3600 for AS
  turbulence: StageTurbulence;
  waves: EnemyWave[];
  recommendedElements: ElementType[];
}

export interface TurnActionInstruction {
  turnNumber: number;
  avTimestamp: number;
  cycleNumber: number;
  characterName: string;
  characterIcon: string;
  actionType: ActionType;
  spChange: number;
  currentSpAfter: number;
  targetName: string;
  estimatedDamage: number;
  toughnessDamage: number;
  recommendationReason: string;
  isUltQueued?: boolean;
  isAssistSkillAvailable?: boolean;
}

export interface SimulationResult {
  cleared: boolean;
  mode: EndgameMode;
  cyclesUsed: number;
  scoreAchieved: number;
  totalDamageDealt: number;
  winProbability: number;
  instructions: TurnActionInstruction[];
  spHistory: { av: number; sp: number }[];
  summaryTips: string[];
}

export interface LiveCaptureState {
  isActive: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  detectedAV: number | null;
  detectedTurnCharacter: string | null;
  detectedSP: number | null;
  recommendedAction: ActionType;
  recommendedTarget: string;
  actionRationale: string;
  assistSkillStatus: string;
  fps: number;
}

export interface OcrBuildParseResult {
  success: boolean;
  characterName?: string;
  level?: number;
  stats?: Partial<CharacterStats>;
  detectedRelicSets?: string[];
  lightCone?: string;
  rawText?: string;
}
