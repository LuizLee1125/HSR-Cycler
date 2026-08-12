import React, { useState } from 'react';
import { Users, Sliders } from 'lucide-react';
import type { TeamMemberConfig, HSRCharacter } from '../types/hsr';
import { CHARACTERS_DATABASE } from '../data/characters';

interface TeamBuilderProps {
  team: TeamMemberConfig[];
  setTeam: React.Dispatch<React.SetStateAction<TeamMemberConfig[]>>;
}

export const TeamBuilder: React.FC<TeamBuilderProps> = ({ team, setTeam }) => {
  const [selectedSlot, setSelectedSlot] = useState(0);

  const handleSelectCharacter = (slot: number, char: HSRCharacter) => {
    const updated = [...team];
    updated[slot] = {
      slot,
      character: char,
      stats: { ...char.baseStats },
      eidolon: 0,
      superimposition: 1,
      lightCone: char.defaultLightCone,
      relicSets: char.defaultRelics,
      planarSet: char.prydwenInfo.bestPlanarSets[0] || 'Broken Keel'
    };
    setTeam(updated);
  };

  const handleLoadPresetTeam = (presetName: string) => {
    let newTeam: HSRCharacter[] = [];
    if (presetName === 'super_break') {
      newTeam = [
        CHARACTERS_DATABASE.find(c => c.id === 'firefly')!,
        CHARACTERS_DATABASE.find(c => c.id === 'harmony_mc')!,
        CHARACTERS_DATABASE.find(c => c.id === 'ruan_mei')!,
        CHARACTERS_DATABASE.find(c => c.id === 'aventurine')!
      ];
    } else if (presetName === 'acheron_nuke') {
      newTeam = [
        CHARACTERS_DATABASE.find(c => c.id === 'acheron')!,
        CHARACTERS_DATABASE.find(c => c.id === 'sparkle')!,
        CHARACTERS_DATABASE.find(c => c.id === 'ruan_mei')!,
        CHARACTERS_DATABASE.find(c => c.id === 'aventurine')!
      ];
    } else if (presetName === 'feixiao_fua') {
      newTeam = [
        CHARACTERS_DATABASE.find(c => c.id === 'feixiao')!,
        CHARACTERS_DATABASE.find(c => c.id === 'robin')!,
        CHARACTERS_DATABASE.find(c => c.id === 'sparkle')!,
        CHARACTERS_DATABASE.find(c => c.id === 'aventurine')!
      ];
    }

    if (newTeam.length === 4) {
      setTeam(newTeam.map((char, slot) => ({
        slot,
        character: char,
        stats: { ...char.baseStats },
        eidolon: 0,
        superimposition: 1,
        lightCone: char.defaultLightCone,
        relicSets: char.defaultRelics,
        planarSet: char.prydwenInfo.bestPlanarSets[0] || 'Broken Keel'
      })));
    }
  };

  const activeMember = team[selectedSlot];

  return (
    <div className="space-y-6">
      {/* Top Presets Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-lg font-bold text-white font-mono">Prydwen Best Teams Presets</h2>
            <p className="text-xs text-slate-400">Load meta endgame synergy teams calibrated for S+ tier clears</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleLoadPresetTeam('super_break')}
            className="px-3 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all"
          >
            🔥 Firefly Super Break
          </button>
          <button
            onClick={() => handleLoadPresetTeam('acheron_nuke')}
            className="px-3 py-1.5 text-xs font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30 rounded-lg hover:bg-fuchsia-500/20 transition-all"
          >
            ⚡ Acheron Hyper Nuke
          </button>
          <button
            onClick={() => handleLoadPresetTeam('feixiao_fua')}
            className="px-3 py-1.5 text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
          >
            🌪️ Feixiao Follow-Up
          </button>
        </div>
      </div>

      {/* 4 Team Member Slots Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {team.map((member, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedSlot(idx)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedSlot === idx
                ? 'bg-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-[10px] font-extrabold font-mono text-cyan-400 uppercase">SLOT {idx + 1}</span>
              <span className="text-[10px] text-slate-500">{member.character.path}</span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={member.character.icon}
                alt={member.character.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <h3 className="font-bold text-white text-sm">{member.character.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>SPD {member.stats.spd}</span>
                  <span>•</span>
                  <span>E{member.eidolon} S{member.superimposition}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Character Selector & Stat Tuner Panel */}
      {activeMember && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Configure Slot {selectedSlot + 1}: {activeMember.character.name}</span>
            </h3>
            <span className="text-xs text-slate-400">Prydwen Recommended Build Loaded</span>
          </div>

          {/* Character Library Selector Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Switch Character</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {CHARACTERS_DATABASE.map(char => (
                <button
                  key={char.id}
                  onClick={() => handleSelectCharacter(selectedSlot, char)}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    activeMember.character.id === char.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <img src={char.icon} alt={char.name} className="w-8 h-8 rounded-lg mb-1 object-cover mx-auto" />
                  <div className="text-[10px] font-bold text-center truncate">{char.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stat Customizer Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">SPD (Speed)</label>
              <input
                type="number"
                value={activeMember.stats.spd}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 100;
                  const updated = [...team];
                  updated[selectedSlot].stats.spd = val;
                  setTeam(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-cyan-400 font-mono p-2 rounded-lg"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">CRIT Rate (%)</label>
              <input
                type="number"
                value={activeMember.stats.critRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const updated = [...team];
                  updated[selectedSlot].stats.critRate = val;
                  setTeam(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-mono p-2 rounded-lg"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">CRIT DMG (%)</label>
              <input
                type="number"
                value={activeMember.stats.critDmg}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const updated = [...team];
                  updated[selectedSlot].stats.critDmg = val;
                  setTeam(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-mono p-2 rounded-lg"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Break Effect (%)</label>
              <input
                type="number"
                value={activeMember.stats.breakEffect}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const updated = [...team];
                  updated[selectedSlot].stats.breakEffect = val;
                  setTeam(updated);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-fuchsia-400 font-mono p-2 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
