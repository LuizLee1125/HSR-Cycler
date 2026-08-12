import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { HSRCharacter, StageBuff, TeamMemberConfig, TeamSlot } from '../types/hsr';
import { CHARACTERS } from '../data/characters';
import { slotConflict } from '../data/roster';
import { conditionalTotals } from '../data/gear';
import { SKILL_SLOT_LABEL, isImported, levelOf, skillSlotsOf } from '../data/team';
import { abilityDamage, buffInputs, calculateBaseAV } from '../engine/hsrMechanics';
import { BuildCardImport } from './BuildCardImport';
import { Modal } from './Modal';
import { ELEMENT_COLOR, PATH_ABBREVIATION, fullNumber } from '../ui/format';

interface TeamBuilderProps {
  team: TeamSlot[];
  onChange: (team: TeamSlot[]) => void;
  buff: StageBuff | null;
}

export function TeamBuilder({ team, onChange, buff }: TeamBuilderProps) {
  const [picking, setPicking] = useState<number | null>(null);
  const [importing, setImporting] = useState<number | null>(null);

  const setSlot = (index: number, value: TeamSlot) => {
    const next = [...team];
    next[index] = value;
    onChange(next);
  };

  const importingSlot = importing === null ? null : team[importing];
  const ready = team.filter(isImported) as TeamMemberConfig[];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <SlotCard
            key={index}
            index={index}
            slot={team[index]}
            onPick={() => setPicking(index)}
            onImport={() => setImporting(index)}
            onClear={() => setSlot(index, null)}
          />
        ))}
      </div>

      {ready.length === 4 ? (
        <CombatStats team={ready} buff={buff} />
      ) : (
        <div className="panel px-6 py-10 text-center">
          <p className="text-[14px] text-bone-300">
            {team.filter(Boolean).length} of 4 slots filled · {ready.length} with an imported build
          </p>
          <p className="mx-auto mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-bone-600">
            Combat stats appear once all four slots hold a build imported from a card. Nothing is assumed on your
            behalf — the predictor stays locked until it has your real numbers.
          </p>
        </div>
      )}

      {picking !== null && (
        <CharacterPicker
          team={team}
          slot={picking}
          onClose={() => setPicking(null)}
          onSelect={(character) => {
            setSlot(picking, { slot: picking, character });
            setPicking(null);
            setImporting(picking);
          }}
        />
      )}

      {importing !== null && importingSlot && (
        <BuildCardImport
          character={importingSlot.character}
          slot={importing}
          onCancel={() => setImporting(null)}
          onApply={(member) => {
            setSlot(importing, member);
            setImporting(null);
          }}
          onSwitchCharacter={(character) => {
            // Only allowed if that character is not already fielded elsewhere.
            if (slotConflict(team, character, importing)) return;
            setSlot(importing, { slot: importing, character });
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Slots
 * ------------------------------------------------------------------ */

interface SlotCardProps {
  index: number;
  slot: TeamSlot;
  onPick: () => void;
  onImport: () => void;
  onClear: () => void;
}

function SlotCard({ index, slot, onPick, onImport, onClear }: SlotCardProps) {
  if (!slot) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={`Choose a character for slot ${index + 1}`}
        className="panel flex h-[104px] w-full flex-col items-center justify-center gap-1.5 text-bone-600 transition-colors hover:border-ink-700 hover:text-bone-300"
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} />
        <span className="text-[12px]">Slot {index + 1}</span>
      </button>
    );
  }

  const imported = isImported(slot);
  const { character } = slot;

  return (
    <div className="panel flex h-[104px] flex-col justify-between p-3">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onPick} className="shrink-0" aria-label={`Replace ${character.name}`}>
          <img src={character.icon} alt="" className="h-11 w-11 rounded-sharp bg-ink-850 object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-bone-100">{character.name}</p>
          <p className="readout truncate text-[11px] text-bone-600">
            <span style={{ color: ELEMENT_COLOR[character.element] }}>{character.element}</span> ·{' '}
            {PATH_ABBREVIATION[character.path]}
            {imported && ` · SPD ${slot.stats.spd}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear slot ${index + 1}`}
          className="shrink-0 text-bone-600 hover:text-bone-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onImport}
        className={`w-full rounded-sharp border px-2 py-1 text-[11.5px] transition-colors ${
          imported
            ? 'border-ink-800 text-bone-500 hover:text-bone-300'
            : 'border-signal-dim text-bone-100 hover:bg-ink-850'
        }`}
      >
        {imported ? 'Re-import build card' : 'Import build card'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Picker
 * ------------------------------------------------------------------ */

function CharacterPicker({
  team,
  slot,
  onClose,
  onSelect
}: {
  team: TeamSlot[];
  slot: number;
  onClose: () => void;
  onSelect: (character: HSRCharacter) => void;
}) {
  const [query, setQuery] = useState('');

  const roster = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? CHARACTERS.filter((character) =>
          [character.name, character.element, character.path].join(' ').toLowerCase().includes(needle)
        )
      : CHARACTERS;
    // A character already fielded — or a second Trailblazer — stays visible but
    // greyed out, so the reason is obvious rather than the entry just missing.
    return matches.map((character) => ({ character, conflict: slotConflict(team, character, slot) }));
  }, [query, team, slot]);

  return (
    <Modal onClose={onClose} labelledBy="picker-title" className="max-w-2xl">
      <div className="rule flex items-center gap-3 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-bone-600" strokeWidth={1.75} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, element or Path"
          aria-label="Search characters"
          className="flex-1 bg-transparent text-[13px] text-bone-100 outline-none placeholder:text-bone-600"
        />
        <span id="picker-title" className="sr-only">
          Choose a character for slot {slot + 1}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="text-bone-600 hover:text-bone-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid max-h-[60vh] grid-cols-3 gap-1.5 overflow-y-auto p-3 sm:grid-cols-5 lg:grid-cols-7">
        {roster.map(({ character, conflict }) => (
          <button
            key={character.id}
            type="button"
            disabled={Boolean(conflict)}
            title={conflict ?? `${character.name} · ${character.element} · ${character.path}`}
            onClick={() => onSelect(character)}
            className={`rounded-sharp border border-transparent p-1.5 transition-colors ${
              conflict
                ? 'cursor-not-allowed opacity-30 grayscale'
                : 'hover:border-ink-700 hover:bg-ink-850'
            }`}
          >
            <img
              src={character.icon}
              alt=""
              loading="lazy"
              className="mx-auto h-10 w-10 rounded-sharp bg-ink-850"
            />
            <span className="mt-1 block truncate text-[10.5px] text-bone-500">{character.name}</span>
          </button>
        ))}
        {!roster.length && (
          <p className="col-span-full py-8 text-center text-[12.5px] text-bone-600">Nobody matches "{query}".</p>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ *
 * Combat stats — what each character actually brings into the fight
 * ------------------------------------------------------------------ */

function CombatStats({ team, buff }: { team: TeamMemberConfig[]; buff: StageBuff | null }) {
  const mods = buffInputs(buff?.effects);

  return (
    <div className="panel overflow-hidden">
      <div className="rule flex flex-wrap items-baseline justify-between gap-3 px-5 py-2.5">
        <p className="eyebrow">Stats during combat</p>
        <p className="text-[11px] text-bone-600">
          {buff ? `Imported values with ${buff.name} and gear applied` : 'Imported values with gear applied'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-[12.5px]">
          <thead>
            <tr className="text-left text-bone-600">
              <th className="px-5 py-2 font-medium">Character</th>
              <th className="px-3 py-2 text-right font-medium">HP</th>
              <th className="px-3 py-2 text-right font-medium">ATK</th>
              <th className="px-3 py-2 text-right font-medium">DEF</th>
              <th className="px-3 py-2 text-right font-medium">SPD</th>
              <th className="px-3 py-2 text-right font-medium">AV</th>
              <th className="px-3 py-2 text-right font-medium">CRIT</th>
              <th className="px-3 py-2 text-right font-medium">DMG</th>
              <th className="px-5 py-2 font-medium">Gear &amp; ability levels</th>
            </tr>
          </thead>
          <tbody>
            {team.map((member) => {
              const gear = conditionalTotals(member.gear);
              const spd = member.stats.spd * mods.spdMultiplier * (1 + (gear.spdPercent ?? 0) / 100);
              const atk = member.stats.atk * (1 + (gear.atk ?? 0) / 100);
              const damage = abilityDamage(member.character.skills.skill, member.skillLevels);

              return (
                <tr key={member.slot} className="border-t border-ink-850 align-top">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={member.character.icon}
                        alt=""
                        loading="lazy"
                        className="h-7 w-7 shrink-0 rounded-sharp bg-ink-850"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-bone-100">{member.character.name}</p>
                        <p className="readout text-[11px] text-bone-600">
                          Lv.{member.level} · E{member.eidolon} ·{' '}
                          {damage.dealsDamage
                            ? `${Math.round(damage.main * 100)}% ${damage.stat.toUpperCase()}`
                            : 'no direct damage'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="readout px-3 py-2.5 text-right text-bone-300">{fullNumber(member.stats.hp)}</td>
                  <td className="readout px-3 py-2.5 text-right text-bone-100">{fullNumber(atk)}</td>
                  <td className="readout px-3 py-2.5 text-right text-bone-300">{fullNumber(member.stats.def)}</td>
                  <td className="readout px-3 py-2.5 text-right text-bone-100">{spd.toFixed(1)}</td>
                  <td className="readout px-3 py-2.5 text-right text-bone-300">{calculateBaseAV(spd).toFixed(1)}</td>
                  <td className="readout px-3 py-2.5 text-right text-bone-300">
                    {member.stats.critRate.toFixed(1)}/
                    {(member.stats.critDmg + mods.critDmgBonus + (gear.critDmg ?? 0)).toFixed(1)}
                  </td>
                  <td className="readout px-3 py-2.5 text-right text-bone-300">
                    {(member.stats.dmgBonus + mods.dmgBonusExtra + (gear.dmgBonus ?? 0)).toFixed(1)}%
                  </td>
                  <td className="px-5 py-2.5">
                    <p className="text-[11.5px] text-bone-500">
                      {member.gear.lightCone
                        ? `${member.gear.lightCone} S${member.gear.superimposition}`
                        : 'no Light Cone'}
                      {member.gear.relicSets.map((set) => ` · ${set.pieces}pc ${set.name}`).join('')}
                      {member.gear.planarSet ? ` · ${member.gear.planarSet}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      {skillSlotsOf(member.character).map((abilitySlot) => (
                        <span key={abilitySlot} className="readout text-[11px] text-bone-500">
                          {SKILL_SLOT_LABEL[abilitySlot].replace('Memosprite ', 'Memo ')}{' '}
                          <span className="text-bone-100">
                            {levelOf(member.character.skills[abilitySlot], member.skillLevels)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
