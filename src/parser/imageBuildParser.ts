import type {
  CharacterStats,
  EquippedSet,
  HSRCharacter,
  OcrBuildParseResult,
  SkillLevels,
  SkillSlot
} from '../types/hsr';
import { CHARACTERS } from '../data/characters';
import { LIGHT_CONE_NAMES, RELIC_SET_NAMES, findLightCone, findRelicSet } from '../data/gear';
import { SKILL_SLOTS, skillSlotsOf } from '../data/team';

/**
 * Reads a build card — an Enka.network card or a Fribbels export.
 *
 * These cards are a **two-column layout**: the stat label sits on the left and
 * its value flush right, with a rule between them. Tesseract emits those as
 * separate lines, which is why line-based matching could never read SPD, CRIT
 * DMG or Energy Regeneration Rate (the last of which also wraps onto two
 * lines). So the parser works spatially instead: find the label's box, then
 * take the nearest number sharing its horizontal band — the way a person reads
 * the card.
 *
 * Every field is nullable on purpose. Nothing here substitutes a
 * plausible-looking number for one it could not read.
 */
export async function parseCharacterBuildImage(file: File): Promise<OcrBuildParseResult> {
  const canvas = await preprocess(file);

  let words: Word[] = [];
  let text = '';
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      // `Tesseract.recognize()` cannot return word boxes — its signature has no
      // output argument, so `data.blocks` is always null and the spatial pass
      // has nothing to work with. Only a worker can ask for blocks.
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
      text = data.text ?? '';
      words = collectWords(data.blocks);
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    return { ...emptyResult(), warnings: [`Text recognition failed to run: ${(error as Error).message}`] };
  }

  return extractBuild(text, words);
}

/* ------------------------------------------------------------------ *
 * Image pre-pass
 * ------------------------------------------------------------------ */

/** Real cards are ~1950px wide, which is still small for the stat text. */
const MIN_OCR_WIDTH = 2600;

/**
 * Build cards are dark, low-contrast and full of decorative artwork — the
 * three things Tesseract is worst at. Upscaling, desaturating and stretching
 * the histogram lifts the stat block out of the background.
 */
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const image = await loadImage(file);
  const scale = Math.max(1, Math.min(3, MIN_OCR_WIDTH / image.width));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;

  // Luminance, and its histogram for the threshold below.
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    pixels[i] = luma;
    histogram[luma] += 1;
  }

  // Build cards are light text on a dark panel; Tesseract reads dark-on-light
  // far better, so binarise on Otsu's threshold and invert.
  const threshold = otsu(histogram, pixels.length / 4);
  for (let i = 0; i < pixels.length; i += 4) {
    const value = pixels[i] > threshold ? 0 : 255;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }

  ctx.putImageData(frame, 0, 0);
  return canvas;
}

/** Otsu's method: the threshold that best separates the two brightness modes. */
function otsu(histogram: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;

  for (let t = 0; t < 256; t += 1) {
    weightBackground += histogram[t];
    if (!weightBackground) continue;
    const weightForeground = total - weightBackground;
    if (!weightForeground) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > bestVariance) {
      bestVariance = variance;
      best = t;
    }
  }
  return best;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file could not be read as an image.'));
    };
    image.src = url;
  });
}

/* ------------------------------------------------------------------ *
 * Spatial index
 * ------------------------------------------------------------------ */

export interface Word {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const midY = (box: Box) => (box.y0 + box.y1) / 2;
const height = (box: Box) => Math.max(1, box.y1 - box.y0);

/**
 * Blocks nest paragraphs, lines and words. The word level is the one with the
 * boxes we need, so walk down to it.
 */
function collectWords(blocks: unknown): Word[] {
  const words: Word[] = [];

  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;

    const record = node as Record<string, unknown>;
    const children = record.words ?? record.lines ?? record.paragraphs;
    if (Array.isArray(children)) return walk(children);

    const bbox = record.bbox as Record<string, number> | undefined;
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    if (text && bbox && typeof bbox.x0 === 'number') {
      words.push({ text, x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 });
    }
  };

  walk(blocks);
  return words;
}

