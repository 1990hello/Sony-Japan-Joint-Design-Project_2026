import { HandData, HandLandmark } from '../types';

declare global {
  interface Window {
    Hands?: any;
  }
}

export interface HandTrackerCallbacks {
  onClap?: () => void;
  onGrabStart?: (x: number, y: number) => void;
  onGrabMove?: (x: number, y: number) => void;
  onGrabEnd?: (x: number, y: number) => void;
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onHandsUpdate?: (hands: HandData[]) => void;
  onCameraStatusChange?: (status: 'ready' | 'loading' | 'denied' | 'unsupported') => void;
}

export class HandTracker {
  private videoEl: HTMLVideoElement | null = null;
  private handsInstance: any = null;
  private mediaStream: MediaStream | null = null;
  private frameId: number | null = null;
  private callbacks: HandTrackerCallbacks = {};

  // Smoothing filters (low pass)
  private smoothedHands: HandData[] = [];
  private prevPalmDistance: number | null = null;
  private lastClapTime: number = 0;
  private clapCooldown: number = 1800; // ms

  // Pinch / Grab tracking
  private isCurrentlyGrabbing: boolean = false;
  private grabHoldFrames: number = 0;

  // Swipe detection
  private lastHandPos: { x: number; y: number; time: number } | null = null;

  private isRunning: boolean = false;
  private isInitializing: boolean = false;

  constructor(callbacks: HandTrackerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: HandTrackerCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async start(videoElement: HTMLVideoElement) {
    this.videoEl = videoElement;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.callbacks.onCameraStatusChange?.('unsupported');
      return;
    }

    if (this.isInitializing) return;
    this.isInitializing = true;
    this.callbacks.onCameraStatusChange?.('loading');

    // 1. Initialize MediaPipe Hands if available
    try {
      let retries = 0;
      while (!window.Hands && retries < 25) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }

      if (window.Hands && !this.handsInstance) {
        this.handsInstance = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        this.handsInstance.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.handsInstance.onResults(this.onResults.bind(this));
      }
    } catch (err) {
      console.warn('MediaPipe Hands setup error:', err);
    }

    // 2. Safely acquire webcam stream without unhandled exceptions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.mediaStream = stream;
      if (this.videoEl) {
        this.videoEl.srcObject = stream;
        try {
          await this.videoEl.play();
        } catch {
          // play could be interrupted or pending
        }
      }

