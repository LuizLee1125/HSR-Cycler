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

/* ------------------------------------------------------------------ *
 * Abilities — generated from StarRailRes' copy of the game skill table
 * ------------------------------------------------------------------ */

/** The rows a build card shows levels for. */
export type SkillSlot =
  | 'basic'
  | 'skill'
  | 'ultimate'
  | 'talent'
  | 'technique'
  | 'memospriteSkill'
  | 'memospriteTalent'
  | 'elationSkill'
  | 'assist';

export interface SkillScaling {
  /** Index into `CharacterSkill.params[level - 1]`. */
  paramIndex: number;
  stat: 'atk' | 'hp' | 'def';
  spread: 'single' | 'adjacent' | 'all';
}

/** What an ability grants rather than what it deals. */
export interface SkillBuff {
  key: 'atk' | 'dmgBonus' | 'critRate' | 'critDmg' | 'breakEffect' | 'resPen' | 'defIgnore' | 'vulnerability' | 'spdPercent';
  paramIndex: number;
  /** `team` where the description says so, `self` otherwise. */
  target: 'team' | 'self';
}

export interface CharacterSkill {
  id: string;
  name: string;
  slot: SkillSlot;
  /** Raw StarRailRes type, e.g. `BPSkill`. */
  type: string;
  effect: string;
  maxLevel: number;
  /** `params[level - 1]` — the ability's numbers at that level. */
  params: number[][];
  scalings: SkillScaling[];
  allyBuffs: SkillBuff[];
  spread: 'single' | 'blast' | 'aoe';
  /** In-game toughness removed from the main target. Derived, not sourced. */
  toughness: number;
  toughnessDerived: boolean;
  spCost: number;
  energy: number;
}

export type CharacterSkills = Partial<Record<SkillSlot, CharacterSkill>>;

/** Levels read off a build card. Missing entries fall back to the trace ceiling. */
export type SkillLevels = Partial<Record<SkillSlot, number>>;

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
  /** Per-level ability multipliers, keyed by the slot a build card labels. */
  skills: CharacterSkills;
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
  /**
   * Starward is the bonus difficulty layered on the hardest normal stage: a
   * third node, harder scaling and a raised star threshold.
   */
  starward: boolean;
  /** Memory of Chaos turbulence; other modes use `modifiers`. */
  turbulence: StageModifier | null;
  modifiers: StageModifier[];
  /** Cycle budget where the mode defines one. */
  cycleLimit: number | null;
  starConditions: string[];
  /** Starward's extra clear condition, on top of the three stars. */
  specialCondition: string | null;
  nodes: StageNode[];
}

/**
 * A buff the player picks before entering. Only Apocalyptic Shadow and Anomaly
 * Arbitration offer one; the other two modes apply their season effects
 * unconditionally, so their pool is empty and no picker is shown.
 */
export interface BuffEffects {
  /** All values are percentages, e.g. `30` for +30%. */
  dmgBonus?: number;
  resPen?: number;
  defIgnore?: number;
  critDmg?: number;
  vulnerability?: number;
  breakEfficiency?: number;
  spdPercent?: number;
}

export interface StageBuff {
  id: string;
  name: string;
  description: string;
  /** The part of the description the damage pipeline can actually apply. */
  effects: BuffEffects;
}

export interface EndgameSeason {
  mode: EndgameMode;
  seasonId: number;
  seasonName: string;
  /**
   * The game version this rotation shipped in. Null for Pure Fiction and
   * Apocalyptic Shadow, which publish no version map.
   */
  gameVersion: string | null;
  /** Empty when the mode gives the player no choice of buff. */
  buffChoices: StageBuff[];
  stages: EndgameStage[];
}

/** A mode and its released rotations, newest first. */
export interface EndgameModeEntry {
  mode: EndgameMode;
  seasons: EndgameSeason[];
}

export interface EndgameDatabase {
  source: string;
  /** nanoka data build, e.g. `4.4.54`. */
  dataVersion: string;
  /** Live game version, e.g. `4.4`. */
  gameVersion: string;
  generatedAt: string;
  modes: EndgameModeEntry[];
}

/* ------------------------------------------------------------------ *
 * Gear — generated from StarRailRes
 * ------------------------------------------------------------------ */

export type GearEffectKey =
  | 'atk'
  | 'hp'
  | 'def'
  | 'critRate'
  | 'critDmg'
  | 'breakEffect'
  | 'dmgBonus'
  | 'resPen'
  | 'defIgnore'
  | 'vulnerability'
  | 'spdPercent'
  | 'effectHitRate'
  | 'energyRegen';

/** An always-on bonus, already reflected in a build card's printed stats. */
export interface StaticEffect {
  key: GearEffectKey;
  /** Percentage, e.g. `36` for +36% CRIT DMG. */
  value: number;
}

/** A conditional bonus the card cannot show, so the predictor applies it. */
export interface ConditionalEffect {
  key: GearEffectKey;
  /** Light cones read the magnitude from `params[superimposition - 1]`. */
  paramIndex?: number;
  /** Relic sets state it literally. */
  value?: number;
}

export interface LightCone {
  id: string;
  name: string;
  rarity: number;
  path: string;
  skillName: string;
  /** `params[superimposition - 1]`. */
  params: number[][];
  /** Indexed by superimposition. Never re-applied — the card includes it. */
  staticEffects: StaticEffect[][];
  conditionalEffects: ConditionalEffect[];
}

