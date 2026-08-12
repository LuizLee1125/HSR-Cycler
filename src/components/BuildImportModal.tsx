import React, { useState } from 'react';
import { Upload, Search, Check, Sparkles, Image, RefreshCw } from 'lucide-react';
import type { TeamMemberConfig, CharacterStats } from '../types/hsr';
import { fetchEnkaBuildsByUid } from '../parser/enkaFetcher';
import { parseCharacterBuildImage } from '../parser/imageBuildParser';
import { CHARACTERS_DATABASE } from '../data/characters';

interface BuildImportModalProps {
  onApplyBuildToTeam: (slot: number, updatedStats: CharacterStats, relics: string[], lightCone: string) => void;
  team: TeamMemberConfig[];
}

export const BuildImportModal: React.FC<BuildImportModalProps> = ({ onApplyBuildToTeam, team }) => {
  const [activeSubTab, setActiveSubTab] = useState<'enka_uid' | 'image_ocr'>('enka_uid');
  const [uidInput, setUidInput] = useState('804912384');
  const [isFetchingEnka, setIsFetchingEnka] = useState(false);
  const [enkaResult, setEnkaResult] = useState<any | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [targetSlot, setTargetSlot] = useState(0);

  const handleFetchEnka = async () => {
    setIsFetchingEnka(true);
    const result = await fetchEnkaBuildsByUid(uidInput);
    setEnkaResult(result);
    setIsFetchingEnka(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    const parsed = await parseCharacterBuildImage(file);
    setOcrResult(parsed);
    setIsOcrProcessing(false);
  };

  const handleApplyEnkaBuild = (avatar: any) => {
    onApplyBuildToTeam(targetSlot, avatar.stats, avatar.relics, avatar.lightCone);
    alert(`Applied ${avatar.characterName} build from Enka.network to Team Slot ${targetSlot + 1}!`);
  };

  const handleApplyOcrBuild = () => {
    if (!ocrResult || !ocrResult.stats) return;
    const fullStats: CharacterStats = {
      hp: ocrResult.stats.hp || 3450,
      atk: ocrResult.stats.atk || 2680,
      def: ocrResult.stats.def || 1120,
      spd: ocrResult.stats.spd || 154,
      critRate: ocrResult.stats.critRate || 15,
      critDmg: ocrResult.stats.critDmg || 72,
      breakEffect: ocrResult.stats.breakEffect || 284.5,
      energyRegen: ocrResult.stats.energyRegen || 100,
      effectHitRate: ocrResult.stats.effectHitRate || 10,
      dmgBonus: ocrResult.stats.dmgBonus || 0
    };
    onApplyBuildToTeam(targetSlot, fullStats, ocrResult.detectedRelicSets || ['Iron Cavalry'], 'Where Dreams Remain');
    alert(`Applied image OCR build to Team Slot ${targetSlot + 1}!`);
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-xl">
      {/* Subtab Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <span>CHARACTER BUILD IMPORTER</span>
          </h2>
          <p className="text-xs text-slate-400">Import builds via Enka.network UID fetch or uploaded Build Card screenshots</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('enka_uid')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === 'enka_uid'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Enka.network UID Fetch
          </button>
          <button
            onClick={() => setActiveSubTab('image_ocr')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSubTab === 'image_ocr'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Build Card Image OCR
          </button>
        </div>
      </div>

      {/* Target Slot Selector */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">Target Team Slot to Update:</span>
        <div className="flex items-center gap-2">
          {team.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setTargetSlot(idx)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                targetSlot === idx
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              Slot {idx + 1}: {m.character.name}
            </button>
          ))}
        </div>
      </div>

      {/* ENKA UID FETCH TAB */}
      {activeSubTab === 'enka_uid' && (
        <div className="space-y-6">
          <div className="flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={uidInput}
                onChange={(e) => setUidInput(e.target.value)}
                placeholder="Enter 9-digit HSR UID (e.g. 804912384)"
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-sm px-4 py-3 rounded-xl focus:border-cyan-400 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            </div>
            <button
              onClick={handleFetchEnka}
              disabled={isFetchingEnka}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              {isFetchingEnka ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>FETCH SHOWCASE</span>
            </button>
          </div>

          {enkaResult && enkaResult.success && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Player: <strong className="text-white">{enkaResult.playerNickname}</strong> (UID: {enkaResult.uid})</span>
                <span>Found <strong className="text-cyan-400">{enkaResult.avatarList.length}</strong> Showcase Builds</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enkaResult.avatarList.map((avatar: any, i: number) => (
                  <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <img src={CHARACTERS_DATABASE.find(c => c.name === avatar.characterName)?.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'} alt="" className="w-8 h-8 rounded-full border border-cyan-400" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{avatar.characterName}</h4>
                          <span className="text-[10px] text-slate-400">Lv. {avatar.level}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyEnkaBuild(avatar)}
                        className="px-3 py-1.5 text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 rounded-lg shadow transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply to Slot {targetSlot + 1}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[9px] block">SPD</span>
                        <strong className="text-cyan-400">{avatar.stats.spd}</strong>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[9px] block">CRIT RATE</span>
                        <strong className="text-amber-400">{avatar.stats.critRate}%</strong>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 text-[9px] block">BREAK EFF</span>
                        <strong className="text-fuchsia-400">{avatar.stats.breakEffect}%</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BUILD CARD OCR SCANNER TAB */}
      {activeSubTab === 'image_ocr' && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-8 text-center space-y-3 bg-slate-950/50 transition-all">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 mx-auto flex items-center justify-center">
              <Image className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">Upload Character Build Card Screenshot</p>
              <p className="text-xs text-slate-500">Supports Enka build cards, Akasha cards, or in-game stat screen screenshots (PNG, JPG, WebP)</p>
            </div>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer hover:bg-cyan-400 transition-all">
              <Upload className="w-4 h-4" />
              <span>Browse Image File</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          {isOcrProcessing && (
            <div className="text-center py-6 space-y-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-300">Processing image via OCR stat engine...</p>
            </div>
          )}

          {ocrResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">OCR Parsed Result: {ocrResult.characterName}</h3>
                  <p className="text-[10px] text-slate-400">Extracted from uploaded screenshot</p>
                </div>
                <button
                  onClick={handleApplyOcrBuild}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs rounded-lg shadow hover:opacity-90 transition-all"
                >
                  Apply Parsed Build to Slot {targetSlot + 1}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">ATK</span>
                  <span className="font-bold text-white">{ocrResult.stats?.atk || 2680}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">SPD</span>
                  <span className="font-bold text-cyan-400">{ocrResult.stats?.spd || 154}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">CRIT RATE</span>
                  <span className="font-bold text-amber-400">{ocrResult.stats?.critRate || 15}%</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">BREAK EFFECT</span>
                  <span className="font-bold text-fuchsia-400">{ocrResult.stats?.breakEffect || 284.5}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
