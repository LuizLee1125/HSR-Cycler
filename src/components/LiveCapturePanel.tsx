import { useEffect, useRef, useState } from 'react';
import { Cast } from 'lucide-react';
import type { LiveCaptureState, TurnActionInstruction } from '../types/hsr';
import { IDLE_STATE, LiveGameTracker } from '../vision/liveGameTracker';

interface LiveCapturePanelProps {
  plan: TurnActionInstruction[];
  teamNames: string[];
}

/**
 * Screen capture lives inside the prediction view because it only means
 * anything against a loaded plan — it reads the live game and points at the
 * next step of that plan.
 */
export function LiveCapturePanel({ plan, teamNames }: LiveCapturePanelProps) {
  const [state, setState] = useState<LiveCaptureState>(IDLE_STATE);
  const trackerRef = useRef<LiveGameTracker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const tracker = new LiveGameTracker(setState);
    trackerRef.current = tracker;
    return () => tracker.stopCapture();
  }, []);

  useEffect(() => {
    trackerRef.current?.setPlan(plan, teamNames);
  }, [plan, teamNames]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && state.stream && video.srcObject !== state.stream) {
      video.srcObject = state.stream;
      void video.play().catch(() => {});
    }
  }, [state.stream]);

  return (
    <div className="panel overflow-hidden">
      <div className="rule flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Cast className="h-4 w-4 text-bone-600" strokeWidth={1.75} />
          <div>
            <p className="text-[13px] text-bone-100">Live capture</p>
            <p className="text-[11.5px] text-bone-600">
              Reads the game window and calls the next action against this plan
            </p>
          </div>
        </div>
        {state.isActive ? (
          <button type="button" onClick={() => trackerRef.current?.stopCapture()} className="btn">
            Disconnect
          </button>
        ) : (
          <button type="button" onClick={() => void trackerRef.current?.startCapture()} className="btn">
            Select game window
          </button>
        )}
      </div>

      {state.error && (
        <p className="rule px-5 py-2.5 text-[12.5px]" style={{ color: 'var(--color-danger)' }}>
          {state.error}
        </p>
      )}

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative flex aspect-video items-center justify-center border-b border-ink-850 bg-ink-950 lg:border-b-0 lg:border-r">
          {state.isActive && state.stream ? (
            <video ref={videoRef} className="h-full w-full object-contain" autoPlay muted playsInline />
          ) : (
            <p className="max-w-xs px-8 text-center text-[12.5px] leading-relaxed text-bone-600">
              Nothing connected. Share the Honkai: Star Rail window and the cycle counter, Skill Point bar and
              charged Ultimates get read straight off it.
            </p>
          )}
        </div>

        <div>
          <div className="rule px-5 py-4">
            <p className="eyebrow">Do this next</p>
            <p className="mt-1.5 text-[20px] font-semibold leading-tight tracking-tight text-bone-100">
              {state.isActive ? state.recommendedAction : '—'}
            </p>
            {state.recommendedCharacter && (
              <p className="mt-0.5 text-[12.5px] text-bone-500">
                {state.recommendedCharacter}
                {state.recommendedTarget && ` → ${state.recommendedTarget}`}
              </p>
            )}
            {state.actionRationale && (
              <p className="mt-2 text-[12.5px] leading-relaxed text-bone-300">{state.actionRationale}</p>
            )}
          </div>

          <div className="grid grid-cols-3 border-b border-ink-850">
            <Reading label="AV" value={state.reading.av?.toFixed(1) ?? '—'} note="derived" />
            <Reading label="SP" value={state.reading.sp !== null ? String(state.reading.sp) : '—'} note="read" />
            <Reading label="Ults" value={String(state.reading.ultsReady.length)} note="read" />
          </div>

          <div className="px-5 py-3">
            <p className="eyebrow">Charged Ultimates</p>
            <p className="mt-1 text-[12.5px] text-bone-300">
              {state.reading.ultsReady.length ? state.reading.ultsReady.join(', ') : 'None detected'}
            </p>
            {state.lastReadAt && (
              <p className="readout mt-2 text-[11px] text-bone-600">
                Last read {new Date(state.lastReadAt).toLocaleTimeString()} ·{' '}
                {Math.round(state.reading.confidence * 100)}% of fields legible
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Reading({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border-r border-ink-850 px-4 py-3 last:border-r-0">
      <p className="eyebrow">{label}</p>
      <p className="readout mt-1 truncate text-[15px] text-bone-100">{value}</p>
      <p className="text-[10px] text-bone-600">{note}</p>
    </div>
  );
}
