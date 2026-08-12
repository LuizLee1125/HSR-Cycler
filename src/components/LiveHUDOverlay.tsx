import { useEffect, useRef, useState } from 'react';
import { LiveGameTracker } from '../vision/liveGameTracker';
import type { LiveCaptureState } from '../types/hsr';

interface LiveHUDOverlayProps {
  onRunPredictor: () => void;
}

const IDLE: LiveCaptureState = {
  isActive: false,
  isProcessing: false,
  stream: null,
  detectedAV: null,
  detectedTurnCharacter: null,
  detectedSP: null,
  recommendedAction: 'Basic Attack',
  recommendedTarget: '',
  actionRationale: '',
  assistSkillStatus: '',
  fps: 0
};

export function LiveHUDOverlay({ onRunPredictor }: LiveHUDOverlayProps) {
  const [state, setState] = useState<LiveCaptureState>(IDLE);
  const [error, setError] = useState<string | null>(null);
  const trackerRef = useRef<LiveGameTracker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const tracker = new LiveGameTracker(setState);
    trackerRef.current = tracker;
    return () => tracker.stopCapture();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video && state.stream && video.srcObject !== state.stream) {
      video.srcObject = state.stream;
      video.play().catch(() => {});
    }
  }, [state.stream]);

  const start = async () => {
    setError(null);
    const started = await trackerRef.current?.startCapture();
    if (!started) setError('Screen capture was blocked. Allow window sharing and try again.');
  };

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="max-w-xl">
          <p className="text-[15px] font-medium text-bone-100">Read Action Values straight off the game window</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-bone-500">
            Share your Honkai: Star Rail window and the OCR pass reads the turn order, current Action Value and
            Skill Point count, then recommends the next action against the loaded plan.
          </p>
        </div>
        <div className="flex gap-2">
          {state.isActive ? (
            <button type="button" onClick={() => trackerRef.current?.stopCapture()} className="btn">
              Disconnect
            </button>
          ) : (
            <button type="button" onClick={start} className="btn btn-primary">
              Select game window
            </button>
          )}
          <button type="button" onClick={onRunPredictor} className="btn">
            Run predictor
          </button>
        </div>
      </div>

      {error && (
        <p className="panel px-5 py-3 text-[12.5px]" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="panel overflow-hidden">
          <div className="rule flex items-baseline justify-between gap-3 px-5 py-2.5">
            <p className="eyebrow">Capture</p>
            <p className="readout text-[11px] text-bone-600">
              {state.isActive ? `${state.fps} fps` : 'not connected'}
            </p>
          </div>
          <div className="relative flex aspect-video items-center justify-center bg-ink-950">
            {state.isActive && state.stream ? (
              <video ref={videoRef} className="h-full w-full object-contain" autoPlay muted playsInline />
            ) : (
              <p className="px-8 text-center text-[12.5px] text-bone-600">
                Nothing connected. Choose your game window to begin.
              </p>
            )}
          </div>
        </div>

        <div className="panel h-fit">
          <div className="rule px-5 py-2.5">
            <p className="eyebrow">Next action</p>
          </div>

          <div className="px-5 py-4">
            <p className="text-[22px] font-semibold tracking-tight text-bone-100">
              {state.isActive ? state.recommendedAction : '—'}
            </p>
            {state.recommendedTarget && (
              <p className="mt-0.5 text-[12.5px] text-bone-500">on {state.recommendedTarget}</p>
            )}
            {state.actionRationale && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-bone-300">{state.actionRationale}</p>
            )}
          </div>

          <div className="grid grid-cols-3 border-t border-ink-850">
            <Reading label="AV" value={state.detectedAV?.toFixed(1) ?? '—'} />
            <Reading label="Turn" value={state.detectedTurnCharacter ?? '—'} />
            <Reading label="SP" value={state.detectedSP !== null ? String(state.detectedSP) : '—'} />
          </div>

          {state.assistSkillStatus && (
            <div className="border-t border-ink-850 px-5 py-3">
              <p className="eyebrow">Ultimate / assist</p>
              <p className="mt-1 text-[12.5px] text-bone-300">{state.assistSkillStatus}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-ink-850 px-4 py-3 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 truncate text-[13px] text-bone-100">{value}</p>
    </div>
  );
}
