import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type {
  CharacterStats,
  EquippedGear,
  EquippedSet,
  HSRCharacter,
  OcrBuildParseResult,
  SkillLevels,
  TeamMemberConfig
} from '../types/hsr';
import { parseCharacterBuildImage } from '../parser/imageBuildParser';
import { getCharacter } from '../data/characters';
import { conditionalTotals, findLightCone, staticEffectsOf } from '../data/gear';
import { SKILL_SLOT_LABEL, defaultSkillLevels, skillSlotsOf } from '../data/team';
import { Modal } from './Modal';

interface BuildCardImportProps {
  character: HSRCharacter;
  slot: number;
  onCancel: () => void;
  onApply: (member: TeamMemberConfig) => void;
  /** Offered when the card turns out to be a different character. */
  onSwitchCharacter?: (character: HSRCharacter) => void;
}

const STAT_FIELDS: { key: keyof CharacterStats; label: string; suffix?: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'spd', label: 'SPD' },
  { key: 'critRate', label: 'CRIT Rate', suffix: '%' },
  { key: 'critDmg', label: 'CRIT DMG', suffix: '%' },
  { key: 'breakEffect', label: 'Break Effect', suffix: '%' },
  { key: 'energyRegen', label: 'Energy Regen', suffix: '%' },
  { key: 'effectHitRate', label: 'Effect Hit Rate', suffix: '%' },
  { key: 'dmgBonus', label: 'DMG Boost', suffix: '%' }
];

/**
 * Energy Regen is 100% on every character before gear, so a card that does not
 * print it is safe to default. Nothing else gets a default — an unread stat
 * stays zero and shows as unfilled until the user types it.
 */
const BLANK_STATS: CharacterStats = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  critRate: 0,
  critDmg: 0,
  breakEffect: 0,
  energyRegen: 100,
  effectHitRate: 0,
  dmgBonus: 0
};

const EFFECT_LABEL: Record<string, string> = {
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  critRate: 'CRIT Rate',
  critDmg: 'CRIT DMG',
  breakEffect: 'Break Effect',
  dmgBonus: 'DMG',
  resPen: 'RES PEN',
  defIgnore: 'DEF ignore',
  vulnerability: 'Vulnerability',
  spdPercent: 'SPD',
  effectHitRate: 'Effect Hit Rate',
  energyRegen: 'Energy Regen'
};

