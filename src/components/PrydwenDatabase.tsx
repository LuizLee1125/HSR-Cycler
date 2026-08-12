import React, { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { CHARACTERS_DATABASE } from '../data/characters';

export const PrydwenDatabase: React.FC = () => {
  const [selectedCharId, setSelectedCharId] = useState(CHARACTERS_DATABASE[0].id);
  const character = CHARACTERS_DATABASE.find(c => c.id === selectedCharId) || CHARACTERS_DATABASE[0];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Prydwen.gg Character Database & Relic Builds</h2>
            <p className="text-xs text-slate-400">Innate stats, trace bonuses, DMG multipliers, relic benchmarks, and optimal team compositions</p>
          </div>
        </div>
      </div>

      {/* Character Tabs Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CHARACTERS_DATABASE.map(char => (
          <button
            key={char.id}
            onClick={() => setSelectedCharId(char.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
              selectedCharId === char.id
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <img src={char.icon} alt="" className="w-5 h-5 rounded-full object-cover" />
            <span>{char.name}</span>
          </button>
        ))}
      </div>

      {/* Detailed Character Kit & Build Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Kit Overview & Base Stats (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur-xl">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
            <img src={character.icon} alt={character.name} className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover shadow-lg" />
            <div>
              <h3 className="text-xl font-bold text-white">{character.name}</h3>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mt-0.5">
                <span>{character.element}</span>
                <span>•</span>
                <span>{character.path}</span>
                <span>•</span>
                <span className="text-amber-400">5★ Rarity</span>
              </div>
            </div>
          </div>

          {/* Innate Base Stats */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Innate Base Stats (Lv. 80)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BASE HP</span>
                <strong className="text-white">{character.baseStats.hp}</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BASE ATK</span>
                <strong className="text-white">{character.baseStats.atk}</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BASE DEF</span>
                <strong className="text-white">{character.baseStats.def}</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">BASE SPD</span>
                <strong className="text-cyan-400">{character.baseStats.spd}</strong>
              </div>
            </div>
          </div>

          {/* Skill & Ult Description */}
          <div className="space-y-3 border-t border-slate-800 pt-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-amber-400 block text-[11px]">SKILL: {character.skillDescription}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-fuchsia-400 block text-[11px]">ULTIMATE: {character.ultDescription}</span>
            </div>
          </div>
        </div>

        {/* Right Card: Prydwen Relic Recommendations & Teams (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 backdrop-blur-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>Prydwen Build Benchmarks & Best Teams</span>
            </h3>
          </div>

          {/* Relics & Planar Sets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-cyan-400 uppercase">Best Relic Sets</span>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {character.prydwenInfo.bestRelicSets.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-fuchsia-400 uppercase">Best Planar Ornaments</span>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {character.prydwenInfo.bestPlanarSets.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main Stats & Substats Priority */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase">Recommended Main Stats</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">Body: <strong className="text-white">{character.prydwenInfo.mainStats.body}</strong></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">Feet: <strong className="text-white">{character.prydwenInfo.mainStats.feet}</strong></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">Sphere: <strong className="text-white">{character.prydwenInfo.mainStats.sphere}</strong></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">Rope: <strong className="text-white">{character.prydwenInfo.mainStats.rope}</strong></div>
            </div>
          </div>

          {/* Best Teams */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase">Optimal Team Compositions</span>
            {character.prydwenInfo.bestTeams.map((team, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{team.name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded">{team.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono text-[11px]">Teammates:</span>
                  <div className="flex items-center gap-1">
                    {team.teammates.map((t, i) => (
                      <span key={i} className="bg-slate-900 px-2 py-0.5 rounded text-white font-semibold border border-slate-800">{t}</span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{team.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
