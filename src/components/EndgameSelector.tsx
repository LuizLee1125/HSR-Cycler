import React from 'react';
import { Shield, Zap } from 'lucide-react';
import type { EndgameStage, EndgameMode } from '../types/hsr';
import { ENDGAME_STAGES_DATABASE } from '../data/endgameStages';

interface EndgameSelectorProps {
  selectedStage: EndgameStage;
  setSelectedStage: (stage: EndgameStage) => void;
  selectedMode: EndgameMode;
}

export const EndgameSelector: React.FC<EndgameSelectorProps> = ({
  selectedStage,
  setSelectedStage,
  selectedMode
}) => {
  const filteredStages = ENDGAME_STAGES_DATABASE.filter(s => s.mode === selectedMode);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Endgame Stage Database (Nanoka.cc)</h2>
            <p className="text-xs text-slate-400">Select active endgame cycle to inspect enemy HP, Speed, Toughness & Turbulence buffs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStages.map((stage) => (
          <div
            key={stage.id}
            onClick={() => setSelectedStage(stage)}
            className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-4 ${
              selectedStage.id === stage.id
                ? 'bg-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono">{stage.mode}</span>
                <h3 className="text-base font-bold text-white">{stage.stageName}</h3>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg">
                {stage.maxCycles} Cycles Max
              </span>
            </div>

            {/* Turbulence Banner */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{stage.turbulence.name}</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{stage.turbulence.description}</p>
            </div>

            {/* Enemy Waves Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enemy Wave Lineup</span>
              {stage.waves.map((wave) => (
                <div key={wave.waveIndex} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1">
                  <div className="font-bold text-slate-300 font-mono text-[11px]">{wave.name}</div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                    {wave.enemies.map(e => (
                      <span key={e.id} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {e.name} (<strong className="text-emerald-400">{(e.hp / 1000000).toFixed(2)}M HP</strong>, SPD {e.speed}, Toughness {e.toughness})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
