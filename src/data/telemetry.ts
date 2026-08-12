import type { TeamRecommendation } from '../types/hsr';
import { CHARACTERS } from './characters';

export interface TeamTelemetry extends TeamRecommendation {
  /** How many of your four are in this recorded team. */
  overlap: number;
}

/**
 * Prydwen publishes average clear cycles per team from real player runs. That
 * is measured data, not a model, so it sits next to the simulated range as the
 * reality check on it — the simulation prices abilities it can read and nothing
 * else, while this number came out of actual clears.
 */
const ALL_TEAMS: TeamRecommendation[] = (() => {
  const seen = new Map<string, TeamRecommendation>();
  for (const character of CHARACTERS) {
    for (const team of character.teams) {
      if (team.members.length !== 4 || team.averageCycles === null) continue;
      const key = team.members
        .map((member) => member.slug)
        .sort()
        .join('|');
      const existing = seen.get(key);
      if (!existing || (team.rank ?? Infinity) < (existing.rank ?? Infinity)) seen.set(key, team);
    }
  }
  return [...seen.values()];
})();

/** The recorded team that overlaps yours most, if at least half of it matches. */
export function closestRecordedTeam(characterIds: string[]): TeamTelemetry | null {
  const wanted = new Set(characterIds);
  let best: TeamTelemetry | null = null;

  for (const team of ALL_TEAMS) {
    const overlap = team.members.filter((member) => wanted.has(member.slug)).length;
    if (overlap < 2) continue;
    if (!best || overlap > best.overlap || (overlap === best.overlap && (team.rank ?? 99) < (best.rank ?? 99))) {
      best = { ...team, overlap };
    }
  }

  return best;
}
