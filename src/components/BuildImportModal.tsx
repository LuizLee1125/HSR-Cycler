import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CharacterStats, OcrBuildParseResult, TeamMemberConfig } from '../types/hsr';
import { fetchEnkaBuildsByUid } from '../parser/enkaFetcher';
import type { EnkaAvatar, EnkaFetchResult } from '../parser/enkaFetcher';
import { parseCharacterBuildImage } from '../parser/imageBuildParser';
import { getCharacter } from '../data/characters';
import { fullNumber } from '../ui/format';

interface BuildImportModalProps {
  team: TeamMemberConfig[];
  onApplyBuildToTeam: (slot: number, stats: CharacterStats, relics: string[], lightCone: string) => void;
}

export function BuildImportModal({ team, onApplyBuildToTeam }: BuildImportModalProps) {
  const [tab, setTab] = useState<'enka' | 'ocr'>('enka');
  const [slot, setSlot] = useState(0);

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [enka, setEnka] = useState<EnkaFetchResult | null>(null);

  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocr, setOcr] = useState<OcrBuildParseResult | null>(null);

  const runEnka = async () => {
    setLoading(true);
    setEnka(await fetchEnkaBuildsByUid(uid));
    setLoading(false);
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    setOcr(await parseCharacterBuildImage(file));
    setOcrBusy(false);
  };

  const applyEnka = (avatar: EnkaAvatar) => {
    // Enka rarely returns computed stats; fall back to the character's own base
    // line rather than inventing a build.
    const stats = avatar.stats ?? getCharacter(avatar.characterId)?.baseStats;
    if (!stats) return;
    onApplyBuildToTeam(slot, stats, [], avatar.lightCone ?? '');
  };

  const applyOcr = () => {
    const base = team[slot]?.stats;
    if (!ocr?.stats || !base) return;
    onApplyBuildToTeam(slot, { ...base, ...ocr.stats }, ocr.detectedRelicSets ?? [], ocr.lightCone ?? '');
  };

  return (
    <div className="space-y-6">
      <div className="panel">
        <div className="rule flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex gap-5">
            {(
              [
                ['enka', 'Enka.network UID'],
                ['ocr', 'Build card screenshot']
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-3 border-b-2 pb-3 text-[13px] transition-colors ${
                  tab === id ? 'border-signal text-bone-100' : 'border-transparent text-bone-600 hover:text-bone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="eyebrow">Apply to</span>
            {team.map((member, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSlot(index)}
                className={`rounded-sharp border px-2 py-1 text-[12px] transition-colors ${
                  slot === index
                    ? 'border-signal-dim bg-ink-850 text-bone-100'
                    : 'border-ink-800 text-bone-600 hover:text-bone-300'
                }`}
              >
                {member.character.name}
              </button>
            ))}
          </div>
        </div>

        {tab === 'enka' ? (
          <div className="space-y-4 px-5 py-4">
            <div className="flex max-w-md gap-2">
              <input
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                inputMode="numeric"
                placeholder="9-digit UID"
                className="readout flex-1 rounded-sharp border border-ink-800 bg-ink-850 px-3 py-2 text-[13px] text-bone-100 outline-none placeholder:text-bone-600 focus:border-ink-600"
              />
              <button type="button" onClick={runEnka} disabled={loading} className="btn btn-primary">
                {loading ? 'Fetching…' : 'Fetch showcase'}
              </button>
            </div>

            <p className="text-[12px] leading-relaxed text-bone-600">
              Enka returns your showcase configuration — level, Eidolon, Light Cone and relics. It does not return
              computed combat stats, so tune the numbers in the team panel after importing.
            </p>

            {enka?.errorMessage && (
              <p className="text-[12.5px]" style={{ color: 'var(--color-danger)' }}>
                {enka.errorMessage}
              </p>
            )}

            {enka?.success && (
              <>
                <p className="text-[12.5px] text-bone-500">
                  {enka.playerNickname ?? 'Trailblazer'} · UID {enka.uid} · {enka.avatarList.length} characters on
                  display
                </p>
                <ul className="divide-y divide-ink-850 border-t border-ink-850">
                  {enka.avatarList.map((avatar) => (
                    <li key={avatar.characterId} className="flex flex-wrap items-center gap-4 py-3">
                      <img src={avatar.icon} alt="" className="h-9 w-9 rounded-sharp bg-ink-850" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-bone-100">{avatar.characterName}</p>
                        <p className="readout text-[11px] text-bone-600">
                          Lv.{avatar.level} · E{avatar.eidolon}
                          {avatar.lightCone &&
                            ` · ${avatar.lightCone}${
                              avatar.lightConeSuperimposition ? ` S${avatar.lightConeSuperimposition}` : ''
                            }`}
                        </p>
                      </div>
                      <button type="button" onClick={() => applyEnka(avatar)} className="btn">
                        Apply
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-sharp border border-dashed border-ink-700 px-6 py-10 text-center hover:border-ink-600">
              <span className="text-[13px] text-bone-300">Drop or choose a build card screenshot</span>
              <span className="text-[12px] text-bone-600">PNG, JPG or WebP — in-game stat screen or Enka card</span>
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>

            {ocrBusy && <p className="text-[12.5px] text-bone-500">Running OCR…</p>}

            {ocr && !ocrBusy && (
              <div className="panel-inset">
                <div className="rule flex items-center justify-between gap-3 px-4 py-2.5">
                  <p className="text-[13px] text-bone-100">{ocr.characterName ?? 'Unrecognised character'}</p>
                  <button type="button" onClick={applyOcr} disabled={!ocr.stats} className="btn">
                    Apply to {team[slot]?.character.name ?? `slot ${slot + 1}`}
                  </button>
                </div>
                {ocr.stats ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-4">
                    {Object.entries(ocr.stats).map(([key, value]) => (
                      <div key={key}>
                        <dt className="eyebrow">{key}</dt>
                        <dd className="readout mt-0.5 text-[13px] text-bone-100">{fullNumber(Number(value))}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="px-4 py-3 text-[12.5px] text-bone-600">
                    No stats could be read from that image. A tighter crop of the stat panel usually works better.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