export function BuildCardImport({
  character,
  slot,
  onCancel,
  onApply,
  onSwitchCharacter
}: BuildCardImportProps) {
  const slots = useMemo(() => skillSlotsOf(character), [character]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<OcrBuildParseResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [stats, setStats] = useState<CharacterStats>(BLANK_STATS);
  const [skillLevels, setSkillLevels] = useState<SkillLevels>({});
  /** Which ability levels actually came off the card, vs. defaulted. */
  const [readLevels, setReadLevels] = useState<SkillLevels>({});
  const [level, setLevel] = useState(80);
  const [eidolon, setEidolon] = useState(0);
  const [gear, setGear] = useState<EquippedGear>({
    lightConeId: null,
    lightCone: '',
    superimposition: 1,
    relicSets: [],
    planarSet: ''
  });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  /** The card names someone other than the slot's character. */
  const wrongCharacter =
    parsed?.characterId && parsed.characterId !== character.id ? parsed : null;

  const readFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setPreview(URL.createObjectURL(file));

    try {
      const result = await parseCharacterBuildImage(file);
      setParsed(result);
      setStats({ ...BLANK_STATS, ...result.stats });
      // Ability levels that could not be read fall back to the trace ceiling —
      // the near-universal endgame case — but stay flagged as unread so the
      // field is visibly a default rather than something taken off the card.
      setSkillLevels({ ...defaultSkillLevels(character), ...result.skillLevels });
      setReadLevels(result.skillLevels);
      if (result.level) setLevel(result.level);
      if (result.eidolon !== null) setEidolon(result.eidolon);
      setGear({
        lightConeId: result.lightConeId,
        lightCone: result.lightCone ?? '',
        superimposition: result.superimposition ?? 1,
        relicSets: result.relicSets,
        planarSet: result.planarSet ?? ''
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  };

  const reset = () => {
    setParsed(null);
    setPreview(null);
    setStats(BLANK_STATS);
    setSkillLevels({});
    setReadLevels({});
    setGear({ lightConeId: null, lightCone: '', superimposition: 1, relicSets: [], planarSet: '' });
  };

  const cone = findLightCone(gear.lightConeId ?? gear.lightCone);
  const staticEffects = staticEffectsOf(gear);
  const conditional = conditionalTotals(gear);

  const unfilled = STAT_FIELDS.filter(({ key }) => !stats[key]).map(({ label }) => label);
  const canApply = stats.atk > 0 && stats.spd > 0 && stats.hp > 0 && !wrongCharacter;

  const apply = () => {
    onApply({
      slot,
      character,
      stats,
      skillLevels,
      level,
      eidolon,
      gear,
      importedAt: new Date().toISOString()
    });
  };

  return (
    <Modal onClose={onCancel} labelledBy="import-title">
      <div className="rule flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <img src={character.icon} alt="" className="h-9 w-9 rounded-sharp bg-ink-850" />
          <div>
            <p id="import-title" className="text-[14px] text-bone-100">
              Import {character.name}'s build card
            </p>
            <p className="text-[11.5px] text-bone-600">Enka.network card or Fribbels export — PNG, JPG or WebP</p>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="btn">
          Close
        </button>
      </div>

      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <label
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-sharp border border-dashed border-ink-700 px-4 py-8 text-center hover:border-ink-600"
          >
            <span className="text-[12.5px] text-bone-300">Drop the card here</span>
            <span className="text-[11.5px] text-bone-600">or click to choose a file</span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>

          {preview && (
            <img src={preview} alt="Imported build card" className="w-full rounded-sharp border border-ink-800" />
          )}
        </div>

        <div className="space-y-4">
          {busy && <p className="text-[12.5px] text-bone-500">Reading the card…</p>}

          {error && (
            <p className="panel-inset px-3 py-2 text-[12.5px]" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          {/* A card for the wrong character is blocked, not merely flagged —
              applying it would file someone else's numbers under this slot. */}
          {wrongCharacter && (
            <div className="panel-inset px-4 py-3" style={{ borderColor: 'var(--color-danger)' }}>
              <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>
                That card is {wrongCharacter.characterName}, not {character.name}.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-bone-500">
                Slot {slot + 1} holds {character.name}. Import {character.name}'s card instead, or move this slot
                over to {wrongCharacter.characterName}.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" onClick={reset} className="btn">
                  Choose a different card
                </button>
                {onSwitchCharacter && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const next = getCharacter(wrongCharacter.characterId ?? '');
                      if (next) onSwitchCharacter(next);
                    }}
                  >
                    Switch slot to {wrongCharacter.characterName}
                  </button>
                )}
              </div>
            </div>
          )}

          {parsed && !wrongCharacter && (
            <p className="text-[12px] text-bone-600">
              Read {Math.round(parsed.confidence * 100)}% of the expected fields
              {parsed.characterName ? ` · recognised as ${parsed.characterName}` : ''}
            </p>
          )}

          {!wrongCharacter &&
            parsed?.warnings.map((warning) => (
              <p key={warning} className="text-[12px] leading-relaxed" style={{ color: 'var(--color-signal)' }}>
                {warning}
              </p>
            ))}

          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
            {STAT_FIELDS.map(({ key, label, suffix }) => (
              <NumberField
                key={key}
                label={`${label}${suffix ?? ''}`}
                value={stats[key]}
                // SPD and the percentage stats are fractional on a build card.
                step={suffix === '%' || key === 'spd' ? 0.1 : 1}
                unfilled={!stats[key]}
                onChange={(value) => setStats({ ...stats, [key]: value })}
              />
            ))}
          </div>

          <div>
            <p className="eyebrow">Ability levels — these set every damage number</p>
            <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
              {slots.map((abilitySlot) => (
                <NumberField
                  key={abilitySlot}
                  label={SKILL_SLOT_LABEL[abilitySlot]}
                  value={skillLevels[abilitySlot] ?? 0}
                  min={1}
                  max={character.skills[abilitySlot]?.maxLevel ?? 15}
                  unfilled={readLevels[abilitySlot] === undefined}
                  onChange={(value) => setSkillLevels({ ...skillLevels, [abilitySlot]: value })}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
            <NumberField label="Level" value={level} max={80} onChange={setLevel} />
            <NumberField label="Eidolon" value={eidolon} max={6} onChange={setEidolon} />
            <NumberField
              label="Superimp."
              value={gear.superimposition}
              min={1}
              max={5}
              onChange={(value) => setGear({ ...gear, superimposition: value })}
            />
            <label className="block">
              <span className="eyebrow">Light Cone</span>
              <input
                value={gear.lightCone}
                onChange={(event) => {
                  const name = event.target.value;
                  setGear({ ...gear, lightCone: name, lightConeId: findLightCone(name)?.id ?? null });
                }}
                className="mt-1 w-full rounded-sharp border border-ink-800 bg-ink-850 px-2 py-1 text-[12.5px] text-bone-100 outline-none focus:border-ink-600"
              />
            </label>
          </div>

          <div className="panel-inset px-4 py-3">
            <p className="eyebrow">Gear read from the card</p>
            <dl className="mt-1.5 space-y-1 text-[12px]">
              <Row label="Light Cone">
                {cone ? `${cone.name} · S${gear.superimposition}` : gear.lightCone || 'not recognised'}
              </Row>
              <Row label="Relic sets">
                {gear.relicSets.length
                  ? gear.relicSets.map((set: EquippedSet) => `${set.pieces}pc ${set.name}`).join(' · ')
                  : 'none read'}
              </Row>
              <Row label="Planar">{gear.planarSet || 'none read'}</Row>
            </dl>

            {staticEffects.length > 0 && (
              <p className="mt-2 text-[11.5px] leading-relaxed text-bone-600">
                Already in the stats above:{' '}
                {staticEffects.map((effect) => `+${effect.value}% ${EFFECT_LABEL[effect.key]}`).join(', ')}. These
                are not applied a second time.
              </p>
            )}
            {parsed && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11.5px] text-bone-600 hover:text-bone-300">
                  What the reader saw
                </summary>
                <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-sharp bg-ink-950 p-2 text-[10.5px] leading-relaxed text-bone-500">
                  {parsed.rawText.trim() || '(no text recognised)'}
                </pre>
              </details>
            )}

            {Object.keys(conditional).length > 0 && (
              <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: 'var(--color-signal)' }}>
                Applied on top by the predictor:{' '}
                {Object.entries(conditional)
                  .map(([key, value]) => `+${Math.round(value)}% ${EFFECT_LABEL[key] ?? key}`)
                  .join(', ')}
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 px-5 py-3.5">
        <p className="text-[12px] text-bone-600">
          {wrongCharacter
            ? 'Import a card for this slot’s character to continue.'
            : canApply
              ? unfilled.length
                ? `${unfilled.length} field(s) still unread — the plan will treat them as zero.`
                : 'Every field the predictor needs is filled.'
              : 'HP, ATK and SPD are required before this build can be used.'}
        </p>
        <button type="button" onClick={apply} disabled={!canApply} className="btn btn-primary">
          Use this build
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-bone-600">{label}</dt>
      <dd className="min-w-0 flex-1 text-bone-300">{children}</dd>
    </div>
  );
}

/**
 * A numeric field that cannot go below its floor. The spinner used to walk
 * stats into negative numbers, which the damage pipeline then happily used.
 */
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unfilled
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unfilled?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        // A real step keeps the spinner arrows working; `any` disables them.
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isFinite(parsed)) return onChange(min);
          onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, parsed)));
        }}
        className={`readout mt-1 w-full rounded-sharp border bg-ink-850 px-2 py-1 text-right text-[12.5px] text-bone-100 outline-none focus:border-ink-600 ${
          unfilled ? 'border-signal-dim' : 'border-ink-800'
        }`}
      />
    </label>
  );
}

