import type { ReactNode } from 'react';
import { BookMarked, ListOrdered, Star, Swords, Users } from 'lucide-react';
import type { EndgameMode, EndgameSeason } from '../types/hsr';
import { ENDGAME_DB, seasonLabel, seasonsFor } from '../data/endgameStages';

export type SectionId = 'stages' | 'team' | 'plan' | 'codex';

const SECTIONS: { id: SectionId; label: string; icon: typeof Swords }[] = [
  { id: 'stages', label: 'Stages', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'plan', label: 'Prediction', icon: ListOrdered },
  { id: 'codex', label: 'Characters', icon: BookMarked }
];

interface ShellProps {
  section: SectionId;
  onSection: (section: SectionId) => void;
  mode: EndgameMode;
  onMode: (mode: EndgameMode) => void;
  season: EndgameSeason;
  onSeason: (seasonId: number) => void;
  starward: boolean;
  onStarward: (starward: boolean) => void;
  starwardAvailable: boolean;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({
  section,
  onSection,
  mode,
  onMode,
  season,
  onSeason,
  starward,
  onStarward,
  starwardAvailable,
  title,
  subtitle,
  actions,
  children
}: ShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sticky and viewport-height: the rail used to scroll off the top of a
          long stage page, leaving no way back to the other sections. */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-ink-800 bg-ink-900 md:flex">
        <div className="px-5 py-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-semibold tracking-tight text-bone-100">Cycler</span>
            <span className="readout text-[11px] text-bone-600">v{ENDGAME_DB.gameVersion}</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-bone-600">Honkai: Star Rail endgame planner</p>
        </div>

        <nav className="flex flex-col px-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSection(id)}
                className={`flex items-center gap-2.5 rounded-sharp px-3 py-2 text-left text-[13px] transition-colors ${
                  active ? 'bg-ink-800 text-bone-100' : 'text-bone-500 hover:bg-ink-850 hover:text-bone-300'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} style={active ? { color: 'var(--color-signal)' } : undefined} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-ink-800 px-5 py-4">
          <p className="eyebrow">Data</p>
          <p className="readout mt-1.5 text-[11px] leading-relaxed text-bone-600">
            nanoka {ENDGAME_DB.dataVersion}
            <br />
            prydwen.gg
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-4 md:px-8">
            <div className="min-w-0">
              <h1 className="text-[19px] font-semibold leading-tight tracking-tight text-bone-100">{title}</h1>
              <p className="mt-0.5 truncate text-[12px] text-bone-500">{subtitle}</p>
            </div>
            {actions}
          </div>

          {/* Wraps rather than squeezing: at medium widths the tab strip used
              to compress against the controls and expose a scrollbar. */}
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 px-5 md:px-8">
            <div className="no-scrollbar flex min-w-0 basis-full gap-5 overflow-x-auto lg:flex-1 lg:basis-0">
              {ENDGAME_DB.modes.map((season) => {
                const active = season.mode === mode;
                return (
                  <button
                    key={season.mode}
                    type="button"
                    onClick={() => onMode(season.mode)}
                    className={`-mb-px shrink-0 border-b-2 pb-2.5 text-[12.5px] transition-colors ${
                      active
                        ? 'border-signal text-bone-100'
                        : 'border-transparent text-bone-600 hover:text-bone-300'
                    }`}
                  >
                    {season.mode}
                  </button>
                );
              })}
            </div>

            <div className="mb-2 flex shrink-0 items-center gap-2">
              <SeasonPicker mode={mode} season={season} onSeason={onSeason} />
              <StarwardToggle on={starward} available={starwardAvailable} onToggle={onStarward} />
            </div>
          </div>
        </header>

        {/* Section switcher for narrow screens, where the rail is hidden. */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-800 px-5 py-2 md:hidden">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSection(id)}
              className={`shrink-0 rounded-sharp px-2.5 py-1 text-[12px] ${
                section === id ? 'bg-ink-800 text-bone-100' : 'text-bone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * These rotations reset once or twice a patch, so the season is a choice
 * rather than a fixed "current". Labelled by game version where the mode
 * publishes one; Pure Fiction and Apocalyptic Shadow do not, so they fall back
 * to the season id.
 */
function SeasonPicker({
  mode,
  season,
  onSeason
}: {
  mode: EndgameMode;
  season: EndgameSeason;
  onSeason: (seasonId: number) => void;
}) {
  const seasons = seasonsFor(mode);
  if (seasons.length < 2) return null;

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Rotation</span>
      <select
        value={season.seasonId}
        onChange={(event) => onSeason(Number(event.target.value))}
        className="max-w-[200px] truncate rounded-sharp border border-ink-700 bg-ink-850 px-2 py-1 text-[12px] text-bone-300 outline-none hover:text-bone-100 focus:border-ink-600"
      >
        {seasons.map((entry) => (
          <option key={entry.seasonId} value={entry.seasonId}>
            {seasonLabel(entry)} · {entry.seasonName}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Switches the whole app between the normal stage and its Starward tier.
 * Disabled rather than hidden where a mode has no Starward stage, so the
 * control does not appear and disappear as you move between modes.
 */
function StarwardToggle({
  on,
  available,
  onToggle
}: {
  on: boolean;
  available: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on && available}
      disabled={!available}
      onClick={() => onToggle(!on)}
      title={available ? 'Starward adds a third node and raises the star threshold' : 'This mode has no Starward tier'}
      className={`flex shrink-0 items-center gap-2 rounded-sharp border px-2.5 py-1 text-[12px] transition-colors ${
        !available
          ? 'cursor-not-allowed border-ink-800 text-bone-600 opacity-50'
          : on
            ? 'border-signal text-bone-100'
            : 'border-ink-700 text-bone-500 hover:text-bone-300'
      }`}
    >
      <Star
        className="h-3.5 w-3.5"
        strokeWidth={1.75}
        fill={on && available ? 'var(--color-signal)' : 'none'}
        style={on && available ? { color: 'var(--color-signal)' } : undefined}
      />
      Starward
      <span
        className={`ml-0.5 h-3 w-6 rounded-full border transition-colors ${
          on && available ? 'border-signal bg-signal-dim' : 'border-ink-600'
        }`}
      >
        <span
          className={`block h-2 w-2 translate-y-[1px] rounded-full transition-transform ${
            on && available ? 'translate-x-[15px] bg-signal' : 'translate-x-[3px] bg-ink-600'
          }`}
        />
      </span>
    </button>
  );
}
