import type { ActionType, LiveCaptureState, LiveReading, TurnActionInstruction } from '../types/hsr';

/**
 * Reads the Honkai: Star Rail window and calls the next action.
 *
 * What is actually measured, and how:
 * - **Cycles left** — OCR of the counter the game prints top-left. This is real
 *   text, so it reads reliably.
 * - **Skill Points** — OCR of the numeral under the Skill Point bar.
 * - **Ready Ultimates** — the portrait ring lights up gold when an Ultimate is
 *   charged, so each of the four portrait slots is sampled for that. This is a
 *   colour measurement, not text recognition.
 * - **Action Value** — the game never prints AV as a number. It is *derived*:
 *   the cycle counter locates you on the plan's AV timeline, and the plan
 *   supplies the AV of the turn you are on. The UI labels it as derived.
 *
 * Anything that could not be read comes back null. The tracker never fills a
 * gap with a plausible-looking value.
 */

const IDLE_READING: LiveReading = { av: null, turnCharacter: null, sp: null, ultsReady: [], confidence: 0 };

export const IDLE_STATE: LiveCaptureState = {
  isActive: false,
  isProcessing: false,
  stream: null,
  reading: IDLE_READING,
  recommendedAction: 'Basic Attack',
  recommendedCharacter: '',
  recommendedTarget: '',
  actionRationale: '',
  lastReadAt: null,
  error: null
};

/** Frame regions as fractions of the game window, measured at 16:9. */
const REGIONS = {
  cycles: { x: 0.008, y: 0.02, w: 0.2, h: 0.075 },
  skillPoints: { x: 0.38, y: 0.855, w: 0.24, h: 0.09 }
};

/** The four ally portraits along the bottom-left, where the ult ring lives. */
const PORTRAIT_SLOTS = [0, 1, 2, 3].map((index) => ({
  x: 0.022 + index * 0.062,
  y: 0.79,
  w: 0.05,
  h: 0.12
}));

/** How bright and how gold a ring has to be before it counts as charged. */
const ULT_LUMA_THRESHOLD = 118;
const ULT_GOLD_THRESHOLD = 26;

const SAMPLE_INTERVAL_MS = 1200;
const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 720;

type Worker = { recognize: (image: unknown) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> };

export class LiveGameTracker {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private timer: number | null = null;
  private worker: Worker | null = null;
  private busy = false;
  private plan: TurnActionInstruction[] = [];
  private teamNames: string[] = [];
  private readonly onState: (state: LiveCaptureState) => void;

  constructor(onState: (state: LiveCaptureState) => void) {
    this.onState = onState;
  }

  /** The plan the recommendation is read against, plus the team's turn order. */
  public setPlan(plan: TurnActionInstruction[], teamNames: string[]): void {
    this.plan = plan;
    this.teamNames = teamNames;
  }