/**
 * Text-only fallback for when word boxes are unavailable.
 *
 * The label and its value land on different lines in a two-column layout, so
 * the gap has to be allowed to cross newlines — the mistake the original
 * `[^\d\n]{0,12}` made. The reach is kept short so a miss falls through to the
 * next label rather than grabbing a number three rows down.
 */
function valueFromText(text: string, phrase: string): number | null {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const pattern = new RegExp(`${escaped}[^\\d]{0,24}?([\\d][\\d,]*(?:\\.\\d+)?)`, 'i');
  const raw = pattern.exec(text)?.[1];
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

const NUMBER_RE = /^[+~]?([\d][\d,]*(?:\.\d+)?)%?$/;

function numberValue(word: Word): number | null {
  const match = NUMBER_RE.exec(word.text);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/**
 * Finds the run of words matching a label phrase, allowing it to wrap — the
 * cards break "Energy Regeneration Rate" across two lines.
 */
function findLabel(words: Word[], phrase: string): Box | null {
  const tokens = phrase.toLowerCase().split(/\s+/).map((token) => token.replace(/[^a-z]/g, ''));
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

  for (let i = 0; i < words.length; i += 1) {
    if (norm(words[i].text) !== tokens[0]) continue;

    let box: Box = { ...words[i] };
    let matched = 1;
    let skipped = 0;

    for (let j = i + 1; j < words.length && matched < tokens.length; j += 1) {
      const word = norm(words[j].text);
      // A wrapped label interleaves with its own value in reading order, and
      // OCR sprinkles punctuation between them — the real card yields
      // "Energy | , | Regeneration | Rate | 100.0%". Anything with no letters
      // is stepped over rather than treated as a failed match.
      if (!word) {
        if (skipped++ < 3) continue;
        break;
      }
      // The last token may be clipped by OCR, so a prefix counts.
      const isLast = matched === tokens.length - 1;
      const hit = word === tokens[matched] || (isLast && word.startsWith(tokens[matched]));
      if (!hit) break;

      box = {
        x0: Math.min(box.x0, words[j].x0),
        y0: Math.min(box.y0, words[j].y0),
        x1: Math.max(box.x1, words[j].x1),
        y1: Math.max(box.y1, words[j].y1)
      };
      matched += 1;
    }
    if (matched === tokens.length) return box;
  }
  return null;
}

/**
 * The value belonging to a label: the nearest number to its right whose
 * vertical centre falls inside the label's band. The band is generous enough
 * to survive a wrapped label but not so tall that it grabs the row below.
 */
function valueFor(words: Word[], phrase: string): number | null {
  const label = findLabel(words, phrase);
  if (!label) return null;

  const band = height(label) * 1.1;
  const centre = midY(label);

  let best: { value: number; distance: number } | null = null;
  for (const word of words) {
    if (word.x0 < label.x1) continue;
    if (Math.abs(midY(word) - centre) > band) continue;
    const value = numberValue(word);
    if (value === null) continue;

    const distance = word.x0 - label.x1;
    if (!best || distance < best.distance) best = { value, distance };
  }
  return best?.value ?? null;
}

/* ------------------------------------------------------------------ *
 * Field extraction
 * ------------------------------------------------------------------ */

/** Label phrases exactly as the cards print them. */
const STAT_LABELS: { key: keyof CharacterStats; phrases: string[] }[] = [
  { key: 'hp', phrases: ['HP'] },
  { key: 'atk', phrases: ['ATK'] },
  { key: 'def', phrases: ['DEF'] },
  { key: 'spd', phrases: ['SPD', 'Speed'] },
  { key: 'critRate', phrases: ['CRIT Rate'] },
  { key: 'critDmg', phrases: ['CRIT DMG'] },
  { key: 'breakEffect', phrases: ['Break Effect'] },
  // Wraps onto two lines on the card, so shorter prefixes are tried too.
  { key: 'energyRegen', phrases: ['Energy Regeneration Rate', 'Energy Regeneration', 'Energy Regen', 'Energy'] },
  { key: 'effectHitRate', phrases: ['Effect Hit Rate'] },
  { key: 'dmgBonus', phrases: ['DMG Boost', 'DMG Bonus'] }
];

/** Card labels for each ability row, where a card prints them. */
const SKILL_LABELS: Record<SkillSlot, string[]> = {
  basic: ['Basic ATK', 'Basic'],
  skill: ['Skill'],
  ultimate: ['Ultimate', 'Ult'],
  talent: ['Talent'],
  technique: ['Technique'],
  memospriteSkill: ['Memosprite Skill'],
  memospriteTalent: ['Memosprite Talent'],
  elationSkill: ['Elation Skill'],
  assist: ['Assist']
};

export function extractBuild(rawText: string, words: Word[]): OcrBuildParseResult {
  const text = rawText.replace(/’/g, "'");
  const warnings: string[] = [];

  const character = matchCharacter(text);
  if (!character) warnings.push('No character name on the card matched the roster — pick it manually.');

  // Spatial first, then the text fallback — a value that reads either way is
  // the same value, and having both means one failing mode is not fatal.
  const read = (phrase: string) => valueFor(words, phrase) ?? valueFromText(text, phrase);

  const stats: Partial<CharacterStats> = {};
  for (const { key, phrases } of STAT_LABELS) {
    for (const phrase of phrases) {
      const value = read(phrase);
      if (value !== null) {
        stats[key] = value;
        break;
      }
    }
  }

  // The element DMG boost is labelled by element ("Wind DMG Boost").
  if (stats.dmgBonus === undefined && character) {
    const value = read(`${character.element} DMG Boost`);
    if (value !== null) stats.dmgBonus = value;
  }

  const missing = STAT_LABELS.filter(({ key }) => stats[key] === undefined).map(({ key }) => key);
  if (missing.length) {
    warnings.push(`Could not read ${missing.join(', ')} — fill these in before the plan will use them.`);
  }

  const level = clamp(read('Lv'), 1, 80) ?? readNumber(text, /\bLv\.?\s*(\d{1,2})\b/i, 1, 80);
  const eidolon = readEidolon();
  warnings.push('Eidolon is not printed on a build card as text — set it here if it is not E0.');

  const cone = matchLightCone(text);
  const superimposition = readSuperimposition(text, words, cone?.name ?? null);
  const sets = readRelicSets(text);
  const skillLevels = character ? readSkillLevels(words, text, character) : {};

  if (character && Object.keys(skillLevels).length < skillSlotsOf(character).length) {
    warnings.push('Some ability levels were unreadable — check them, they drive every damage number.');
  }
  if (!cone) warnings.push('No Light Cone matched — its conditional effects will not be applied.');
  else if (superimposition === null) {
    warnings.push(`Could not read ${cone.name}'s Superimposition — defaulted to S1, correct it if higher.`);
  }

  const found = [
    character,
    level,
    Object.keys(stats).length >= 8,
    Object.keys(skillLevels).length > 0,
    cone,
    sets.relicSets.length > 0
  ].filter(Boolean).length;

  return {
    success: Boolean(character) && Object.keys(stats).length > 0,
    characterId: character?.id ?? null,
    characterName: character?.name ?? null,
    level,
    eidolon,
    stats,
    skillLevels,
    relicSets: sets.relicSets,
    planarSet: sets.planarSet,
    lightConeId: cone?.id ?? null,
    lightCone: cone?.name ?? null,
    superimposition,
    confidence: found / 6,
    warnings,
    rawText
  };
}

function clamp(value: number | null, min: number, max: number): number | null {
  return value !== null && value >= min && value <= max ? value : null;
}

function readNumber(text: string, pattern: RegExp, min: number, max: number): number | null {
  const value = Number(pattern.exec(text)?.[1]);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/**
 * Superimposition is a **Roman numeral** in a badge (`I`…`V`), not an `S1`
 * label — which is why the old `S(\d)` pattern never matched.
 */
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

function readSuperimposition(text: string, words: Word[], coneName: string | null): number | null {
  const fromText = readNumber(text, /\bS(\d)\b/i, 1, 5);
  if (fromText) return fromText;

  // The badge is a token made only of I and V. Stripping other letters instead
  // would read the V out of "Lv." as superimposition 5.
  const romans = words.filter((word) => {
    const letters = word.text.replace(/[^a-zA-Z]/g, '').toUpperCase();
    return letters !== '' && ROMAN[letters] !== undefined;
  });
  if (!romans.length) return null;

  // The badge sits beside the Light Cone's name, so anchor on it — a card can
  // easily contain another stray I or V somewhere in the artwork.
  const anchorWord = coneName?.split(/[^A-Za-z]+/).find((word) => word.length >= 7);
  const anchor = anchorWord ? findLabel(words, anchorWord) : null;

  if (!anchor) return null;

  // Bounded to the cone's own neighbourhood. A lone "I" is easy for OCR to
  // drop, and without this bound the V inside "Lv." on the other side of the
  // card gets picked up instead — a confidently wrong S5.
  const radius = height(anchor) * 6;
  const near = romans.filter((word) => distance(word, anchor) <= radius);
  if (!near.length) return null;

  const chosen = near.reduce((best, word) => (distance(word, anchor) < distance(best, anchor) ? word : best));
  return ROMAN[chosen.text.replace(/[^a-zA-Z]/g, '').toUpperCase()] ?? null;
}

function distance(a: Box, b: Box): number {
  const dx = (a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2;
  const dy = midY(a) - midY(b);
  return Math.hypot(dx, dy);
}

/**
 * Relic sets print the piece count next to the name — before it for the relic
 * set (`4 Scholar Lost in Erudition`), after it for the planar ornament
 * (`Inert Salsotto 2`). Planar ornaments are identified from the database
 * rather than from where the number sits.
 */
function readRelicSets(text: string): { relicSets: EquippedSet[]; planarSet: string | null } {
  const haystack = normalise(text);
  const relicSets: EquippedSet[] = [];
  let planarSet: string | null = null;

  for (const name of RELIC_SET_NAMES) {
    const needle = normalise(name);
    const at = haystack.indexOf(needle);
    if (needle.length < 8 || at === -1) continue;

    const set = findRelicSet(name);
    if (!set) continue;

    if (set.planar) {
      planarSet ??= name;
      continue;
    }
    // A digit immediately before or after the name is the piece count.
    const before = haystack.slice(Math.max(0, at - 1), at);
    const after = haystack.slice(at + needle.length, at + needle.length + 1);
    const pieces = Number(before) || Number(after) || 4;
    relicSets.push({ name, pieces: pieces === 2 ? 2 : 4 });
  }

  return { relicSets: relicSets.slice(0, 2), planarSet };
}

/**
 * Ability levels appear either labelled ("Skill 10") or as a column of bare
 * numerals beside the ability icons. Labelled wins; the column is the fallback,
 * read top to bottom in the order the cards lay the abilities out.
 */
function readSkillLevels(words: Word[], text: string, character: HSRCharacter): SkillLevels {
  const slots = skillSlotsOf(character);
  const levels: SkillLevels = {};

  for (const slot of slots) {
    const ceiling = character.skills[slot]?.maxLevel ?? 15;
    for (const phrase of SKILL_LABELS[slot]) {
      const value = clamp(valueFor(words, phrase), 1, ceiling);
      if (value !== null) {
        levels[slot] = value;
        break;
      }
    }
  }

  if (Object.keys(levels).length >= slots.length) return levels;

  const badges = findBadgeColumn(words, slots.length);
  if (badges.length) {
    const ordered = SKILL_SLOTS.filter((slot) => slots.includes(slot));
    ordered.forEach((slot, index) => {
      const value = badges[index] ?? null;
      const ceiling = character.skills[slot]?.maxLevel ?? 15;
      if (levels[slot] === undefined && value !== null && value <= ceiling) levels[slot] = value;
    });
  }

  // Last resort: a labelled run in the flat text.
  for (const slot of slots) {
    if (levels[slot] !== undefined) continue;
    const ceiling = character.skills[slot]?.maxLevel ?? 15;
    for (const phrase of SKILL_LABELS[slot]) {
      const value = readNumber(text, new RegExp(`${phrase}\\D{0,8}(\\d{1,2})`, 'i'), 1, ceiling);
      if (value !== null) {
        levels[slot] = value;
        break;
      }
    }
  }

  return levels;
}

/**
 * Ability levels sit in a vertical column of bare numerals beside the ability
 * icons. Taking every small integer on the card in reading order pulls in the
 * relic piece counts too ("4 Scholar…", "Inert Salsotto 2"), which is what put
 * Ultimate at 4 and Talent at 2.
 *
 * So find the actual column: cluster the candidates by x, and keep the tallest
 * left-most group big enough to hold the character's abilities.
 */
function findBadgeColumn(words: Word[], wanted: number): number[] {
  const candidates = words.filter(
    (word) => /^\d{1,2}$/.test(word.text) && Number(word.text) >= 1 && Number(word.text) <= 15
  );
  if (candidates.length < wanted) return [];

  const tolerance = Math.max(24, ...candidates.map((word) => (word.x1 - word.x0) * 1.5));
  const groups: Word[][] = [];

  for (const word of candidates.slice().sort((a, b) => a.x0 - b.x0)) {
    const group = groups.find((entry) => Math.abs(entry[0].x0 - word.x0) <= tolerance);
    if (group) group.push(word);
    else groups.push([word]);
  }

  const column = groups
    .filter((group) => group.length >= wanted)
    // Ties go to the left-most column — the ability badges, not the relic list.
    .sort((a, b) => b.length - a.length || a[0].x0 - b[0].x0)[0];

  return column ? column.sort((a, b) => a.y0 - b.y0).map((word) => Number(word.text)) : [];
}

/**
 * Eidolon is the one field a build card does not print as text — it is a strip
 * of six icons, dimmed while locked.
 *
 * A brightness read of that strip was tried and removed: locked icons still
 * show artwork over a gradient background, so mean luminance varies per row for
 * reasons that have nothing to do with unlock state, and it reported E3 for an
 * E0 card. A confidently wrong number is worse than none, so this asks instead.
 */
function readEidolon(): number | null {
  return null;
}

/* ------------------------------------------------------------------ *
 * Name matching
 * ------------------------------------------------------------------ */

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Light cone titles are long and set in a decorative face, so OCR rarely gets
 * every character. An exact substring test therefore fails on real cards.
 *
 * Full name first; failing that, the title's most distinctive long word — a
 * card reading "Coronation" is A Thankless Coronation even when the rest of
 * the line came out garbled. The 7-character floor keeps common words
 * ("Memory", "Night") from matching half the catalogue.
 */
function matchLightCone(text: string) {
  const haystack = normalise(text);

  for (const name of LIGHT_CONE_NAMES) {
    const needle = normalise(name);
    if (needle.length >= 8 && haystack.includes(needle)) return findLightCone(name);
  }

  let best: { name: string; score: number } | null = null;

  for (const name of LIGHT_CONE_NAMES) {
    const needle = normalise(name);
    if (needle.length < 10) continue;

    // Evidence is the longest piece of the title that survived OCR: either a
    // whole distinctive word, or a contiguous run of the normalised title.
    let evidence = 0;
    for (const word of name.split(/[^A-Za-z]+/)) {
      const token = normalise(word);
      if (token.length >= 7 && haystack.includes(token)) evidence = Math.max(evidence, token.length);
    }

    const window = Math.max(10, Math.floor(needle.length * 0.6));
    for (let start = 0; start + window <= needle.length; start += 1) {
      if (haystack.includes(needle.slice(start, start + window))) {
        evidence = Math.max(evidence, window);
        break;
      }
    }

    // Half the title has to be accounted for. Without this floor, "Something
    // Entirely Different" on a card resolves to "Something Irreplaceable" and
    // silently applies the wrong light cone effects.
    if (evidence < 9 || evidence < needle.length * 0.5) continue;
    if (!best || evidence > best.score) best = { name, score: evidence };
  }

  return best ? findLightCone(best.name) : undefined;
}

/** Longest roster name present in the text wins, so "The Herta" beats "Herta". */
function matchCharacter(text: string): HSRCharacter | null {
  const haystack = normalise(text);
  let best: HSRCharacter | null = null;
  for (const character of CHARACTERS) {
    const needle = normalise(character.name);
    if (!needle || !haystack.includes(needle)) continue;
    if (!best || needle.length > normalise(best.name).length) best = character;
  }
  return best;
}

function emptyResult(): OcrBuildParseResult {
  return {
    success: false,
    characterId: null,
    characterName: null,
    level: null,
    eidolon: null,
    stats: {},
    skillLevels: {},
    relicSets: [],
    planarSet: null,
    lightConeId: null,
    lightCone: null,
    superimposition: null,
    confidence: 0,
    warnings: [],
    rawText: ''
  };
}
