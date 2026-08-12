import type { CharacterStats } from '../types/hsr';
import { CHARACTERS } from '../data/characters';

export interface EnkaAvatar {
  characterId: string;
  characterName: string;
  icon: string;
  level: number;
  eidolon: number;
  lightCone: string | null;
  lightConeSuperimposition: number | null;
  relicSetIds: number[];
  /** Only present when the payload actually carries computed stats. */
  stats: CharacterStats | null;
}

export interface EnkaFetchResult {
  success: boolean;
  uid: string;
  playerNickname?: string;
  level?: number;
  avatarList: EnkaAvatar[];
  errorMessage?: string;
}

const BY_GAME_ID = new Map(CHARACTERS.map((character) => [character.gameId, character]));

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json => (value && typeof value === 'object' ? (value as Json) : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * Reads a player's character showcase from Enka.network.
 *
 * Enka returns build *configuration* (level, Eidolon, Light Cone, relics) but
 * not computed combat stats. Rather than invent numbers, `stats` is left null
 * when the payload has none and the UI keeps the character's base stats.
 */
export async function fetchEnkaBuildsByUid(uid: string): Promise<EnkaFetchResult> {
  const sanitized = uid.trim().replace(/\D/g, '');
  if (sanitized.length < 9) {
    return { success: false, uid, avatarList: [], errorMessage: 'Enter a 9-digit Honkai: Star Rail UID.' };
  }

  let payload: Json;
  try {
    const response = await fetch(`https://enka.network/api/hsr/uid/${sanitized}?lang=en`, {
      headers: { accept: 'application/json' }
    });
    if (response.status === 404) {
      return { success: false, uid: sanitized, avatarList: [], errorMessage: 'No player with that UID.' };
    }
    if (response.status === 424) {
      return {
        success: false,
        uid: sanitized,
        avatarList: [],
        errorMessage: 'Enka cannot reach the game server right now. Try again shortly.'
      };
    }
    if (!response.ok) {
      return {
        success: false,
        uid: sanitized,
        avatarList: [],
        errorMessage: `Enka.network returned HTTP ${response.status}.`
      };
    }
    payload = asRecord(await response.json());
  } catch {
    return {
      success: false,
      uid: sanitized,
      avatarList: [],
      errorMessage:
        'Could not reach enka.network. In a browser this is usually CORS — run the desktop build, which is not subject to it.'
    };
  }

  const detail = asRecord(payload.detailInfo ?? payload.playerInfo);
  const avatarList = asArray(detail.avatarDetailList)
    .map((entry) => toAvatar(asRecord(entry)))
    .filter((avatar): avatar is EnkaAvatar => avatar !== null);

  if (!avatarList.length) {
    return {
      success: false,
      uid: sanitized,
      avatarList: [],
      playerNickname: typeof detail.nickname === 'string' ? detail.nickname : undefined,
      errorMessage: 'This profile has no characters on display. Enable the in-game showcase and try again.'
    };
  }

  return {
    success: true,
    uid: sanitized,
    playerNickname: typeof detail.nickname === 'string' ? detail.nickname : undefined,
    level: asNumber(detail.level) ?? undefined,
    avatarList
  };
}

function toAvatar(raw: Json): EnkaAvatar | null {
  const gameId = String(raw.avatarId ?? raw.id ?? '');
  const character = BY_GAME_ID.get(gameId);
  if (!character) return null;

  const equipment = asRecord(raw.equipment);
  const relicSetIds = asArray(raw.relicList)
    .map((relic) => asNumber(asRecord(relic).tid))
    // Relic ids are 5-digit; the leading digits identify the set.
    .map((tid) => (tid === null ? null : Math.floor(tid / 10) % 1000))
    .filter((id): id is number => id !== null);

  return {
    characterId: character.id,
    characterName: character.name,
    icon: character.icon,
    level: asNumber(raw.level) ?? 80,
    eidolon: asNumber(raw.rank) ?? 0,
    lightCone: typeof equipment.name === 'string' ? equipment.name : null,
    lightConeSuperimposition: asNumber(equipment.rank),
    relicSetIds,
    stats: readStats(asRecord(raw.finalStats))
  };
}

/** Enka omits computed stats on most responses; return null rather than guess. */
function readStats(source: Json): CharacterStats | null {
  const hp = asNumber(source.hp);
  const atk = asNumber(source.atk);
  if (hp === null || atk === null) return null;

  const asPercent = (value: unknown, fallback: number) => {
    const parsed = asNumber(value);
    return parsed === null ? fallback : Number((parsed * 100).toFixed(1));
  };

  return {
    hp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(asNumber(source.def) ?? 0),
    spd: Math.round(asNumber(source.spd) ?? 0),
    critRate: asPercent(source.critRate, 5),
    critDmg: asPercent(source.critDmg, 50),
    breakEffect: asPercent(source.breakEffect, 0),
    energyRegen: asPercent(source.energyRegen, 100),
    effectHitRate: asPercent(source.effectHitRate, 0),
    dmgBonus: asPercent(source.dmgBonus, 0)
  };
}
