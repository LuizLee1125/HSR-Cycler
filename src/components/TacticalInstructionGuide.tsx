import React from 'react';
import { Play, Zap, Award, ArrowUpRight } from 'lucide-react';
import type { SimulationResult, ActionType } from '../types/hsr';

interface TacticalInstructionGuideProps {
  result: SimulationResult | null;
  onRunSimulation: () => void;
}

export const TacticalInstructionGuide: React.FC<TacticalInstructionGuideProps> = ({
  result,
  onRunSimulation
}) => {
  if (!result) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center space-y-4 backdrop-blur-xl">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 mx-auto flex items-center justify-center">
          <Play className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-white font-mono">Endgame Combat Simulation Ready</h3>
          <p className="text-xs text-slate-400">
            Click "RUN PREDICTOR SIMULATION" to calculate turn-by-turn action values, SP trajectory, and generate optimal clear instructions.
          </p>
        </div>
        <button
          onClick={onRunSimulation}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
        >
          RUN PREDICTOR SIMULATION NOW
        </button>
      </div>
    );
  }

  const getActionBadgeColor = (action: ActionType) => {
    switch (action) {
      case 'Skill':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Ultimate':
        return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 animate-pulse';
      case 'Assist Skill':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Basic Attack':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Result Header Scoreboard */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              result.cleared ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-amber-500/20 border-amber-500 text-amber-400'
            }`}>
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-mono">
                  {result.cleared ? 'VICTORY PREDICTED (3-STAR CLEAR)' : 'PARTIAL CLEAR PREDICTED'}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  {result.winProbability}% Win Rate
                </span>
              </div>
              <p className="text-xs text-slate-400">Mode: {result.mode} • Calibrated for Prydwen & Nanoka.cc specs</p>
            </div>
          </div>

          <button
            onClick={onRunSimulation}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4" />
            <span>Recalculate Simulation</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Cycles Used</span>
            <span className="text-lg font-bold text-cyan-400">{result.cyclesUsed} / 10 Cycles</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Score / Result</span>
            <span className="text-lg font-bold text-amber-400">{result.scoreAchieved.toLocaleString()} Pts</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Total DMG Dealt</span>
            <span className="text-lg font-bold text-fuchsia-400">{(result.totalDamageDealt / 1000000).toFixed(2)}M</span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block uppercase">Total Action Turns</span>
            <span className="text-lg font-bold text-emerald-400">{result.instructions.length} Turns</span>
          </div>
        </div>
      </div>

      {/* Step-by-Step Chronological Turn Action Instructions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>STEP-BY-STEP CLEAR INSTRUCTIONS (AV TIMELINE)</span>
          </h3>
          <span className="text-xs text-slate-400">Chronological Action Log</span>
        </div>

        <div className="space-y-3">
          {result.instructions.map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all space-y-2 ${
                step.isUltQueued
                  ? 'bg-fuchsia-950/20 border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-900 text-cyan-400 rounded border border-slate-800 font-bold">
                    Turn {step.turnNumber} (AV {step.avTimestamp})
                  </span>
                  <span className="text-slate-400">Cycle {step.cycleNumber}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 font-bold rounded border uppercase ${getActionBadgeColor(step.actionType)}`}>
                    {step.actionType}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${step.spChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {step.spChange > 0 ? `+${step.spChange} SP` : step.spChange < 0 ? `${step.spChange} SP` : '0 SP'} ({step.currentSpAfter} Total)
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <img src={step.characterIcon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80'} alt="" className="w-9 h-9 rounded-lg border border-slate-700 object-cover" />
                  <div>
                    <span className="font-bold text-white text-sm">{step.characterName}</span>
                    <div className="text-slate-400 text-[11px]">
                      Target: <strong className="text-cyan-300">{step.targetName}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="text-emerald-400 font-bold">+{step.estimatedDamage.toLocaleString()} DMG</div>
                  <div className="text-slate-500 text-[10px]">Toughness -{step.toughnessDamage}</div>
                </div>
              </div>

              {/* Strategic Rationale */}
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans flex items-start gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>{step.recommendationReason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
