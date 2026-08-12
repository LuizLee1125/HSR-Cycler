import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ElementType, HSRCharacter, PathType, RelicRecommendation } from '../types/hsr';
import { CHARACTERS, ELEMENTS, PATHS } from '../data/characters';
import { ELEMENT_COLOR, PATH_ABBREVIATION, fullNumber, percent } from '../ui/format';

export function PrydwenDatabase() {
  const [query, setQuery] = useState('');
  const [element, setElement] = useState<ElementType | null>(null);
  const [path, setPath] = useState<PathType | null>(null);
  const [selectedId, setSelectedId] = useState(CHARACTERS[0]?.id ?? '');

  const filtered = useMemo(
    () =>
      CHARACTERS.filter(
        (character) =>
          (!element || character.element === element) &&
          (!path || character.path === path) &&
          character.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query, element, path]
  );

  const character = CHARACTERS.find((entry) => entry.id === selectedId) ?? filtered[0] ?? CHARACTERS[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="panel flex h-fit max-h-[calc(100vh-11rem)] flex-col xl:sticky xl:top-32">
        <div className="rule space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-bone-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${CHARACTERS.length} characters`}
              className="w-full rounded-sharp border border-ink-800 bg-ink-850 py-1.5 pl-8 pr-2.5 text-[13px] text-bone-100 outline-none placeholder:text-bone-600 focus:border-ink-600"
            />
          </div>

          <FilterRow
            values={ELEMENTS}
            active={element}
            onChange={setElement}
            colorOf={(value) => ELEMENT_COLOR[value]}
            labelOf={(value) => value.slice(0, 3)}
          />
          <FilterRow
            values={PATHS}
            active={path}
            onChange={setPath}
            labelOf={(value) => PATH_ABBREVIATION[value]}
          />
        </div>

        <ul className="overflow-y-auto p-1.5">
          {filtered.map((entry) => {
            const active = entry.id === character?.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`flex w-full items-center gap-2.5 rounded-sharp px-2 py-1.5 text-left transition-colors ${
                    active ? 'bg-ink-800' : 'hover:bg-ink-850'
                  }`}
                >
                  <img src={entry.icon} alt="" loading="lazy" className="h-8 w-8 rounded-sharp bg-ink-850" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[13px] ${active ? 'text-bone-100' : 'text-bone-300'}`}>
                      {entry.name}
                    </span>
                    <span className="readout block text-[10.5px] text-bone-600">
                      {entry.rarity}★ · {PATH_ABBREVIATION[entry.path]}
                    </span>
                  </span>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: ELEMENT_COLOR[entry.element] }}
                  />
                </button>
              </li>
            );
          })}
          {!filtered.length && <li className="px-3 py-6 text-center text-[12.5px] text-bone-600">No matches.</li>}
        </ul>
      </div>

      {character && <CharacterDetail character={character} />}
    </div>
  );
}

function FilterRow<T extends string>({
  values,
  active,
  onChange,
  labelOf,
  colorOf
}: {
  values: T[];
  active: T | null;
  onChange: (value: T | null) => void;
  labelOf: (value: T) => string;
  colorOf?: (value: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => {
        const on = active === value;
        return (
          <button
            key={value}
            type="button"
            title={value}
            onClick={() => onChange(on ? null : value)}
            className={`readout rounded-sharp border px-1.5 py-0.5 text-[10.5px] transition-colors ${
              on ? 'border-ink-600 bg-ink-800' : 'border-ink-800 hover:border-ink-700'
            }`}
            style={{ color: on && colorOf ? colorOf(value) : undefined }}
          >
            {labelOf(value)}
          </button>
        );
      })}
    </div>
  );
}

function CharacterDetail({ character }: { character: HSRCharacter }) {
  const accent = ELEMENT_COLOR[character.element];
  const { build, meta } = character;

  return (
    <div className="min-w-0 space-y-5">
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <img
            src={character.preview}
            alt=""
            className="h-16 w-16 rounded-sharp border border-ink-800 bg-ink-850 object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-bone-100">{character.name}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-bone-500">
              <span style={{ color: accent }}>{character.element}</span>
              <span className="text-bone-600">·</span>
              <span>{character.path}</span>
              <span className="text-bone-600">·</span>
              <span>{character.rarity}★</span>
              {character.maxEnergy !== null && (
                <>
                  <span className="text-bone-600">·</span>
                  <span className="readout">{character.maxEnergy} energy</span>
                </>
              )}
            </p>
          </div>
          {character.guideUpdated && (
            <p className="readout text-[11px] text-bone-600">Guide updated {character.guideUpdated}</p>
          )}
        </div>

        <div className="grid grid-cols-2 border-t border-ink-850 sm:grid-cols-4">
          <MetaCell label="Usage" value={percent(meta.usage)} />
          <MetaCell label="MoC avg cycles" value={meta.mocAverageCycles?.toFixed(2) ?? '—'} />
          <MetaCell label="Pure Fiction" value={meta.pureFictionScore ? fullNumber(meta.pureFictionScore) : '—'} />
          <MetaCell
            label="Apoc. Shadow"
            value={meta.apocalypticShadowScore ? fullNumber(meta.apocalypticShadowScore) : '—'}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SetPanel title="Relic sets" sets={build.relicSets} accent={accent} />
        <SetPanel title="Planar ornaments" sets={build.planarSets} accent={accent} />
      </div>

      <div className="panel">
        <div className="rule px-5 py-2.5">
          <p className="eyebrow">Light cones</p>
        </div>
        <ul className="divide-y divide-ink-850">
          {build.lightCones.map((cone, index) => (
            <li key={`${cone.name}-${index}`} className="flex items-baseline justify-between gap-3 px-5 py-2">
              <span className="text-[13px] text-bone-300">
                {cone.name}
                {cone.superimposition && (
                  <span className="readout ml-1.5 text-[11px] text-bone-600">S{cone.superimposition}</span>
                )}
              </span>
              <Score relativeDps={cone.relativeDps} priority={cone.priority} accent={accent} />
            </li>
          ))}
          {!build.lightCones.length && <li className="px-5 py-3 text-[12.5px] text-bone-600">No data.</li>}
        </ul>
      </div>

      <div className="panel">
        <div className="rule px-5 py-2.5">
          <p className="eyebrow">Stats</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-4">
          <Slot label="Body" value={build.mainStats.body} />
          <Slot label="Feet" value={build.mainStats.feet} />
          <Slot label="Planar sphere" value={build.mainStats.sphere} />
          <Slot label="Link rope" value={build.mainStats.rope} />
        </div>
        {build.substats && (
          <div className="border-t border-ink-850 px-5 py-3">
            <p className="eyebrow">Substat priority</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-bone-300">{build.substats}</p>
          </div>
        )}
        {build.statTargets.length > 0 && (
          <div className="border-t border-ink-850 px-5 py-3">
            <p className="eyebrow">Endgame targets</p>
            <ul className="mt-1.5 space-y-1">
              {build.statTargets.map((target) => (
                <li key={target} className="text-[12.5px] leading-relaxed text-bone-300">
                  {target}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="border-t border-ink-850 px-5 py-3">
          <p className="eyebrow">Base stats at level 80</p>
          <p className="readout mt-1.5 text-[12.5px] text-bone-300">
            HP {fullNumber(character.baseStats.hp)} · ATK {fullNumber(character.baseStats.atk)} · DEF{' '}
            {fullNumber(character.baseStats.def)} · SPD {character.baseStats.spd}
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="rule flex items-baseline justify-between gap-3 px-5 py-2.5">
          <p className="eyebrow">Best teams</p>
          <p className="text-[11px] text-bone-600">Memory of Chaos usage data</p>
        </div>
        <ul className="divide-y divide-ink-850">
          {character.teams.map((team, index) => (
            <li key={index} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                {team.members.map((member) => (
                  <span
                    key={member.slug}
                    className={`rounded-sharp px-2 py-0.5 text-[12.5px] ${
                      member.slug === character.id ? 'bg-ink-800 text-bone-100' : 'text-bone-400'
                    }`}
                    style={member.slug === character.id ? { color: accent } : undefined}
                  >
                    {member.name}
                  </span>
                ))}
              </div>
              <div className="readout flex shrink-0 gap-4 text-[11.5px] text-bone-500">
                {team.rank !== null && <span>#{team.rank}</span>}
                {team.appearanceRate !== null && <span>{team.appearanceRate}% use</span>}
                {team.averageCycles !== null && <span>{team.averageCycles} cyc</span>}
              </div>
            </li>
          ))}
          {!character.teams.length && (
            <li className="px-5 py-3 text-[12.5px] text-bone-600">
              Prydwen records no ranked Memory of Chaos teams for this character.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-ink-850 px-5 py-3 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 text-[15px] text-bone-100">{value}</p>
    </div>
  );
}

function Slot({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-[12.5px] text-bone-100">{value ?? '—'}</p>
    </div>
  );
}

function Score({
  relativeDps,
  priority,
  accent
}: {
  relativeDps: number | null;
  priority: number | null;
  accent: string;
}) {
  if (relativeDps !== null) {
    return (
      <span className="readout shrink-0 text-[12px]" style={{ color: accent }}>
        {relativeDps.toFixed(2)}%
      </span>
    );
  }
  if (priority !== null) {
    return <span className="readout shrink-0 text-[12px] text-bone-600">#{priority}</span>;
  }
  return null;
}

function SetPanel({
  title,
  sets,
  accent
}: {
  title: string;
  sets: RelicRecommendation[];
  accent: string;
}) {
  return (
    <div className="panel">
      <div className="rule px-5 py-2.5">
        <p className="eyebrow">{title}</p>
      </div>
      <ul className="divide-y divide-ink-850">
        {sets.map((set, index) => (
          <li key={`${set.name}-${index}`} className="flex items-baseline justify-between gap-3 px-5 py-2">
            <span className="text-[13px] text-bone-300">
              {set.name}
              {set.pieces && <span className="readout ml-1.5 text-[11px] text-bone-600">{set.pieces}pc</span>}
            </span>
            <Score relativeDps={set.relativeDps} priority={set.priority} accent={accent} />
          </li>
        ))}
        {!sets.length && <li className="px-5 py-3 text-[12.5px] text-bone-600">No data.</li>}
      </ul>
    </div>
  );
}
