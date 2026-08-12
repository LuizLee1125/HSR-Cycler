import { useState } from 'react';
import type { EndgameMode, EndgameStage, EnemyUnit, EnemyWave, StageNode } from '../types/hsr';
import { getSeason } from '../data/endgameStages';
import { ELEMENT_COLOR, RANK_LABEL, compactNumber, fullNumber, toughnessBars } from '../ui/format';

interface EndgameSelectorProps {
  mode: EndgameMode;
  selectedStage: EndgameStage | null;
  onSelectStage: (stage: EndgameStage) => void;
}

export function EndgameSelector({ mode, selectedStage, onSelectStage }: EndgameSelectorProps) {
  const season = getSeason(mode);
  const stage = selectedStage ?? season.stages[0];
  const [nodeIndex, setNodeIndex] = useState(0);
  const node = stage?.nodes[Math.min(nodeIndex, stage.nodes.length - 1)];

  if (!stage) return <p className="text-bone-500">No stage data for {mode}.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="panel h-fit">
        <div className="rule px-4 py-3">
          <p className="eyebrow">{mode}</p>
          <p className="mt-1 text-[13px] text-bone-100">{season.seasonName}</p>
        </div>
        <ul className="p-1.5">
          {season.stages.map((entry) => {
            const active = entry.id === stage.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectStage(entry);
                    setNodeIndex(0);
                  }}
                  className={`flex w-full items-baseline gap-2 rounded-sharp px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    active ? 'bg-ink-800 text-bone-100' : 'text-bone-500 hover:bg-ink-850 hover:text-bone-300'
                  }`}
                >
                  <span className="readout w-5 shrink-0 text-[11px] text-bone-600">{entry.stageNumber}</span>
                  <span className="truncate">{entry.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0 space-y-5">
        <StageHeader stage={stage} />

        {stage.nodes.length > 1 && (
          <div className="flex gap-1">
            {stage.nodes.map((entry, index) => (
              <button
                key={entry.index}
                type="button"
                onClick={() => setNodeIndex(index)}
                className={`rounded-sharp border px-3 py-1.5 text-[12.5px] transition-colors ${
                  index === nodeIndex
                    ? 'border-signal-dim bg-ink-850 text-bone-100'
                    : 'border-ink-800 text-bone-600 hover:text-bone-300'
                }`}
              >
                Node {entry.index}
              </button>
            ))}
          </div>
        )}

        {node && <NodePanel node={node} />}
      </div>
    </div>
  );
}

function StageHeader({ stage }: { stage: EndgameStage }) {
  const modifiers = stage.turbulence ? [stage.turbulence, ...stage.modifiers] : stage.modifiers;
  return (
    <div className="panel">
      <div className="rule flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
        <h2 className="text-[17px] font-semibold tracking-tight text-bone-100">{stage.name}</h2>
        {stage.cycleLimit && (
          <span className="readout text-[12px] text-bone-500">{stage.cycleLimit} cycle limit</span>
        )}
      </div>

      {stage.starConditions.length > 0 && (
        <div className="rule flex flex-wrap gap-x-6 gap-y-1.5 px-5 py-3">
          {stage.starConditions.map((condition, index) => (
            <span key={condition} className="flex items-baseline gap-1.5 text-[12.5px] text-bone-300">
              <span className="readout text-[11px]" style={{ color: 'var(--color-signal)' }}>
                {'★'.repeat(index + 1)}
              </span>
              {condition}
            </span>
          ))}
        </div>
      )}

      {modifiers.length > 0 && (
        <div className="space-y-3 px-5 py-4">
          {modifiers.slice(0, 4).map((modifier) => (
            <div key={modifier.name}>
              <p className="text-[12.5px] font-medium text-bone-100">{modifier.name}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-bone-500">{modifier.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NodePanel({ node }: { node: StageNode }) {
  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
        <Stat label="Enemy level" value={node.level ? String(node.level) : '—'} />
        <div>
          <p className="eyebrow">Recommended</p>
          <div className="mt-1 flex gap-1.5">
            {node.recommendedElements.length ? (
              node.recommendedElements.map((element) => (
                <span
                  key={element}
                  className="rounded-sharp border px-1.5 py-0.5 text-[11px]"
                  style={{ color: ELEMENT_COLOR[element], borderColor: ELEMENT_COLOR[element] }}
                >
                  {element}
                </span>
              ))
            ) : (
              <span className="text-[12px] text-bone-600">Any</span>
            )}
          </div>
        </div>
      </div>

      {node.waves.map((wave) => (
        <WaveTable key={`w${wave.waveIndex}`} wave={wave} title={`Wave ${wave.waveIndex}`} />
      ))}

      {node.endlessWaves.map((wave) => (
        <WaveTable
          key={`e${wave.waveIndex}`}
          wave={wave}
          title={`Endless wave ${wave.waveIndex}`}
          note={[
            wave.maxOnField ? `${wave.maxOnField} on field` : null,
            wave.hpMultiplier && wave.hpMultiplier !== 1 ? `${wave.hpMultiplier}× HP` : null
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 text-[13px] text-bone-100">{value}</p>
    </div>
  );
}

function WaveTable({ wave, title, note }: { wave: EnemyWave; title: string; note?: string }) {
  if (!wave.enemies.length) return null;
  return (
    <div className="panel overflow-hidden">
      <div className="rule flex items-baseline justify-between gap-3 px-5 py-2.5">
        <p className="eyebrow">{title}</p>
        {note && <p className="readout text-[11px] text-bone-600">{note}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="text-left text-bone-600">
              <th className="px-5 py-2 font-medium">Enemy</th>
              <th className="px-3 py-2 text-right font-medium">HP</th>
              <th className="px-3 py-2 text-right font-medium">SPD</th>
              <th className="px-3 py-2 text-right font-medium">Toughness</th>
              <th className="px-3 py-2 text-right font-medium">DEF</th>
              <th className="px-3 py-2 text-right font-medium">RES</th>
              <th className="px-5 py-2 font-medium">Weak to</th>
            </tr>
          </thead>
          <tbody>
            {wave.enemies.map((enemy) => (
              <EnemyRow key={enemy.monsterId} enemy={enemy} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EnemyRow({ enemy }: { enemy: EnemyUnit }) {
  return (
    <tr className="border-t border-ink-850 align-top">
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          {enemy.icon && (
            <img
              src={enemy.icon}
              alt=""
              loading="lazy"
              className="h-7 w-7 shrink-0 rounded-sharp bg-ink-850 object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-bone-100">
              {enemy.name}
              {enemy.count > 1 && <span className="readout ml-1.5 text-[11px] text-bone-600">×{enemy.count}</span>}
            </p>
            <p className="readout text-[11px] text-bone-600">
              {RANK_LABEL[enemy.rank] ?? enemy.rank} · Lv.{enemy.level}
              {enemy.phases > 1 && ` · ${enemy.phases} phases${enemy.phasesEstimated ? ' (est.)' : ''}`}
            </p>
          </div>
        </div>
      </td>
      <td className="readout px-3 py-2.5 text-right text-bone-100" title={fullNumber(enemy.hp)}>
        {compactNumber(enemy.hp)}
      </td>
      <td className="readout px-3 py-2.5 text-right text-bone-300">{enemy.spd}</td>
      <td className="readout px-3 py-2.5 text-right text-bone-300">
        {enemy.toughness}
        <span className="ml-1 text-[11px] text-bone-600">({toughnessBars(enemy.toughness)} bars)</span>
      </td>
      <td className="readout px-3 py-2.5 text-right text-bone-300">{fullNumber(enemy.def)}</td>
      <td className="readout px-3 py-2.5 text-right text-bone-300">{enemy.effectRes}%</td>
      <td className="px-5 py-2.5">
        <div className="flex flex-wrap gap-1">
          {enemy.weaknesses.map((element) => (
            <span
              key={element}
              className="rounded-sharp px-1.5 py-0.5 text-[11px]"
              style={{ color: ELEMENT_COLOR[element], background: 'var(--color-ink-850)' }}
            >
              {element}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
