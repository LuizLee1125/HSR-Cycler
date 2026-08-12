export type ElementType = 'Physical' | 'Fire' | 'Ice' | 'Lightning' | 'Wind' | 'Quantum' | 'Imaginary';

export type PathType =
  | 'Destruction'
  | 'The Hunt'
  | 'Erudition'
  | 'Harmony'
  | 'Nihility'
  | 'Preservation'
  | 'Abundance'
  | 'Remembrance'
  | 'Elation';

export type EndgameMode = 'Memory of Chaos' | 'Pure Fiction' | 'Apocalyptic Shadow' | 'Anomaly Arbitration';

export type ActionType = 'Basic Attack' | 'Skill' | 'Ultimate' | 'Assist Skill' | 'Technique' | 'Follow-Up Attack';

/** nanoka rank ids, ascending in threat. */
export type EnemyRank = 'Minion' | 'MinionLv2' | 'Elite' | 'LittleBoss' | 'Boss';

export interface CharacterStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  breakEffect: number;
  energyRegen: number;
  effectHitRate: number;
  dmgBonus: number;
}

/* ------------------------------------------------------------------ *
 * Characters — generated from prydwen.gg + StarRailRes
 * ------------------------------------------------------------------ */

/**
 * Prydwen publishes either a relative-DPS percentage (where it has damage
 * calculations) or a plain priority rank. Exactly one of the two is set.
 */
export interface Recommendation {
  name: string;
  relativeDps: number | null;
  priority: number | null;
}

export interface RelicRecommendation extends Recommendation {
  pieces: 2 | 4 | null;
}

export interface LightConeRecommendation extends Recommendation {
  superimposition: number | null;
}

export interface MainStatPriority {
  body?: string;
  feet?: string;
  sphere?: string;
  rope?: string;
}

export interface CharacterBuild {
  relicSets: RelicRecommendation[];
  planarSets: RelicRecommendation[];
  lightCones: LightConeRecommendation[];
  mainStats: MainStatPriority;
  substats: string | null;
  substatNote: string | null;
  statTargets: string[];
  /** `statTargets` parsed into numbers, e.g. `ATK: 2900-3200+` -> `{ atk: 2900 }`. */
  statBaseline: Partial<CharacterStats>;
}

export interface TeamMember {
  slug: string;
  name: string;
}

/** A Memory of Chaos team with Prydwen's player-run telemetry. */
export interface TeamRecommendation {
  rank: number | null;
  appearanceRate: number | null;
  averageCycles: number | null;
  averageCyclesE1: number | null;
  members: TeamMember[];
}

export interface CharacterMeta {
  usage: number | null;
  mocAverageCycles: number | null;
  pureFictionScore: number | null;
  apocalypticShadowScore: number | null;
}

export interface HSRCharacter {
  /** Prydwen slug, e.g. `dan-heng-permansor-terrae`. */
  id: string;
  /** In-game avatar id, e.g. `1414`. */
  gameId: string;
  name: string;
  element: ElementType;
  path: PathType;
  rarity: 4 | 5;
  maxEnergy: number | null;
  icon: string;
  preview: string;
  splash: string;
  baseStats: CharacterStats;
  build: CharacterBuild;
  teams: TeamRecommendation[];
  meta: CharacterMeta;
  guideUpdated: string | null;
}

export interface CharacterDatabase {
  sources: string[];
  generatedAt: string;
  characters: HSRCharacter[];
}

/* ------------------------------------------------------------------ *
 * Endgame — generated from nanoka.cc
 * ------------------------------------------------------------------ */

export interface EnemyUnit {
  monsterId: number;
  templateId: number;
  name: string;
  rank: EnemyRank;
  isBoss: boolean;
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** Toughness on the in-game scale, where a single-target Basic ATK removes 30. */
  toughness: number;
  /** Multi-phase bosses refill HP between phases. */
  phases: number;
  phasesEstimated: boolean;
  weaknesses: ElementType[];
  /** Effect RES as a percentage, e.g. `30` for 30%. */
  effectRes: number;
  icon: string;
  /** How many copies of this enemy the wave spawns. */
  count: number;
}

export interface EnemyWave {
  waveIndex: number;
  enemies: EnemyUnit[];
  /** Endless waves only: how many enemies stand on the field at once. */
  maxOnField?: number | null;
  /** Endless waves only: the wave's own HP scalar. */
  hpMultiplier?: number;
}

/** One half of a stage — Prydwen and the game both call these "nodes". */
export interface StageNode {
  index: number;
  level: number | null;
  recommendedElements: ElementType[];
  waves: EnemyWave[];
  endlessWaves: EnemyWave[];
}

export interface StageModifier {
  name: string;
  description: string;
}

export interface EndgameStage {
  id: string;
  stageId: number;
  stageNumber: number;
  name: string;
  /** Memory of Chaos turbulence; other modes use `modifiers`. */
  turbulence: StageModifier | null;
  modifiers: StageModifier[];
  /** Cycle budget where the mode defines one. */
  cycleLimit: number | null;
  starConditions: string[];
  nodes: StageNode[];
}

export interface EndgameSeason {
  mode: EndgameMode;
  seasonId: number;
  seasonName: string;
  stages: EndgameStage[];
}

export interface EndgameDatabase {
  source: string;
  /** nanoka data build, e.g. `4.4.54`. */
  dataVersion: string;
  /** Live game version, e.g. `4.4`. */
  gameVersion: string;
  generatedAt: string;
  modes: EndgameSeason[];
}

/* ------------------------------------------------------------------ *
 * Simulation
 * ------------------------------------------------------------------ */

export interface TeamMemberConfig {
  slot: number;
  character: HSRCharacter;
  stats: CharacterStats;
  eidolon: number;
  superimposition: number;
  lightCone: string;
  relicSets: string[];
  planarSet: string;
}

/** Mutable per-run copy of an `EnemyUnit`. */
export interface CombatEnemy extends EnemyUnit {
  instanceId: string;
  currentHp: number;
  maxHp: number;
  currentToughness: number;
  isBroken: boolean;
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
  brokeWeakness?: boolean;
}

/**
 * The output is a *rotation* plan. Action Value order, Skill Point economy and
 * weakness-break timing are computed from real stage data and are accurate.
 * Damage is a kit-agnostic estimate: it has no access to per-character
 * multipliers, buffs, follow-up attacks or memosprites, so it reads low and is
 * only useful for comparing builds against each other.
 */
export interface SimulationResult {
  mode: EndgameMode;
  stageName: string;
  nodeIndex: number;
  cyclesUsed: number;
  cycleLimit: number;
  /** Kit-agnostic lower bound — see the note above. */
  estimatedDamage: number;
  /** How many enemies in the node this team can break at all. */
  breakableEnemies: number;
  totalEnemies: number;
  /** Enemies actually broken during the simulated rotation. */
  breaksAchieved: number;
  /** Fraction of turns spent on Basic ATK purely to refill Skill Points. */
  spStarvedTurns: number;
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
