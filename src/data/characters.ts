import type { HSRCharacter, RelicSetBonus } from '../types/hsr';

export const RELIC_SETS_DATABASE: Record<string, RelicSetBonus> = {
  'Iron Cavalry against the Scourge': {
    name: 'Iron Cavalry against the Scourge',
    pieces: 4,
    description: 'Increases Break Effect by 16%. If Break Effect >= 150%, Break DMG ignores 10% DEF. If Break Effect >= 250%, Super Break DMG ignores an additional 15% DEF.',
    statBoosts: { breakEffect: 16 }
  },
  'Pioneer Diver of Dead Waters': {
    name: 'Pioneer Diver of Dead Waters',
    pieces: 4,
    description: 'Increases DMG dealt to enemies with debuffs by 12%. CRIT Rate increases by 4% and CRIT DMG increases by 24% when inflicting debuffs.',
    statBoosts: { critRate: 4, critDmg: 24, dmgBonus: 12 }
  },
  'The Wind-Soaring Valorous': {
    name: 'The Wind-Soaring Valorous',
    pieces: 4,
    description: 'Increases ATK by 12%. Increases CRIT Rate by 6%. After casting Ultimate, increases Follow-Up Attack DMG by 36% for 1 turn.',
    statBoosts: { atk: 12, critRate: 6, dmgBonus: 36 }
  },
  'Messenger Traversing Hackerspace': {
    name: 'Messenger Traversing Hackerspace',
    pieces: 4,
    description: 'Increases SPD by 6%. When Ultimate is used on an ally, increases SPD for all allies by 12% for 1 turn.',
    statBoosts: { spd: 6 }
  },
  'Scholar Lost in Erudition': {
    name: 'Scholar Lost in Erudition',
    pieces: 4,
    description: 'Increases CRIT Rate by 8%. Skill and Ultimate DMG increased by 20%. After casting Ultimate, next Skill deals 25% extra DMG.',
    statBoosts: { critRate: 8, dmgBonus: 20 }
  },
  'Hero of Triumphant Song': {
    name: 'Hero of Triumphant Song',
    pieces: 4,
    description: 'Increases ATK by 12%. When a memo-sprite or summon attacks, increases team CRIT DMG by 24% for 2 turns.',
    statBoosts: { atk: 12, critDmg: 24 }
  },
  'Forge of the Kalpagni Lantern': {
    name: 'Forge of the Kalpagni Lantern',
    pieces: 2,
    description: 'Increases SPD by 6%. When hitting Fire-weak enemies, Break Effect increases by 40% for 1 turn.',
    statBoosts: { spd: 6, breakEffect: 40 }
  },
  'Duran, Dynasty of Running Wolves': {
    name: 'Duran, Dynasty of Running Wolves',
    pieces: 2,
    description: 'When allies cast Follow-Up Attacks, gain 1 stack of Merit (max 5). Each stack increases Follow-Up DMG by 5%. At 5 stacks, CRIT DMG +25%.',
    statBoosts: { dmgBonus: 25, critDmg: 25 }
  },
  'Lushaka the Sunken Seas': {
    name: 'Lushaka the Sunken Seas',
    pieces: 2,
    description: 'Increases Energy Regeneration Rate by 5%. Increases ATK by 12% for the first character in team lineup.',
    statBoosts: { energyRegen: 5, atk: 12 }
  },
  'Broken Keel': {
    name: 'Broken Keel',
    pieces: 2,
    description: 'Increases Effect RES by 10%. When Effect RES is 30% or higher, all allies CRIT DMG increases by 10%.',
    statBoosts: { critDmg: 10 }
  }
};

