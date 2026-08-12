import type { ReactNode } from 'react';
import { BookMarked, Cast, Import, ListOrdered, Swords, Users } from 'lucide-react';
import type { EndgameMode } from '../types/hsr';
import { ENDGAME_DB } from '../data/endgameStages';

export type SectionId = 'live' | 'plan' | 'team' | 'import' | 'stages' | 'codex';

const SECTIONS: { id: SectionId; label: string; icon: typeof Swords }[] = [
  { id: 'stages', label: 'Stages', icon: Swords },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'plan', label: 'Turn plan', icon: ListOrdered },
  { id: 'codex', label: 'Characters', icon: BookMarked },
  { id: 'import', label: 'Import build', icon: Import },
  { id: 'live', label: 'Live capture', icon: Cast }
];

interface ShellProps {
  section: SectionId;
  onSection: (section: SectionId) => void;
  mode: EndgameMode;
  onMode: (mode: EndgameMode) => void;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ section, onSection, mode, onMode, title, subtitle, actions, children }: ShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-ink-800 bg-ink-900 md:flex">
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

          <div className="flex gap-5 overflow-x-auto px-5 md:px-8">
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
        </header>

        {/* Section switcher for narrow screens, where the rail is hidden. */}
        <div className="flex gap-1 overflow-x-auto border-b border-ink-800 px-5 py-2 md:hidden">
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