export interface RelicSetBonus {
  pieces: 2 | 4;
  description: string;
  staticEffects: StaticEffect[];
  conditionalEffects: ConditionalEffect[];
}

export interface RelicSet {
  id: string;
  name: string;
  /** Planar ornaments publish a 2-piece bonus only. */
  planar: boolean;
  bonuses: RelicSetBonus[];
}

export interface GearDatabase {
  source: string;
  generatedAt: string;
  lightCones: LightCone[];
  relicSets: RelicSet[];
}

/* ------------------------------------------------------------------ *
 * Simulation
 * ------------------------------------------------------------------ */

/**
 * A slot the user has filled. There is no such thing as a member without an
 * imported build: `stats` and `skillLevels` always come from a build card the
 * user supplied, never from an assumed or preset line.
 */
/** A relic set and how many pieces of it are worn, which picks the bonus tier. */
export interface EquippedSet {
  name: string;
  pieces: number;
}

export interface EquippedGear {
  lightConeId: string | null;
  lightCone: string;
  superimposition: number;
  relicSets: EquippedSet[];
  /** Planar ornament — always a 2-piece bonus. */
  planarSet: string;
}

export interface TeamMemberConfig {
  slot: number;
  character: HSRCharacter;
  stats: CharacterStats;
  skillLevels: SkillLevels;
  level: number;
  eidolon: number;
  gear: EquippedGear;
  /** ISO timestamp of the import that produced this build. */
  importedAt: string;
}

/** A slot that has a character chosen but no build card imported yet. */
export interface PendingSlot {
  slot: number;
  character: HSRCharacter;
}

export type TeamSlot = TeamMemberConfig | PendingSlot | null;

/** Mutable per-run copy of an `EnemyUnit`. */
export interface CombatEnemy extends EnemyUnit {
  instanceId: string;
  currentHp: number;
  maxHp: number;
  currentToughness: number;
  isBroken: boolean;
}

/** Who is acting: an imported team member, or one of the stage's enemies. */
export type ActorSide = 'ally' | 'enemy';

export interface TurnActionInstruction {
  turnNumber: number;
  avTimestamp: number;
  cycleNumber: number;
  side: ActorSide;
  characterName: string;
  characterIcon: string;
  actionType: ActionType;
  /** The ability the multiplier came from, e.g. `Octobolt Flash`. */
  abilityName: string;
  spChange: number;
  currentSpAfter: number;
  targetName: string;
  /** Zero for buffs, heals, shields and enemy turns. */
  estimatedDamage: number;
  toughnessDamage: number;
  recommendationReason: string;
  isUltQueued?: boolean;
  brokeWeakness?: boolean;
}

/** One Monte Carlo outcome, kept so the UI can show the spread of results. */
export interface OutcomeBranch {
  label: string;
  cycles: number;
  cleared: boolean;
  /** Enemy HP still standing when the branch ended, as a percentage. */
  hpRemainingPercent: number;
  note: string;
}

/**
 * Turn order, Action Value and Skill Point economy come from the stage's real
 * enemy data and the team's imported builds. Damage uses each character's own
 * per-level ability multipliers, so it tracks the real kit — but it still does
 * not model every conditional in a kit, so treat totals as an estimate.
 *
 * Cycles are reported as a range because enemy actions are rolled: the same
 * team can clear in different cycle counts depending on who gets targeted and
 * delayed.
 */
export interface SimulationResult {
  mode: EndgameMode;
  stageName: string;
  nodeIndex: number;
  /** Fewest cycles across the simulated branches. */
  bestCaseCycles: number;
  /** Most cycles across the simulated branches. */
  worstCaseCycles: number;
  medianCycles: number;
  /** Null in the score-based modes, which have no stated cycle cap. */
  cycleLimit: number | null;
  /** Share of branches that killed everything inside the cycle budget. */
  clearProbability: number;
  estimatedDamage: number;
  branches: OutcomeBranch[];
  buff: StageBuff | null;
  /** The median branch, expanded turn by turn. */
  instructions: TurnActionInstruction[];
  spHistory: { av: number; sp: number }[];
  summaryTips: string[];
}

export interface LiveReading {
  /** Action Value read off the turn-order rail. */
  av: number | null;
  turnCharacter: string | null;
  sp: number | null;
  /** Characters whose Ultimate portrait is lit. */
  ultsReady: string[];
  confidence: number;
}

export interface LiveCaptureState {
  isActive: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
  reading: LiveReading;
  recommendedAction: ActionType;
  recommendedCharacter: string;
  recommendedTarget: string;
  actionRationale: string;
  lastReadAt: number | null;
  error: string | null;
}

/* ------------------------------------------------------------------ *
 * Build card import
 * ------------------------------------------------------------------ */

export interface OcrBuildParseResult {
  success: boolean;
  /** Roster id when the card's character was recognised. */
  characterId: string | null;
  characterName: string | null;
  level: number | null;
  eidolon: number | null;
  stats: Partial<CharacterStats>;
  skillLevels: SkillLevels;
  relicSets: EquippedSet[];
  planarSet: string | null;
  lightConeId: string | null;
  lightCone: string | null;
  superimposition: number | null;
  /** 0–1, from how many of the expected fields were readable. */
  confidence: number;
  warnings: string[];
  rawText: string;
}
