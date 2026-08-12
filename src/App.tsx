import { useEffect, useMemo, useState } from 'react';
import type { SectionId } from './components/Shell';
import { Shell } from './components/Shell';
import { LiveHUDOverlay } from './components/LiveHUDOverlay';
import { TacticalInstructionGuide } from './components/TacticalInstructionGuide';
import { TeamBuilder } from './components/TeamBuilder';
import { BuildImportModal } from './components/BuildImportModal';
import { EndgameSelector } from './components/EndgameSelector';
import { PrydwenDatabase } from './components/PrydwenDatabase';

import type { CharacterStats, EndgameMode, EndgameStage, SimulationResult, TeamMemberConfig } from './types/hsr';
import { ENDGAME_DB, getSeason } from './data/endgameStages';
import { CHARACTERS, getCharacter } from './data/characters';
import { makeMember } from './data/team';
import { runCombatSimulation } from './engine/combatPredictor';

const SECTION_COPY: Record<SectionId, { title: string; subtitle: string }> = {
  stages: { title: 'Stages', subtitle: 'Nodes, waves and enemy stats for the live rotation' },
  team: { title: 'Team', subtitle: 'Four slots, tuned to the stats your account actually has' },
  plan: { title: 'Turn plan', subtitle: 'Action Value order, Skill Point budget and break windows' },
  codex: { title: 'Characters', subtitle: 'Builds, relics and the teams people are clearing with' },
  import: { title: 'Import build', subtitle: 'Pull stats from Enka.network or a build card screenshot' },
  live: { title: 'Live capture', subtitle: 'Read the game window and call the next action' }
};

/**
 * Seeds the four slots from the most-played Memory of Chaos team in the
 * dataset, so a fresh launch shows something real rather than a placeholder.
 */
function defaultTeam(): TeamMemberConfig[] {
  let best: { rate: number; slugs: string[] } | null = null;
  for (const character of CHARACTERS) {
    for (const team of character.teams) {
      const rate = team.appearanceRate ?? 0;
      if (team.members.length === 4 && (!best || rate > best.rate)) {
        best = { rate, slugs: team.members.map((member) => member.slug) };
      }
    }
  }

  const roster = (best?.slugs ?? [])
    .map(getCharacter)
    .filter((character): character is NonNullable<typeof character> => Boolean(character));

  const fallback = CHARACTERS.slice(0, 4);
  return (roster.length === 4 ? roster : fallback).map((character, slot) => makeMember(character, slot));
}

export function App() {
  const [section, setSection] = useState<SectionId>('stages');
  const [mode, setMode] = useState<EndgameMode>(ENDGAME_DB.modes[0]?.mode ?? 'Memory of Chaos');
  const [stage, setStage] = useState<EndgameStage | null>(() => getSeason(mode).stages.at(-1) ?? null);
  const [team, setTeam] = useState<TeamMemberConfig[]>(defaultTeam);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Switching mode invalidates the stage selection.
  useEffect(() => {
    setStage(getSeason(mode).stages.at(-1) ?? null);
    setResult(null);
  }, [mode]);

  const runSimulation = () => {
    if (!stage) return;
    setResult(runCombatSimulation(team, stage, mode));
    setSection('plan');
  };

  const applyBuild = (slot: number, stats: CharacterStats, relicSets: string[], lightCone: string) => {
    setTeam((previous) =>
      previous.map((member, index) =>
        index === slot
          ? {
              ...member,
              stats,
              relicSets: relicSets.length ? relicSets : member.relicSets,
              lightCone: lightCone || member.lightCone
            }
          : member
      )
    );
  };

  const copy = SECTION_COPY[section];
  const subtitle = useMemo(() => {
    if (section === 'stages' || section === 'plan') {
      return stage ? `${stage.name} · ${getSeason(mode).seasonName}` : copy.subtitle;
    }
    return copy.subtitle;
  }, [section, stage, mode, copy.subtitle]);

  return (
    <Shell
      section={section}
      onSection={setSection}
      mode={mode}
      onMode={setMode}
      title={copy.title}
      subtitle={subtitle}
      actions={
        <button type="button" onClick={runSimulation} className="btn btn-primary" disabled={!stage}>
          Run predictor
        </button>
      }
    >
      {section === 'stages' && <EndgameSelector mode={mode} selectedStage={stage} onSelectStage={setStage} />}
      {section === 'team' && <TeamBuilder team={team} setTeam={setTeam} />}
      {section === 'plan' && <TacticalInstructionGuide result={result} onRunSimulation={runSimulation} />}
      {section === 'codex' && <PrydwenDatabase />}
      {section === 'import' && <BuildImportModal team={team} onApplyBuildToTeam={applyBuild} />}
      {section === 'live' && <LiveHUDOverlay onRunPredictor={runSimulation} />}
    </Shell>
  );
}

export default App;
