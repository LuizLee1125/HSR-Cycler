import { useMemo } from 'react';
import type { ActionType, SimulationResult } from '../types/hsr';
import { closestRecordedTeam } from '../data/telemetry';
import { compactNumber, fullNumber } from '../ui/format';
import { LiveCapturePanel } from './LiveCapturePanel';

interface TacticalInstructionGuideProps {
  result: SimulationResult | null;
  teamIds: string[];
  teamNames: string[];
  ready: boolean;
  onRunSimulation: () => void;
}

const ACTION_COLOR: Record<ActionType, string> = {
  'Basic Attack': 'var(--color-bone-500)',
  Skill: 'var(--color-signal)',
  Ultimate: 'var(--color-el-lightning)',
  'Assist Skill': 'var(--color-el-ice)',
  Technique: 'var(--color-bone-600)',
  'Follow-Up Attack': 'var(--color-el-wind)'
};

export function TacticalInstructionGuide({
  result,
  teamIds,
  teamNames,
  ready,
  onRunSimulation
}: TacticalInstructionGuideProps) {
  const recorded = useMemo(() => closestRecordedTeam(teamIds), [teamIds]);

  if (!result) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="text-[15px] text-bone-300">No plan yet.</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-bone-600">
          {ready
            ? 'Run the predictor to get a turn-by-turn order with Action Values, Skill Point balance and a cycle range.'
            : 'The predictor needs four slots with a build card imported. It will not guess your stats.'}
        </p>
        <button
          type="button"
          onClick={onRunSimulation}
          disabled={!ready}
          className="btn btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run predictor
        </button>
      </div>
    );
  }

  const isMoc = result.mode === 'Memory of Chaos';

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="rule flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-bone-100">Predicted cycles</p>
            <p className="mt-0.5 text-[12.5px] text-bone-500">
              {result.stageName} · node {result.nodeIndex + 1} · {result.mode}
              {result.buff && ` · ${result.buff.name}`}
            </p>
          </div>
          <button type="button" onClick={onRunSimulation} className="btn">
            Recalculate
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3">
          {result.branches.map((branch) => (
            <Metric
              key={branch.label}
              label={branch.label}
              value={branch.cleared ? String(branch.cycles) : '—'}
              unit={branch.cleared ? 'cycles' : 'no clear'}
              tone={
                !branch.cleared
                  ? 'danger'
                  : withinBudget(branch.cycles, result.cycleLimit)
                    ? 'good'
                    : 'danger'
              }
            />
          ))}
        </div>

        <p className="border-t border-ink-850 px-5 py-2.5 text-[11.5px] leading-relaxed text-bone-600">
          {result.cycleLimit
            ? `Three stars needs the clear inside ${result.cycleLimit} cycles. `
            : 'This mode scores on points rather than a cycle cap. '}
          {Math.round(result.clearProbability * 100)}% of rolled branches cleared the node
          {isMoc ? ' inside that budget' : ''}. The spread comes from enemy attacks and delays, which are rolled
          rather than assumed. Damage across the typical branch totals {compactNumber(result.estimatedDamage)},
          using each character's own ability multipliers at the levels on their build card.
        </p>
      </div>

      {recorded && (
        <div className="panel flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-3.5">
          <div className="min-w-0">
            <p className="eyebrow">Measured, for comparison</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-bone-300">
              Prydwen records real Memory of Chaos clears at{' '}
              <span className="readout text-bone-100">{recorded.averageCycles} cycles</span> for{' '}
              {recorded.members.map((member) => member.name).join(', ')}
              {recorded.averageCyclesE1 !== null && ` (${recorded.averageCyclesE1} at E1+)`}.
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-bone-600">
              {recorded.overlap} of your 4 match that line-up. The simulation above prices only the abilities it
              can read from the game data — stack-scaling and transformed states are not in it, so it runs
              conservative against this figure.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {result.branches.map((branch) => (
          <div key={branch.label} className="panel px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="eyebrow">{branch.label}</p>
              <p
                className="readout text-[15px]"
                style={{ color: branch.cleared ? 'var(--color-bone-100)' : 'var(--color-danger)' }}
              >
                {branch.cycles}
              </p>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-bone-600">
              {branch.cleared
                ? branch.note
                : `Ran out of cycles with ${branch.hpRemainingPercent}% of the node still standing.`}
            </p>
          </div>
        ))}
      </div>

      <LiveCapturePanel plan={result.instructions} teamNames={teamNames} />

      {result.summaryTips.length > 0 && (
        <div className="panel px-5 py-4">
          <p className="eyebrow">Notes</p>
          <ul className="mt-2 space-y-1.5">
            {result.summaryTips.map((tip) => (
              <li key={tip} className="text-[12.5px] leading-relaxed text-bone-300">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="rule flex items-baseline justify-between gap-3 px-5 py-2.5">
          <p className="eyebrow">Turn order</p>
          <p className="text-[11px] text-bone-600">Allies and enemies on one Action Value timeline</p>
        </div>

        <ol>
          {result.instructions.map((step, index) => (
            <li key={index} className="border-t border-ink-850 first:border-t-0">
              <div
                className="flex gap-4 px-5 py-3"
                style={step.side === 'enemy' ? { background: 'var(--color-ink-950)' } : undefined}
              >
                <div className="w-16 shrink-0 pt-0.5">
                  <p className="readout text-[12px] text-bone-100">AV {step.avTimestamp}</p>
                  <p className="readout text-[10.5px] text-bone-600">Cycle {step.cycleNumber}</p>
                </div>

                {step.characterIcon ? (
                  <img
                    src={step.characterIcon}
                    alt=""
                    loading="lazy"
                    className="h-8 w-8 shrink-0 rounded-sharp bg-ink-850 object-cover"
                  />
                ) : (
                  <span className="h-8 w-8 shrink-0 rounded-sharp border border-dashed border-ink-700" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                    <span className={step.side === 'enemy' ? 'text-bone-500' : 'text-bone-100'}>
                      {step.characterName}
                    </span>
                    {step.side === 'enemy' ? (
                      <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>
                        enemy turn
                      </span>
                    ) : (
                      <span style={{ color: ACTION_COLOR[step.actionType] }}>{step.actionType}</span>
                    )}
                    {step.abilityName && <span className="text-bone-600">{step.abilityName}</span>}
                    {step.targetName && <span className="text-bone-600">→ {step.targetName}</span>}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-bone-500">{step.recommendationReason}</p>
                </div>

                <div className="readout w-28 shrink-0 text-right text-[11.5px]">
                  {step.estimatedDamage > 0 ? (
                    <p className="text-bone-300" title={fullNumber(step.estimatedDamage)}>
                      {compactNumber(step.estimatedDamage)}
                    </p>
                  ) : (
                    step.side === 'ally' && <p className="text-bone-600">no damage</p>
                  )}
                  {step.currentSpAfter >= 0 && (
                    <p className="text-bone-600">
                      {step.spChange > 0 ? `+${step.spChange}` : step.spChange} SP → {step.currentSpAfter}
                    </p>
                  )}
                  {step.toughnessDamage > 0 && <p className="text-bone-600">−{step.toughnessDamage} toughness</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function withinBudget(cycles: number, limit: number | null): boolean {
  return limit === null || cycles <= limit;
}

function Metric({
  label,
  value,
  unit,
  tone
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'good' | 'danger';
}) {
  const color =
    tone === 'good' ? 'var(--color-good)' : tone === 'danger' ? 'var(--color-danger)' : 'var(--color-bone-100)';
  return (
    <div className="border-r border-ink-850 px-5 py-3 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 text-[22px] leading-none" style={{ color }}>
        {value}
        <span className="ml-1.5 text-[11px] text-bone-600">{unit}</span>
      </p>
    </div>
  );
}
