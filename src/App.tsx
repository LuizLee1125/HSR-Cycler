import { useEffect, useMemo, useState } from 'react';
import type { SectionId } from './components/Shell';
import { Shell } from './components/Shell';
import { TacticalInstructionGuide } from './components/TacticalInstructionGuide';
import { TeamBuilder } from './components/TeamBuilder';
import { EndgameSelector } from './components/EndgameSelector';
import { PrydwenDatabase } from './components/PrydwenDatabase';

import type { EndgameMode, EndgameStage, SimulationResult, StageBuff, TeamSlot } from './types/hsr';
import { ENDGAME_DB, findSeason, hasStarward, latestSeason, stagesFor } from './data/endgameStages';
import { emptyTeam, isImported, isTeamReady } from './data/team';
import { runCombatSimulation } from './engine/combatPredictor';

const SECTION_COPY: Record<SectionId, { title: string; subtitle: string }> = {
  stages: { title: 'Stages', subtitle: 'Nodes, waves and enemy stats for the live rotation' },
  team: { title: 'Team', subtitle: 'Four slots, filled from your own build cards' },
  plan: { title: 'Prediction', subtitle: 'Cycle range, turn order and the live read on your game window' },
  codex: { title: 'Characters', subtitle: 'Builds, relics and the teams people are clearing with' }
};

export function App() {
  const [section, setSection] = useState<SectionId>('stages');
  const [mode, setMode] = useState<EndgameMode>(ENDGAME_DB.modes[0]?.mode ?? 'Memory of Chaos');
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [starward, setStarward] = useState(false);
  const [stage, setStage] = useState<EndgameStage | null>(null);
  const [buff, setBuff] = useState<StageBuff | null>(null);
  // Four empty slots. Nothing is preset — a slot only becomes usable once a
  // build card has been imported into it.
  const [team, setTeam] = useState<TeamSlot[]>(emptyTeam);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const season = useMemo(() => findSeason(mode, seasonId), [mode, seasonId]);
  const starwardAvailable = hasStarward(season);

  // Changing mode drops the chosen rotation back to the current one.
  useEffect(() => {
    setSeasonId(latestSeason(mode).seasonId);
  }, [mode]);

  // Mode, rotation or difficulty all invalidate the stage, buff and plan.
  useEffect(() => {
    setStage(stagesFor(season, starward && hasStarward(season)).at(-1) ?? null);
    setBuff(null);
    setResult(null);
  }, [season, starward]);

  const needsBuff = season.buffChoices.length > 0 && !buff;
  const ready = isTeamReady(team) && !needsBuff && Boolean(stage);

  const runSimulation = () => {
    if (!stage || !isTeamReady(team) || needsBuff) return;
    setResult(runCombatSimulation(team, stage, mode, { buff }));
    setSection('plan');
  };

  const teamNames = useMemo(
    () => team.map((slot) => (slot ? slot.character.name : '')).filter(Boolean),
    [team]
  );
  const teamIds = useMemo(
    () => team.map((slot) => (slot ? slot.character.id : '')).filter(Boolean),
    [team]
  );

  const copy = SECTION_COPY[section];
  const subtitle = useMemo(() => {
    if (section === 'stages' || section === 'plan') {
      return stage ? `${stage.name} · ${season.seasonName}` : copy.subtitle;
    }
    if (section === 'team') {
      return `${team.filter(isImported).length} of 4 builds imported`;
    }
    return copy.subtitle;
  }, [section, stage, season, team, copy.subtitle]);

  return (
    <Shell
      section={section}
      onSection={setSection}
      mode={mode}
      onMode={setMode}
      season={season}
      onSeason={setSeasonId}
      starward={starward}
      onStarward={setStarward}
      starwardAvailable={starwardAvailable}
      title={copy.title}
      subtitle={subtitle}
      actions={
        <div className="flex items-center gap-3">
          {!ready && (
            <span className="text-[11.5px] text-bone-600">
              {needsBuff ? 'Pick a stage buff first' : 'Import four build cards first'}
            </span>
          )}
          <button
            type="button"
            onClick={runSimulation}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!ready}
          >
            Run predictor
          </button>
        </div>
      }
    >
      {section === 'stages' && (
        <EndgameSelector
          season={season}
          starward={starward && starwardAvailable}
          selectedStage={stage}
          onSelectStage={setStage}
          buff={buff}
          onSelectBuff={setBuff}
        />
      )}
      {section === 'team' && <TeamBuilder team={team} onChange={setTeam} buff={buff} />}
      {section === 'plan' && (
        <TacticalInstructionGuide
          result={result}
          teamIds={teamIds}
          teamNames={teamNames}
          ready={ready}
          onRunSimulation={runSimulation}
        />
      )}
      {section === 'codex' && <PrydwenDatabase />}
    </Shell>
  );
}

export default App;