export const CHARACTERS_DATABASE: HSRCharacter[] = [
  {
    id: 'firefly',
    name: 'Firefly',
    element: 'Fire',
    path: 'Destruction',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1310.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1310.png',
    baseStats: { hp: 1358, atk: 523, def: 776, spd: 104, critRate: 5.0, critDmg: 50.0, breakEffect: 180.0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'breakEffect', value: 37.3 }, { stat: 'spd', value: 5.0 }, { stat: 'effectHitRate', value: 10.0 }],
    maxEnergy: 240,
    skillSpCost: -1,
    skillDescription: 'Consumes 40% Max HP to restore 60% Max Energy and advance action by 25%. Enhanced state: Deals heavy Fire DMG, implants Fire Weakness for 2 turns.',
    ultDescription: 'Enters "Complete Combustion" state: Action advanced by 100%, gains 60 SPD, Break Efficiency +50%, Super Break DMG enabled.',
    talentDescription: 'Converts ATK exceeding 1800 into Break Effect (0.8% BE per 10 ATK). Takes less DMG when HP is low.',
    defaultLightCone: 'Where Dreams Remain (S1)',
    defaultRelics: ['Iron Cavalry against the Scourge', 'Forge of the Kalpagni Lantern'],
    prydwenInfo: {
      bestRelicSets: ['Iron Cavalry against the Scourge (4pc)'],
      bestPlanarSets: ['Forge of the Kalpagni Lantern (2pc)', 'Talia: Kingdom of Banditry (2pc)'],
      mainStats: { body: 'ATK%', feet: 'SPD', sphere: 'ATK%', rope: 'Break Effect%' },
      substatPriority: ['Break Effect (target 360%)', 'SPD (target 150+)', 'ATK%', 'Effect RES'],
      bestLightCones: ['Where Dreams Remain', 'Fall of an Aeon (S5)', 'Indelible Promise (S5)'],
      bestTeams: [
        { name: 'Super Break Core (BiS)', role: 'Main DPS', teammates: ['Harmony MC', 'Ruan Mei', 'Gallagher'], description: 'Prydwen S+ Tier #1 team. Inflicts Fire weakness implant & unleashes 250k+ Super Break hits.' },
        { name: 'Lingsha Premium Break', role: 'Main DPS', teammates: ['Harmony MC', 'Ruan Mei', 'Lingsha'], description: 'High sustain AoE Break team with rapid Fire toughness reduction.' }
      ]
    }
  },
  {
    id: 'acheron',
    name: 'Acheron',
    element: 'Lightning',
    path: 'Nihility',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1308.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1308.png',
    baseStats: { hp: 1125, atk: 698, def: 436, spd: 101, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'critDmg', value: 24.0 }, { stat: 'atk', value: 28.0 }, { stat: 'dmgBonus', value: 8.0 }],
    maxEnergy: 9,
    skillSpCost: -1,
    skillDescription: 'Deals Lightning DMG to target and adjacent enemies. Gains 1 point of Slashed Dream and applies Crimson Knot to target.',
    ultDescription: 'Unleashes 4-phase Ultimate ignoring Weakness Types, reducing all-type RES by 20%. Consumes 9 Slashed Dream points.',
    talentDescription: 'When any unit inflicts a debuff on enemies, Acheron gains 1 stack of Slashed Dream. Nihility teammates grant up to 160% DMG boost.',
    defaultLightCone: 'Along the Passing Shore (S1)',
    defaultRelics: ['Pioneer Diver of Dead Waters', 'Izumo Gensei and Takama Divine Realm'],
    prydwenInfo: {
      bestRelicSets: ['Pioneer Diver of Dead Waters (4pc)'],
      bestPlanarSets: ['Izumo Gensei and Takama Divine Realm (2pc)'],
      mainStats: { body: 'CRIT Rate / CRIT DMG', feet: 'ATK% or SPD', sphere: 'Lightning DMG% / ATK%', rope: 'ATK%' },
      substatPriority: ['CRIT Rate (target 70%+)', 'CRIT DMG (target 180%+)', 'ATK%', 'SPD'],
      bestLightCones: ['Along the Passing Shore', 'Good Night and Sleep Well (S5)', 'Boundless Choreo (S5)'],
      bestTeams: [
        { name: 'Jiaoqiu Double Nihility (BiS)', role: 'Main DPS', teammates: ['Jiaoqiu', 'Pela', 'Aventurine'], description: 'Prydwen S+ Tier setup with maximum Slashed Dream stacking frequency via Jiaoqiu aura.' },
        { name: 'Sparkle Action Advance Nuke', role: 'Main DPS', teammates: ['Jiaoqiu', 'Sparkle', 'Aventurine'], description: 'High CRIT DMG hyperspeed action advance setup for rapid Acheron turns.' }
      ]
    }
  },
  {
    id: 'feixiao',
    name: 'Feixiao',
    element: 'Wind',
    path: 'The Hunt',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1312.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1312.png',
    baseStats: { hp: 1047, atk: 679, def: 388, spd: 112, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'critRate', value: 12.0 }, { stat: 'atk', value: 28.0 }, { stat: 'spd', value: 5.0 }],
    maxEnergy: 12,
    skillSpCost: -1,
    skillDescription: 'Deals Wind DMG to single target and advances own action by 10%. Immediately launches Follow-up Attack.',
    ultDescription: 'Consumes 6 Flying Aureus points to launch up to 6 deadly single-target attacks, reducing toughness regardless of Weakness.',
    talentDescription: 'Gains 0.5 Flying Aureus for every 2 attacks launched by allies. Launches Follow-Up attack whenever ally hits an enemy.',
    defaultLightCone: 'I Venture Forth to Hunt (S1)',
    defaultRelics: ['The Wind-Soaring Valorous', 'Duran, Dynasty of Running Wolves'],
    prydwenInfo: {
      bestRelicSets: ['The Wind-Soaring Valorous (4pc)'],
      bestPlanarSets: ['Duran, Dynasty of Running Wolves (2pc)'],
      mainStats: { body: 'CRIT Rate', feet: 'SPD', sphere: 'Wind DMG%', rope: 'ATK%' },
      substatPriority: ['CRIT Rate (100% ideal)', 'CRIT DMG', 'SPD (134+)', 'ATK%'],
      bestLightCones: ['I Venture Forth to Hunt', 'Cruising in the Stellar Sea (S5)', 'Swordplay (S5)'],
      bestTeams: [
        { name: 'Follow-Up Premium (FART)', role: 'Main DPS', teammates: ['Robin', 'Topaz', 'Aventurine'], description: 'Prydwen S+ Tier #1 Follow-up Attack composition with max frequency Flying Aureus point generation.' },
        { name: 'March 7th (Hunt) F2P FUA', role: 'Main DPS', teammates: ['Robin', 'March 7th (Hunt)', 'Gallagher'], description: 'High synergy Master-Disciple setup for fast single-target boss breaks.' }
      ]
    }
  },
  {
    id: 'castorice',
    name: 'Castorice',
    element: 'Quantum',
    path: 'Erudition',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1315.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1315.png',
    baseStats: { hp: 1420, atk: 580, def: 510, spd: 105, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'critDmg', value: 24.0 }, { stat: 'hp', value: 18.0 }, { stat: 'spd', value: 5.0 }],
    maxEnergy: 140,
    skillSpCost: -1,
    skillDescription: 'Summons memo-sprite domain. Deals Quantum AoE DMG scaling with HP & Memory stacks.',
    ultDescription: 'Triggers Memory Convergence: All allies unleash follow-up attacks & deals massive Quantum True DMG.',
    talentDescription: 'Consumes ally HP on hit to convert into raw Quantum DMG multiplier and advance memo-sprite actions.',
    defaultLightCone: 'Oceanic Remembrance (S1)',
    defaultRelics: ['Hero of Triumphant Song', 'Duran'],
    prydwenInfo: {
      bestRelicSets: ['Hero of Triumphant Song (4pc)'],
      bestPlanarSets: ['Lushaka the Sunken Seas (2pc)', 'Broken Keel (2pc)'],
      mainStats: { body: 'CRIT DMG / HP%', feet: 'SPD', sphere: 'Quantum DMG% / HP%', rope: 'Energy Regeneration Rate' },
      substatPriority: ['HP%', 'CRIT DMG', 'CRIT Rate', 'SPD'],
      bestLightCones: ['Oceanic Remembrance', 'Before Dawn (S1)', 'Genius\'s Repose (S5)'],
      bestTeams: [
        { name: 'Memo-Sprite Summon Hyper', role: 'Main DPS', teammates: ['Sunday', 'Fugue', 'Aventurine'], description: 'Prydwen S+ Tier memo-sprite synergy team for high difficulty endgame content.' }
      ]
    }
  },
  {
    id: 'ruan_mei',
    name: 'Ruan Mei',
    element: 'Ice',
    path: 'Harmony',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1303.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1303.png',
    baseStats: { hp: 1086, atk: 659, def: 485, spd: 104, critRate: 5.0, critDmg: 50.0, breakEffect: 100.0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'breakEffect', value: 37.3 }, { stat: 'spd', value: 5.0 }, { stat: 'def', value: 22.5 }],
    maxEnergy: 130,
    skillSpCost: -1,
    skillDescription: 'Deploys Overtone field for 3 turns: Increases team DMG by 68% and Weakness Break Efficiency by 50%.',
    ultDescription: 'Deploys 2-turn field: Increases team All-Type RES PEN by 25%. Inflicts Thanatoplum Rebloom on broken enemies to delay action.',
    talentDescription: 'Increases team SPD by 10% (excluding Ruan Mei). Deals Ice Break DMG when team breaks enemy weakness.',
    defaultLightCone: 'Past Self in Mirror (S1)',
    defaultRelics: ['Messenger Traversing Hackerspace', 'Broken Keel'],
    prydwenInfo: {
      bestRelicSets: ['Messenger Traversing Hackerspace (4pc)'],
      bestPlanarSets: ['Broken Keel (2pc)', 'Fleet of the Ageless (2pc)'],
      mainStats: { body: 'HP% / DEF%', feet: 'SPD', sphere: 'HP% / DEF%', rope: 'Energy Regeneration Rate' },
      substatPriority: ['Break Effect (target 180%)', 'SPD (145+)', 'HP%', 'DEF%'],
      bestLightCones: ['Past Self in Mirror', 'Memories of the Past (S5)', 'Meshing Cogs (S5)'],
      bestTeams: [
        { name: 'Universal Support BiS', role: 'Support / Buffer', teammates: ['Firefly', 'Harmony MC', 'Gallagher'], description: 'S+ Tier support offering Break Efficiency, RES PEN, SPD, and Break action delay.' }
      ]
    }
  },
  {
    id: 'robin',
    name: 'Robin',
    element: 'Physical',
    path: 'Harmony',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1309.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1309.png',
    baseStats: { hp: 1280, atk: 640, def: 485, spd: 102, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'atk', value: 28.0 }, { stat: 'hp', value: 18.0 }, { stat: 'critDmg', value: 24.0 }],
    maxEnergy: 160,
    skillSpCost: -1,
    skillDescription: 'Increases DMG dealt by all allies by 50% for 3 turns.',
    ultDescription: 'Enters "Concerto" state: Instantly advances ALL allies action by 100%. Increases team ATK based on Robin ATK + extra Physical DMG on ally hit.',
    talentDescription: 'Increases team CRIT DMG by 20%. Robin gains 2 Energy whenever an ally attacks.',
    defaultLightCone: 'Flowing Nightglow (S1)',
    defaultRelics: ['Musketeer of Wild Wheat', 'Lushaka the Sunken Seas'],
    prydwenInfo: {
      bestRelicSets: ['Musketeer 2pc + Prisoner 2pc'],
      bestPlanarSets: ['Lushaka the Sunken Seas (2pc)'],
      mainStats: { body: 'ATK%', feet: 'ATK% or SPD', sphere: 'ATK%', rope: 'Energy Regeneration Rate' },
      substatPriority: ['ATK% (target 4000+)', 'SPD (120+)', 'HP%', 'DEF%'],
      bestLightCones: ['Flowing Nightglow', 'For Tomorrow\'s Journey (S5)', 'Poised to Bloom (S5)'],
      bestTeams: [
        { name: '100% Action Advance Core', role: 'Support / Enabler', teammates: ['Feixiao', 'Topaz', 'Aventurine'], description: 'S+ Tier support for multi-action team turn manipulation.' }
      ]
    }
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    element: 'Quantum',
    path: 'Harmony',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1306.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1306.png',
    baseStats: { hp: 1397, atk: 523, def: 485, spd: 101, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'critDmg', value: 24.0 }, { stat: 'hp', value: 18.0 }, { stat: 'effectHitRate', value: 10.0 }],
    maxEnergy: 110,
    skillSpCost: -1,
    skillDescription: 'Advances target ally action by 50% and increases their CRIT DMG based on 45% of Sparkle CRIT DMG + 45%.',
    ultDescription: 'Recovers 4 Skill Points for the team and grants Cipher buff, increasing team DMG bonus.',
    talentDescription: 'Increases Max Skill Points by 2 (up to 7 SP total). Whenever an ally consumes SP, team DMG increases by 10% for 2 turns.',
    defaultLightCone: 'Earthly Escapade (S1)',
    defaultRelics: ['Messenger Traversing Hackerspace', 'Broken Keel'],
    prydwenInfo: {
      bestRelicSets: ['Messenger Traversing Hackerspace (4pc)'],
      bestPlanarSets: ['Broken Keel (2pc)'],
      mainStats: { body: 'CRIT DMG', feet: 'SPD (160+ Hyperspeed)', sphere: 'HP% / DEF%', rope: 'Energy Regeneration Rate' },
      substatPriority: ['SPD (target 160.1)', 'CRIT DMG (200%+)', 'HP%', 'DEF%'],
      bestLightCones: ['Earthly Escapade', 'Past and Future (S5)', 'Dance! Dance! Dance! (S5)'],
      bestTeams: [
        { name: 'Hyperspeed SP Engine', role: 'Support / Action Buffer', teammates: ['Dan Heng IL', 'Tingyun', 'Fu Xuan'], description: 'Solves SP consumption for heavy hypercarries.' }
      ]
    }
  },
  {
    id: 'aventurine',
    name: 'Aventurine',
    element: 'Imaginary',
    path: 'Preservation',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1304.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1304.png',
    baseStats: { hp: 1203, atk: 446, def: 655, spd: 106, critRate: 5.0, critDmg: 50.0, breakEffect: 0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'def', value: 35.0 }, { stat: 'critDmg', value: 24.0 }, { stat: 'dmgBonus', value: 8.0 }],
    maxEnergy: 110,
    skillSpCost: -1,
    skillDescription: 'Provides stackable "Fortified Wager" shield to all allies based on 24% Aventurine DEF + 320 for 3 turns.',
    ultDescription: 'Gains 1-7 Blind Bet points, deals Imaginary DMG to single target, and inflicts Unnerved debuff (+15% CRIT DMG taken).',
    talentDescription: 'When shielded ally gets hit or casts FUA, Aventurine gains Blind Bet. At 7 points, launches 7-hit Follow-up Attack.',
    defaultLightCone: 'Inherently Unfair Fate (S1)',
    defaultRelics: ['Knight of Purity Palace', 'Broken Keel'],
    prydwenInfo: {
      bestRelicSets: ['Knight of Purity Palace (4pc)'],
      bestPlanarSets: ['Broken Keel (2pc)', 'Duran (2pc)'],
      mainStats: { body: 'DEF%', feet: 'SPD', sphere: 'DEF%', rope: 'DEF%' },
      substatPriority: ['DEF% (target 4000)', 'SPD (134+)', 'CRIT DMG', 'CRIT Rate'],
      bestLightCones: ['Inherently Unfair Fate', 'Trend of the Universal Market (S5)', 'Concert for Two (S5)'],
      bestTeams: [
        { name: 'Universal Shield & FUA', role: 'Sustain', teammates: ['Acheron', 'Feixiao', 'Dr. Ratio'], description: 'S+ Tier sustain offering stackable shields and debuffs.' }
      ]
    }
  },
  {
    id: 'harmony_mc',
    name: 'Harmony MC',
    element: 'Imaginary',
    path: 'Harmony',
    rarity: 5,
    icon: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/8005.png',
    splash: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/8005.png',
    baseStats: { hp: 1086, atk: 620, def: 441, spd: 105, critRate: 5.0, critDmg: 50.0, breakEffect: 100.0, energyRegen: 100.0, effectHitRate: 0, dmgBonus: 0 },
    traceBonuses: [{ stat: 'breakEffect', value: 37.3 }, { stat: 'effectHitRate', value: 10.0 }, { stat: 'hp', value: 18.0 }],
    maxEnergy: 140,
    skillSpCost: -1,
    skillDescription: 'Deals 5-bounce Imaginary DMG to random enemies. Reduces Imaginary toughness rapidly.',
    ultDescription: 'Grants team "Backup Dancer" buff for 3 turns: Enables Super Break DMG when attacking broken enemies.',
    talentDescription: 'Instantly recovers 10 Energy when an enemy weakness is broken by an ally.',
    defaultLightCone: 'Memories of the Past (S5)',
    defaultRelics: ['Iron Cavalry against the Scourge', 'Talia: Kingdom of Banditry'],
    prydwenInfo: {
      bestRelicSets: ['Iron Cavalry against the Scourge (4pc)'],
      bestPlanarSets: ['Talia: Kingdom of Banditry (2pc)'],
      mainStats: { body: 'HP% / DEF%', feet: 'SPD', sphere: 'HP% / DEF%', rope: 'Break Effect%' },
      substatPriority: ['Break Effect (target 200%+)', 'SPD (145+)', 'HP%', 'DEF%'],
      bestLightCones: ['Past Self in Mirror', 'Memories of the Past (S5)', 'Dance! Dance! Dance! (S5)'],
      bestTeams: [
        { name: 'Super Break Enabler', role: 'Support / Super Break', teammates: ['Firefly', 'Ruan Mei', 'Gallagher'], description: 'Essential backbone for all Super Break teams.' }
      ]
    }
  }
];
