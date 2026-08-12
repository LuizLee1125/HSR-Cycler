import React from 'react';
import { Video, Play, Users, Upload, Shield, BookOpen, Sparkles } from 'lucide-react';
import type { EndgameMode } from '../types/hsr';

interface HeaderProps {
  activeTab: 'live_hud' | 'predictor' | 'team_builder' | 'build_import' | 'endgame_db' | 'prydwen_db';
  setActiveTab: (tab: 'live_hud' | 'predictor' | 'team_builder' | 'build_import' | 'endgame_db' | 'prydwen_db') => void;
  selectedMode: EndgameMode;
  setSelectedMode: (mode: EndgameMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedMode,
  setSelectedMode
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-cyan-500/30 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider text-white font-mono">
                HSR<span className="text-cyan-400">.CYCLER</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full">
                v2.6 ENDGAME
              </span>
            </div>
            <p className="text-xs text-slate-400">Tactical Combat Predictor & Live AV Instructor</p>
          </div>
        </div>

        {/* Endgame Mode Selector */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {(['Memory of Chaos', 'Pure Fiction', 'Apocalyptic Shadow', 'Anomaly Arbitration'] as EndgameMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedMode === mode
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {mode === 'Memory of Chaos' ? 'MoC 12' : mode === 'Pure Fiction' ? 'PF 4' : mode === 'Apocalyptic Shadow' ? 'AS 4' : 'Anomaly Arb.'}
            </button>
          ))}
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('live_hud')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'live_hud'
                ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white shadow-md shadow-red-500/30 font-bold animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>LIVE GAME VISION</span>
          </button>

          <button
            onClick={() => setActiveTab('predictor')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'predictor'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>PREDICTOR</span>
          </button>

          <button
            onClick={() => setActiveTab('team_builder')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'team_builder'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>TEAM</span>
          </button>

          <button
            onClick={() => setActiveTab('build_import')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'build_import'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT</span>
          </button>

          <button
            onClick={() => setActiveTab('endgame_db')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'endgame_db'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>NANOKA.CC</span>
          </button>

          <button
            onClick={() => setActiveTab('prydwen_db')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'prydwen_db'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>PRYDWEN</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
