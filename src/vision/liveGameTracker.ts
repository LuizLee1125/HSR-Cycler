import type { LiveCaptureState, ActionType } from '../types/hsr';

export class LiveGameTracker {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private animFrameId: number | null = null;
  private onStateUpdate: (state: LiveCaptureState) => void;
  private currentAVCounter: number = 100;

  constructor(onStateUpdate: (state: LiveCaptureState) => void) {
    this.onStateUpdate = onStateUpdate;
  }

  /**
   * Prompts user to select the Honkai: Star Rail application window via getDisplayMedia
   */
  public async startCapture(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
          frameRate: 30
        },
        audio: false
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.autoplay = true;
      this.videoElement.play();

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = 1280;
      this.canvasElement.height = 720;

      // Handle user stopping screen share via browser bar
      this.mediaStream.getVideoTracks()[0].onended = () => {
        this.stopCapture();
      };

      this.startFrameProcessing();
      return true;
    } catch (err) {
      console.error('[Live Capture Error] Failed to access window capture:', err);
      return false;
    }
  }

  public stopCapture(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.onStateUpdate({
      isActive: false,
      isProcessing: false,
      stream: null,
      detectedAV: null,
      detectedTurnCharacter: null,
      detectedSP: null,
      recommendedAction: 'Skill',
      recommendedTarget: 'Boss',
      actionRationale: 'Capture stopped. Connect game window to resume live recommendations.',
      assistSkillStatus: 'Inactive',
      fps: 0
    });
  }

  private startFrameProcessing(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 30;

    const processFrame = () => {
      if (!this.videoElement || !this.canvasElement || !this.mediaStream) return;

      const ctx = this.canvasElement.getContext('2d');
      if (ctx && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
        ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

        // Frame sampling calculations
        const now = performance.now();
        frameCount++;
        if (now - lastTime >= 1000) {
          fps = frameCount;
          frameCount = 0;
          lastTime = now;
        }

        // Simulate Action Value timeline reader tick from video stream
        this.currentAVCounter = Math.max(0, this.currentAVCounter - 0.2);
        if (this.currentAVCounter <= 0) {
          this.currentAVCounter = 92.4;
        }

        // Determine recommended action dynamically based on simulated/live AV state
        const actionDecision = this.deriveTacticalInstruction(this.currentAVCounter);

        this.onStateUpdate({
          isActive: true,
          isProcessing: true,
          stream: this.mediaStream,
          detectedAV: Number(this.currentAVCounter.toFixed(1)),
          detectedTurnCharacter: actionDecision.character,
          detectedSP: actionDecision.sp,
          recommendedAction: actionDecision.action,
          recommendedTarget: actionDecision.target,
          actionRationale: actionDecision.rationale,
          assistSkillStatus: actionDecision.assistSkillStatus,
          fps
        });
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  private deriveTacticalInstruction(av: number): {
    character: string;
    action: ActionType;
    target: string;
    sp: number;
    rationale: string;
    assistSkillStatus: string;
  } {
    if (av > 70) {
      return {
        character: 'Firefly',
        action: 'Skill',
        target: 'Hoolay (Boss)',
        sp: 3,
        rationale: 'Cast Firefly Skill to apply Fire Weakness implant and trigger massive Super Break DMG!',
        assistSkillStatus: 'Ready (Assist Skill Available)'
      };
    } else if (av > 40) {
      return {
        character: 'Harmony MC',
        action: 'Skill',
        target: 'Hoolay (Boss)',
        sp: 2,
        rationale: 'Cast Skill on Boss to deplete 60 Imaginary Toughness and trigger Backup Dancer Super Break.',
        assistSkillStatus: 'Ready'
      };
    } else if (av > 20) {
      return {
        character: 'Robin',
        action: 'Ultimate',
        target: 'All Allies',
        sp: 1,
        rationale: 'QUEUE ULTIMATE NOW! Triggers 100% Team Action Advance before Boss takes action at AV 12.0.',
        assistSkillStatus: 'Active (+100% Advance)'
      };
    } else {
      return {
        character: 'Ruan Mei',
        action: 'Basic Attack',
        target: 'Senior Staff Minion',
        sp: 1,
        rationale: 'Use Basic Attack to generate +1 SP for team while Overtone field remains active.',
        assistSkillStatus: 'Charging'
      };
    }
  }
}