      this.isRunning = true;
      this.callbacks.onCameraStatusChange?.('ready');
      this.startFrameLoop();
    } catch (err: any) {
      // Gracefully handle NotAllowedError or permission denial
      this.isRunning = false;
      this.callbacks.onCameraStatusChange?.('denied');
    } finally {
      this.isInitializing = false;
    }
  }

  private startFrameLoop() {
    let isProcessing = false;

    const processFrame = async () => {
      if (!this.isRunning) return;

      if (this.videoEl && this.handsInstance && !isProcessing && this.videoEl.readyState >= 2) {
        isProcessing = true;
        try {
          await this.handsInstance.send({ image: this.videoEl });
        } catch {
          // ignore transient frame send issues
        } finally {
          isProcessing = false;
        }
      }

      if (this.isRunning) {
        this.frameId = requestAnimationFrame(processFrame);
      }
    };

    this.frameId = requestAnimationFrame(processFrame);
  }

  public stop() {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.mediaStream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  private onResults(results: any) {
    if (!this.isRunning) return;

    const rawHands: HandData[] = [];

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const rawLandmarks = results.multiHandLandmarks[i];
        const handednessObj = results.multiHandedness[i];
        const handedness = (handednessObj?.label === 'Right' ? 'Right' : 'Left') as 'Left' | 'Right';

        // Mirror X coordinates for natural AR interaction
        const landmarks: HandLandmark[] = rawLandmarks.map((lm: any) => ({
          x: 1 - lm.x,
          y: lm.y,
          z: lm.z,
        }));

        const wrist = landmarks[0];
        const indexMCP = landmarks[5];
        const pinkyMCP = landmarks[17];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];

        const palmCenter = {
          x: (wrist.x + indexMCP.x + pinkyMCP.x) / 3,
          y: (wrist.y + indexMCP.y + pinkyMCP.y) / 3,
        };

        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const pinchDist = Math.sqrt(dx * dx + dy * dy);

        const distToPalm = (pt: HandLandmark) => {
          const px = pt.x - palmCenter.x;
          const py = pt.y - palmCenter.y;
          return Math.sqrt(px * px + py * py);
        };

        const fingersCurled =
          distToPalm(indexTip) < 0.14 &&
          distToPalm(middleTip) < 0.14 &&
          distToPalm(ringTip) < 0.14;

        const isPinching = pinchDist < 0.08;
        const isGrabbing = isPinching || fingersCurled;

        rawHands.push({
          landmarks,
          handedness,
          palmCenter,
          indexTip: { x: indexTip.x, y: indexTip.y },
          thumbTip: { x: thumbTip.x, y: thumbTip.y },
          isPinching,
          isGrabbing,
          pinchDistance: pinchDist,
        });
      }
    }

    this.smoothHands(rawHands);
    this.callbacks.onHandsUpdate?.(this.smoothedHands);

    this.checkClap(this.smoothedHands);
    this.checkInteractions(this.smoothedHands);
  }

  private smoothHands(rawHands: HandData[]) {
    const alpha = 0.45;

    if (rawHands.length === 0) {
      this.smoothedHands = [];
      return;
    }

    this.smoothedHands = rawHands.map((rawHand, idx) => {
      const prev = this.smoothedHands[idx];
      if (!prev) return rawHand;

      return {
        ...rawHand,
        palmCenter: {
          x: prev.palmCenter.x + alpha * (rawHand.palmCenter.x - prev.palmCenter.x),
          y: prev.palmCenter.y + alpha * (rawHand.palmCenter.y - prev.palmCenter.y),
        },
        indexTip: {
          x: prev.indexTip.x + alpha * (rawHand.indexTip.x - prev.indexTip.x),
          y: prev.indexTip.y + alpha * (rawHand.indexTip.y - prev.indexTip.y),
        },
        thumbTip: {
          x: prev.thumbTip.x + alpha * (rawHand.thumbTip.x - prev.thumbTip.x),
          y: prev.thumbTip.y + alpha * (rawHand.thumbTip.y - prev.thumbTip.y),
        },
      };
    });
  }

  private checkClap(hands: HandData[]) {
    const now = performance.now();
    if (now - this.lastClapTime < this.clapCooldown) return;

    if (hands.length >= 2) {
      const handA = hands[0];
      const handB = hands[1];

      const dx = handA.palmCenter.x - handB.palmCenter.x;
      const dy = handA.palmCenter.y - handB.palmCenter.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      const isVeryClose = currentDist < 0.15;
      const isRapidConvergence =
        this.prevPalmDistance !== null &&
        this.prevPalmDistance - currentDist > 0.08 &&
        currentDist < 0.22;

      if (isVeryClose || isRapidConvergence) {
        this.lastClapTime = now;
        this.prevPalmDistance = null;
        this.callbacks.onClap?.();
        return;
      }

      this.prevPalmDistance = currentDist;
    } else {
      this.prevPalmDistance = null;
    }
  }

  private checkInteractions(hands: HandData[]) {
    if (hands.length === 0) {
      if (this.isCurrentlyGrabbing) {
        this.isCurrentlyGrabbing = false;
        this.grabHoldFrames = 0;
        this.callbacks.onGrabEnd?.(0.5, 0.5);
      }
      return;
    }

    const activeHand = hands.find((h) => h.isGrabbing) || hands[0];
    const interactionPt = {
      x: (activeHand.thumbTip.x + activeHand.indexTip.x) / 2,
      y: (activeHand.thumbTip.y + activeHand.indexTip.y) / 2,
    };

    const now = performance.now();

    if (this.lastHandPos) {
      const dt = (now - this.lastHandPos.time) / 1000;
      if (dt > 0.03 && dt < 0.3) {
        const vx = (activeHand.palmCenter.x - this.lastHandPos.x) / dt;
        const vy = (activeHand.palmCenter.y - this.lastHandPos.y) / dt;
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed > 2.2) {
          if (Math.abs(vx) > Math.abs(vy)) {
            this.callbacks.onSwipe?.(vx > 0 ? 'right' : 'left');
          } else {
            this.callbacks.onSwipe?.(vy > 0 ? 'down' : 'up');
          }
          this.lastHandPos = null;
        }
      }
    }
    this.lastHandPos = { x: activeHand.palmCenter.x, y: activeHand.palmCenter.y, time: now };

    if (activeHand.isGrabbing) {
      this.grabHoldFrames++;
      if (!this.isCurrentlyGrabbing && this.grabHoldFrames >= 2) {
        this.isCurrentlyGrabbing = true;
        this.callbacks.onGrabStart?.(interactionPt.x, interactionPt.y);
      } else if (this.isCurrentlyGrabbing) {
        this.callbacks.onGrabMove?.(interactionPt.x, interactionPt.y);
      }
    } else {
      if (this.isCurrentlyGrabbing) {
        this.isCurrentlyGrabbing = false;
        this.grabHoldFrames = 0;
        this.callbacks.onGrabEnd?.(interactionPt.x, interactionPt.y);
      } else {
        this.grabHoldFrames = 0;
      }
    }
  }
}
