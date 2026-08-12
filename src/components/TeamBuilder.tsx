import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CharacterStats, HSRCharacter, TeamMemberConfig } from '../types/hsr';
import { CHARACTERS, getCharacter } from '../data/characters';
import { makeMember } from '../data/team';
import { ELEMENT_COLOR, PATH_ABBREVIATION } from '../ui/format';

interface TeamBuilderProps {
  team: TeamMemberConfig[];
  setTeam: Dispatch<SetStateAction<TeamMemberConfig[]>>;
}

/** Fields the predictor actually reads, exposed as editable inputs. */
const TUNABLE: { key: keyof CharacterStats; label: string; step?: number }[] = [
  { key: 'spd', label: 'SPD' },
  { key: 'atk', label: 'ATK' },
  { key: 'hp', label: 'HP' },
  { key: 'def', label: 'DEF' },
  { key: 'critRate', label: 'CRIT Rate %' },
  { key: 'critDmg', label: 'CRIT DMG %' },
  { key: 'breakEffect', label: 'Break Effect %' },
  { key: 'energyRegen', label: 'Energy Regen %' },
  { key: 'dmgBonus', label: 'DMG Bonus %' },
  { key: 'effectHitRate', label: 'Effect Hit Rate %' }
];

/**
 * Presets are the most-played Memory of Chaos teams in Prydwen's dataset
 * rather than a hand-maintained list, so they follow the live meta.
 */
function usePresets() {
  return useMemo(() => {
    const seen = new Map<string, { members: string[]; rate: number }>();
    for (const character of CHARACTERS) {
      for (const team of character.teams) {
        if (team.members.length !== 4) continue;
        const key = [...team.members.map((m) => m.slug)].sort().join('|');
        const rate = team.appearanceRate ?? 0;
        if (!seen.has(key) || seen.get(key)!.rate < rate) {
          seen.set(key, { members: team.members.map((m) => m.slug), rate });
        }
      }
    }
    return [...seen.values()]
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6)
      .map((preset) => ({
        rate: preset.rate,
        characters: preset.members.map(getCharacter).filter((c): c is HSRCharacter => Boolean(c))
      }))
      .filter((preset) => preset.characters.length === 4);
  }, []);
}

export function TeamBuilder({ team, setTeam }: TeamBuilderProps) {
  const [slot, setSlot] = useState(0);
  const [query, setQuery] = useState('');
  const presets = usePresets();
  const active = team[slot];

  const roster = useMemo(
    () => CHARACTERS.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query]
  );

  const setStat = (key: keyof CharacterStats, value: number) => {
    setTeam((previous) =>
      previous.map((member, index) =>
        index === slot ? { ...member, stats: { ...member.stats, [key]: value } } : member
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="rule flex items-baseline justify-between gap-3 px-5 py-2.5">
          <p className="eyebrow">Most-played teams</p>
          <p className="text-[11px] text-bone-600">By Memory of Chaos appearance rate</p>
        </div>
        <ul className="divide-y divide-ink-850">
          {presets.map((preset) => (
            <li key={preset.characters.map((c) => c.id).join('|')}>
              <button
                type="button"
                onClick={() => setTeam(preset.characters.map((character, index) => makeMember(character, index)))}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-ink-850"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {preset.characters.map((character) => (
                    <span key={character.id} className="flex items-center gap-1.5">
                      <img src={character.icon} alt="" loading="lazy" className="h-6 w-6 rounded-sharp bg-ink-850" />
                      <span className="text-[12.5px] text-bone-300">{character.name}</span>
                    </span>
                  ))}
                </span>
                <span className="readout text-[11.5px] text-bone-600">{preset.rate}% use</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => {
          const member = team[index];
          const selected = index === slot;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSlot(index)}
              className={`panel flex items-center gap-3 p-3 text-left transition-colors ${
                selected ? 'border-signal-dim' : 'hover:border-ink-700'
              }`}
            >
              {member ? (
                <>
                  <img
                    src={member.character.icon}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-sharp bg-ink-850 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-bone-100">{member.character.name}</p>
                    <p className="readout text-[11px] text-bone-600">
                      <span style={{ color: ELEMENT_COLOR[member.character.element] }}>
                        {member.character.element}
                      </span>{' '}
                      · {PATH_ABBREVIATION[member.character.path]} · SPD {member.stats.spd}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="h-11 w-11 shrink-0 rounded-sharp border border-dashed border-ink-700" />
                  <span className="text-[13px] text-bone-600">Slot {index + 1} empty</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="panel">
          <div className="rule flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
            <p className="eyebrow">Assign to slot {slot + 1}</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter"
              className="w-40 rounded-sharp border border-ink-800 bg-ink-850 px-2 py-1 text-[12.5px] text-bone-100 outline-none placeholder:text-bone-600 focus:border-ink-600"
            />
          </div>
          <div className="grid max-h-96 grid-cols-3 gap-1.5 overflow-y-auto p-3 sm:grid-cols-5 lg:grid-cols-7">
            {roster.map((character) => {
              const selected = active?.character.id === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  title={`${character.name} · ${character.element} · ${character.path}`}
                  onClick={() =>
                    setTeam((previous) => {
                      const next = [...previous];
                      next[slot] = makeMember(character, slot);
                      return next;
                    })
                  }
                  className={`rounded-sharp border p-1.5 transition-colors ${
                    selected ? 'border-signal-dim bg-ink-850' : 'border-transparent hover:bg-ink-850'
                  }`}
                >
                  <img src={character.icon} alt="" loading="lazy" className="mx-auto h-9 w-9 rounded-sharp bg-ink-850" />
                  <span className="mt-1 block truncate text-[10.5px] text-bone-500">{character.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {active && (
          <div className="panel h-fit">
            <div className="rule px-5 py-2.5">
              <p className="eyebrow">{active.character.name} stats</p>
            </div>
            <div className="space-y-2.5 px-5 py-4">
              {TUNABLE.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-bone-500">{label}</span>
                  <input
                    type="number"
                    value={active.stats[key]}
                    onChange={(event) => setStat(key, Number(event.target.value) || 0)}
                    className="readout w-24 rounded-sharp border border-ink-800 bg-ink-850 px-2 py-1 text-right text-[12.5px] text-bone-100 outline-none focus:border-ink-600"
                  />
                </label>
              ))}
            </div>
            {active.character.build.statTargets.length > 0 && (
              <div className="border-t border-ink-850 px-5 py-3">
                <p className="eyebrow">Prydwen targets</p>
                <ul className="mt-1.5 space-y-1">
                  {active.character.build.statTargets.slice(0, 6).map((target) => (
                    <li key={target} className="text-[12px] leading-relaxed text-bone-500">
                      {target}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
