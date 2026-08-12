import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveHUDOverlay } from './components/LiveHUDOverlay';
import { TacticalInstructionGuide } from './components/TacticalInstructionGuide';
import { TeamBuilder } from './components/TeamBuilder';
import { BuildImportModal } from './components/BuildImportModal';
import { EndgameSelector } from './components/EndgameSelector';
import { PrydwenDatabase } from './components/PrydwenDatabase';

import type { EndgameMode, EndgameStage, TeamMemberConfig, SimulationResult, CharacterStats } from './types/hsr';
import { ENDGAME_STAGES_DATABASE } from './data/endgameStages';
import { CHARACTERS_DATABASE } from './data/characters';
import { runCombatSimulation } from './engine/combatPredictor';

export function App() {
  const [activeTab, setActiveTab] = useState<'live_hud' | 'predictor' | 'team_builder' | 'build_import' | 'endgame_db' | 'prydwen_db'>('live_hud');
  const [selectedMode, setSelectedMode] = useState<EndgameMode>('Memory of Chaos');
  const [selectedStage, setSelectedStage] = useState<EndgameStage>(ENDGAME_STAGES_DATABASE[0]);

  // Initial Team Configuration (Meta Firefly Super Break)
  const [team, setTeam] = useState<TeamMemberConfig[]>([
    {
      slot: 0,
      character: CHARACTERS_DATABASE.find(c => c.id === 'firefly')!,
      stats: { ...CHARACTERS_DATABASE.find(c => c.id === 'firefly')!.baseStats, spd: 154, breakEffect: 284.5, atk: 2680 },
      eidolon: 0,
      superimposition: 1,
      lightCone: 'Where Dreams Remain (S1)',
      relicSets: ['Iron Cavalry against the Scourge (4pc)'],
      planarSet: 'Forge of the Kalpagni Lantern (2pc)'
    },
    {
      slot: 1,
      character: CHARACTERS_DATABASE.find(c => c.id === 'harmony_mc')!,
      stats: { ...CHARACTERS_DATABASE.find(c => c.id === 'harmony_mc')!.baseStats, spd: 146, breakEffect: 210.0, hp: 3800 },
      eidolon: 6,
      superimposition: 5,
      lightCone: 'Memories of the Past (S5)',
      relicSets: ['Iron Cavalry against the Scourge (4pc)'],
      planarSet: 'Talia: Kingdom of Banditry (2pc)'
    },
    {
      slot: 2,
      character: CHARACTERS_DATABASE.find(c => c.id === 'ruan_mei')!,
      stats: { ...CHARACTERS_DATABASE.find(c => c.id === 'ruan_mei')!.baseStats, spd: 148, breakEffect: 182.4, hp: 4100 },
      eidolon: 0,
      superimposition: 1,
      lightCone: 'Past Self in Mirror (S1)',
      relicSets: ['Messenger Traversing Hackerspace (4pc)'],
      planarSet: 'Broken Keel (2pc)'
    },
    {
      slot: 3,
      character: CHARACTERS_DATABASE.find(c => c.id === 'aventurine')!,
      stats: { ...CHARACTERS_DATABASE.find(c => c.id === 'aventurine')!.baseStats, spd: 138, def: 4150, critDmg: 160.0 },
      eidolon: 0,
      superimposition: 1,
      lightCone: 'Inherently Unfair Fate (S1)',
      relicSets: ['Knight of Purity Palace (4pc)'],
      planarSet: 'Broken Keel (2pc)'
    }
  ]);

  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Sync selected stage when mode changes
  useEffect(() => {
    const matchingStage = ENDGAME_STAGES_DATABASE.find(s => s.mode === selectedMode);
    if (matchingStage) {
      setSelectedStage(matchingStage);
    }
  }, [selectedMode]);

  // Run combat simulation
  const handleRunSimulation = () => {
    const res = runCombatSimulation(team, selectedStage);
    setSimulationResult(res);
    setActiveTab('predictor');
  };

  // Apply imported build (Enka or OCR) to team slot
  const handleApplyBuildToTeam = (slot: number, updatedStats: CharacterStats, relics: string[], lightCone: string) => {
    setTeam(prev => {
      const copy = [...prev];
      if (copy[slot]) {
        copy[slot] = {
          ...copy[slot],
          stats: { ...updatedStats },
          relicSets: relics,
          lightCone
        };
      }
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
      />

      {/* Main App Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'live_hud' && (
          <LiveHUDOverlay onRunPredictor={handleRunSimulation} />
        )}

        {activeTab === 'predictor' && (
          <TacticalInstructionGuide
            result={simulationResult}
            onRunSimulation={handleRunSimulation}
          />
        )}

        {activeTab === 'team_builder' && (
          <TeamBuilder
            team={team}
            setTeam={setTeam}
          />
        )}

        {activeTab === 'build_import' && (
          <BuildImportModal
            team={team}
            onApplyBuildToTeam={handleApplyBuildToTeam}
          />
        )}

        {activeTab === 'endgame_db' && (
          <EndgameSelector
            selectedStage={selectedStage}
            setSelectedStage={setSelectedStage}
            selectedMode={selectedMode}
          />
        )}

        {activeTab === 'prydwen_db' && (
          <PrydwenDatabase />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <p>HSR Cycler • Endgame Combat Predictor & Live AV Instructor</p>
        <p className="text-[10px] text-slate-600 mt-1">Data reference: prydwen.gg/star-rail, enka.network, hsr.nanoka.cc</p>
      </footer>
    </div>
  );
}

export default App;
