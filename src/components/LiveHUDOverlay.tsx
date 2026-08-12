import React, { useState, useEffect } from 'react';
import { LiveGameTracker } from '../vision/liveGameTracker';
import type { LiveCaptureState, ActionType } from '../types/hsr';
import { Monitor, Zap, Target, Play, Shield, RefreshCw, Layers } from 'lucide-react';

interface LiveHUDOverlayProps {
  onRunPredictor: () => void;
}

export const LiveHUDOverlay: React.FC<LiveHUDOverlayProps> = ({ onRunPredictor }) => {
  const [tracker, setTracker] = useState<LiveGameTracker | null>(null);
  const [captureState, setCaptureState] = useState<LiveCaptureState>({
    isActive: false,
    isProcessing: false,
    stream: null,
    detectedAV: 42.5,
    detectedTurnCharacter: 'Firefly',
    detectedSP: 3,
    recommendedAction: 'Skill',
    recommendedTarget: 'Hoolay (Boss)',
    actionRationale: 'Cast Firefly Skill to apply Fire weakness implant & trigger 180% Super Break DMG before enemy AV turn.',
    assistSkillStatus: 'Ready - Trigger for 1.5M Break DMG',
    fps: 30
  });

  useEffect(() => {
    const gameTracker = new LiveGameTracker((state) => {
      setCaptureState(state);
    });
    setTracker(gameTracker);

    return () => {
      gameTracker.stopCapture();
    };
  }, []);

  const handleStartCapture = async () => {
    if (tracker) {
      const success = await tracker.startCapture();
      if (!success) {
        alert('Could not start screen capture. Please allow window sharing permission.');
      }
    }
  };

  const handleStopCapture = () => {
    if (tracker) {
      tracker.stopCapture();
    }
  };

  const getActionColor = (action: ActionType) => {
    switch (action) {
      case 'Skill':
        return 'from-amber-500 to-orange-600 border-amber-400 text-amber-100 shadow-amber-500/40';
      case 'Ultimate':
        return 'from-fuchsia-600 to-purple-700 border-fuchsia-400 text-fuchsia-100 shadow-fuchsia-500/50 animate-pulse';
      case 'Assist Skill':
        return 'from-cyan-500 to-blue-600 border-cyan-400 text-cyan-100 shadow-cyan-500/40';
      case 'Basic Attack':
      default:
        return 'from-emerald-500 to-teal-600 border-emerald-400 text-emerald-100 shadow-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className={`w-3 h-3 rounded-full ${captureState.isActive ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
              <h2 className="text-2xl font-bold text-white tracking-wide font-mono">
                LIVE GAME VISION & AV READER
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                REAL-TIME HUD
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Connect your active <strong className="text-cyan-400">Honkai: Star Rail</strong> application window. The real-time OCR engine reads live Action Values (AV), turn queue, and SP balance to give instant combat action instructions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!captureState.isActive ? (
              <button
                onClick={handleStartCapture}
                className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all hover:scale-105"
              >
                <Monitor className="w-5 h-5" />
                <span>SELECT HSR GAME WINDOW</span>
              </button>
            ) : (
              <button
                onClick={handleStopCapture}
                className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30 font-semibold rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Disconnect Window</span>
              </button>
            )}

            <button
              onClick={onRunPredictor}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl transition-all text-xs"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              <span>Full Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Captured Video Feed + Tactical HUD Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Capture Window & Live OCR Feed (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">HSR Application Feed</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>FPS: <strong className="text-emerald-400">{captureState.fps}</strong></span>
              <span>Resolution: <strong className="text-cyan-400">1080p</strong></span>
            </div>
          </div>

          {/* Video Stream Container / Mock Frame */}
          <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center group">
            {captureState.isActive && captureState.stream ? (
              <video
                ref={(video) => {
                  if (video && captureState.stream && video.srcObject !== captureState.stream) {
                    video.srcObject = captureState.stream;
                    video.play().catch(() => {});
                  }
                }}
                className="w-full h-full object-cover"
                autoPlay
                muted
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-cyan-500/30 mx-auto flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-cyan-400/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-300">No Application Window Connected</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click "SELECT HSR GAME WINDOW" above to share your Honkai: Star Rail screen for live turn instructions.
                  </p>
                </div>
                <button
                  onClick={handleStartCapture}
                  className="px-4 py-2 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
                >
                  Connect Game Window Now
                </button>
              </div>
            )}

            {/* Live OCR Detection Overlay Box */}
            <div className="absolute top-4 left-4 bg-slate-950/90 border border-cyan-500/40 backdrop-blur-md rounded-lg p-3 space-y-1 shadow-lg text-xs">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>DETECTED AV: {captureState.detectedAV ?? '42.5'}</span>
              </div>
              <div className="text-slate-300">
                Turn: <strong className="text-white">{captureState.detectedTurnCharacter ?? 'Firefly'}</strong>
              </div>
              <div className="text-slate-400">
                SP Count: <strong className="text-amber-400">{captureState.detectedSP ?? 3} / 5</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Tactical HUD Instruction Box (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white tracking-wider font-mono">LIVE TACTICAL INSTRUCTION</h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded">
                RECOMMENDED NOW
              </span>
            </div>

            {/* Active Action Display Badge */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Recommended Action</label>
              <div className={`p-5 rounded-2xl bg-gradient-to-r border shadow-xl flex items-center justify-between ${getActionColor(captureState.recommendedAction)}`}>
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">EXECUTE THIS ATTACK</span>
                  <div className="text-3xl font-black tracking-tight font-mono">
                    {captureState.recommendedAction.toUpperCase()}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Zap className="w-6 h-6 text-white animate-bounce" />
                </div>
              </div>
            </div>

            {/* Target Recommendation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Target Priority</span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-red-400" />
                  <span>{captureState.recommendedTarget}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">SP Trajectory</span>
                <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{captureState.detectedSP ?? 3} SP Remaining</span>
                </div>
              </div>
            </div>

            {/* Ultimate & Assist Skill Status Banner */}
            <div className="bg-slate-950/90 rounded-xl p-4 border border-fuchsia-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-fuchsia-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Assist Skill / Ultimate Status</span>
                </span>
                <span className="px-2 py-0.5 bg-fuchsia-500/20 text-fuchsia-300 font-mono text-[10px] rounded border border-fuchsia-500/40">
                  {captureState.assistSkillStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {captureState.actionRationale}
              </p>
            </div>

            {/* Attack Type Selector Checklist */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Skill Types Guide</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${captureState.recommendedAction === 'Basic Attack' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Basic Attack (+1 SP)</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${captureState.recommendedAction === 'Skill' ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Skill (-1 SP)</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${captureState.recommendedAction === 'Ultimate' ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                  <span>Ultimate (Queue)</span>
                </div>
                <div className={`p-2 rounded-lg border flex items-center gap-2 ${captureState.recommendedAction === 'Assist Skill' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Assist Skill</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
