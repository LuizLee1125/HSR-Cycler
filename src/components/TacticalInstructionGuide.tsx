import type { ActionType, SimulationResult } from '../types/hsr';
import { compactNumber, fullNumber } from '../ui/format';

interface TacticalInstructionGuideProps {
  result: SimulationResult | null;
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

export function TacticalInstructionGuide({ result, onRunSimulation }: TacticalInstructionGuideProps) {
  if (!result) {
    return (
      <div className="panel px-6 py-14 text-center">
        <p className="text-[15px] text-bone-300">No plan yet.</p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-bone-600">
          Pick a stage, set your team's stats, then run the predictor to get a turn-by-turn order with Action
          Values, Skill Point balance and break windows.
        </p>
        <button type="button" onClick={onRunSimulation} className="btn btn-primary mt-5">
          Run predictor
        </button>
      </div>
    );
  }

  const cycleUse = Math.min(1, result.cyclesUsed / Math.max(1, result.cycleLimit));

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="rule flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-bone-100">Rotation plan</p>
            <p className="mt-0.5 text-[12.5px] text-bone-500">
              {result.stageName} · node {result.nodeIndex + 1} · {result.mode}
            </p>
          </div>
          <button type="button" onClick={onRunSimulation} className="btn">
            Recalculate
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4">
          <Metric label="Cycles planned" value={`${result.cyclesUsed} / ${result.cycleLimit}`} />
          <Metric
            label="Weakness coverage"
            value={`${result.breakableEnemies} / ${result.totalEnemies}`}
            tone={
              result.totalEnemies && result.breakableEnemies === result.totalEnemies
                ? 'good'
                : result.breakableEnemies === 0
                  ? 'danger'
                  : undefined
            }
          />
          <Metric label="Breaks in rotation" value={String(result.breaksAchieved)} />
          <Metric
            label="SP-starved turns"
            value={String(result.spStarvedTurns)}
            tone={result.spStarvedTurns > 2 ? 'danger' : undefined}
          />
        </div>

        <div className="h-0.5 w-full bg-ink-850">
          <div className="h-full" style={{ width: `${cycleUse * 100}%`, background: 'var(--color-signal-dim)' }} />
        </div>

        <p className="border-t border-ink-850 px-5 py-2.5 text-[11.5px] leading-relaxed text-bone-600">
          Turn order, Action Values, Skill Point economy and break timing come from the stage's real enemy data.
          Damage is a kit-agnostic estimate of {compactNumber(result.estimatedDamage)} — it does not model
          character-specific multipliers, buffs, follow-up attacks or memosprites, so treat it as a floor for
          comparing builds, not a clear prediction.
        </p>
      </div>

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
          <p className="text-[11px] text-bone-600">Action Value timeline</p>
        </div>

        <ol>
          {result.instructions.map((step, index) => (
            <li key={index} className="border-t border-ink-850 first:border-t-0">
              <div className="flex gap-4 px-5 py-3">
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
                    <span className="text-bone-100">{step.characterName}</span>
                    <span style={{ color: ACTION_COLOR[step.actionType] }}>{step.actionType}</span>
                    {step.targetName && <span className="text-bone-600">→ {step.targetName}</span>}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-bone-500">{step.recommendationReason}</p>
                </div>

                <div className="readout w-28 shrink-0 text-right text-[11.5px]">
                  {step.estimatedDamage > 0 && (
                    <p className="text-bone-300" title={fullNumber(step.estimatedDamage)}>
                      {compactNumber(step.estimatedDamage)}
                    </p>
                  )}
                  <p className="text-bone-600">
                    {step.spChange > 0 ? `+${step.spChange}` : step.spChange} SP → {step.currentSpAfter}
                  </p>
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

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'danger' }) {
  const color =
    tone === 'good' ? 'var(--color-good)' : tone === 'danger' ? 'var(--color-danger)' : 'var(--color-bone-100)';
  return (
    <div className="border-r border-ink-850 px-5 py-3 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 text-[16px]" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