  public async startCapture(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window', frameRate: 10 },
        audio: false
      });
    } catch {
      this.onState({ ...IDLE_STATE, error: 'Window sharing was blocked. Allow it and pick the game window.' });
      return false;
    }

    this.video = document.createElement('video');
    this.video.srcObject = this.stream;
    this.video.muted = true;
    await this.video.play().catch(() => {});

    this.canvas = document.createElement('canvas');
    this.canvas.width = CAPTURE_WIDTH;
    this.canvas.height = CAPTURE_HEIGHT;

    this.stream.getVideoTracks()[0].onended = () => this.stopCapture();

    this.onState({
      ...IDLE_STATE,
      isActive: true,
      stream: this.stream,
      actionRationale: 'Connected. Reading the window…'
    });

    this.timer = window.setInterval(() => void this.sample(), SAMPLE_INTERVAL_MS);
    return true;
  }

  public stopCapture(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video = null;
    }
    void this.worker?.terminate();
    this.worker = null;
    this.onState({ ...IDLE_STATE, actionRationale: 'Capture stopped.' });
  }

  /* ---------------------------------------------------------------- *
   * Sampling
   * ---------------------------------------------------------------- */

  private async sample(): Promise<void> {
    if (this.busy || !this.video || !this.canvas || !this.stream) return;
    if (this.video.readyState < this.video.HAVE_CURRENT_DATA) return;

    this.busy = true;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.busy = false;
      return;
    }

    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    try {
      const ultsReady = this.readReadyUltimates(ctx);
      const cyclesLeft = await this.readNumber(REGIONS.cycles, /(\d{1,2})/);
      const sp = await this.readNumber(REGIONS.skillPoints, /(\d)/);

      const step = this.currentStep(cyclesLeft);
      const readings = [cyclesLeft, sp, ultsReady.length ? 1 : null].filter((value) => value !== null).length;

      const reading: LiveReading = {
        av: step?.avTimestamp ?? null,
        turnCharacter: step?.characterName ?? null,
        sp,
        ultsReady,
        confidence: readings / 3
      };

      this.onState({
        isActive: true,
        isProcessing: false,
        stream: this.stream,
        reading,
        ...this.recommend(step, ultsReady, sp),
        lastReadAt: Date.now(),
        error: null
      });
    } catch (error) {
      this.onState({
        ...IDLE_STATE,
        isActive: true,
        stream: this.stream,
        error: `Could not read the window: ${(error as Error).message}`
      });
    } finally {
      this.busy = false;
    }
  }

  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    const { createWorker } = await import('tesseract.js');
    this.worker = (await createWorker('eng')) as unknown as Worker;
    return this.worker;
  }

  /** Crops a region, upscales it, and pulls the first number out of it. */
  private async readNumber(
    region: { x: number; y: number; w: number; h: number },
    pattern: RegExp
  ): Promise<number | null> {
    if (!this.canvas) return null;

    const crop = document.createElement('canvas');
    const sw = Math.round(this.canvas.width * region.w);
    const sh = Math.round(this.canvas.height * region.h);
    crop.width = sw * 3;
    crop.height = sh * 3;

    const ctx = crop.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.canvas,
      Math.round(this.canvas.width * region.x),
      Math.round(this.canvas.height * region.y),
      sw,
      sh,
      0,
      0,
      crop.width,
      crop.height
    );

    const worker = await this.getWorker();
    const { data } = await worker.recognize(crop);
    const value = Number(pattern.exec(data.text ?? '')?.[1]);
    return Number.isFinite(value) ? value : null;
  }

  /**
   * A charged Ultimate lights its portrait ring gold. Sampling mean luminance
   * and the red-minus-blue gap separates that from the dim grey resting state.
   */
  private readReadyUltimates(ctx: CanvasRenderingContext2D): string[] {
    if (!this.canvas) return [];
    const ready: string[] = [];

    PORTRAIT_SLOTS.forEach((slot, index) => {
      const frame = ctx.getImageData(
        Math.round(this.canvas!.width * slot.x),
        Math.round(this.canvas!.height * slot.y),
        Math.max(1, Math.round(this.canvas!.width * slot.w)),
        Math.max(1, Math.round(this.canvas!.height * slot.h))
      );

      let luma = 0;
      let gold = 0;
      const pixels = frame.data;
      const count = pixels.length / 4;
      for (let i = 0; i < pixels.length; i += 4) {
        luma += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        gold += pixels[i] - pixels[i + 2];
      }

      if (luma / count > ULT_LUMA_THRESHOLD && gold / count > ULT_GOLD_THRESHOLD) {
        ready.push(this.teamNames[index] ?? `Slot ${index + 1}`);
      }
    });

    return ready;
  }

  /* ---------------------------------------------------------------- *
   * Recommendation
   * ---------------------------------------------------------------- */

  /** The plan step the live cycle counter puts you on. */
  private currentStep(cyclesLeft: number | null): TurnActionInstruction | null {
    const allySteps = this.plan.filter((step) => step.side === 'ally' && step.characterIcon);
    if (!allySteps.length) return null;
    if (cyclesLeft === null) return allySteps[0];

    const highestCycle = Math.max(...allySteps.map((step) => step.cycleNumber));
    // The counter runs down, the plan runs up.
    const planCycle = Math.max(1, highestCycle - cyclesLeft + 1);
    return allySteps.find((step) => step.cycleNumber >= planCycle) ?? allySteps[allySteps.length - 1];
  }

  private recommend(
    step: TurnActionInstruction | null,
    ultsReady: string[],
    sp: number | null
  ): {
    recommendedAction: ActionType;
    recommendedCharacter: string;
    recommendedTarget: string;
    actionRationale: string;
  } {
    if (ultsReady.length) {
      return {
        recommendedAction: 'Ultimate',
        recommendedCharacter: ultsReady[0],
        recommendedTarget: step?.targetName ?? '',
        actionRationale: `${ultsReady.join(' and ')} ${ultsReady.length > 1 ? 'have' : 'has'} a charged Ultimate. Fire it before the next turn resolves.`
      };
    }

    if (!step) {
      return {
        recommendedAction: 'Basic Attack',
        recommendedCharacter: '',
        recommendedTarget: '',
        actionRationale: 'No plan loaded. Run the predictor first and the capture will call actions against it.'
      };
    }

    if (step.actionType === 'Skill' && sp !== null && sp < 1) {
      return {
        recommendedAction: 'Basic Attack',
        recommendedCharacter: step.characterName,
        recommendedTarget: step.targetName,
        actionRationale: `The plan wants a Skill here but the bar reads ${sp} Skill Points. Basic ATK to bank one first.`
      };
    }

    return {
      recommendedAction: step.actionType,
      recommendedCharacter: step.characterName,
      recommendedTarget: step.targetName,
      actionRationale: step.recommendationReason
    };
  }
}
