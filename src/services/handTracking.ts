import { HandData, HandLandmark } from '../types';

declare global {
  interface Window {
    Hands?: any;
  }
}

export interface HandTrackerCallbacks {
  onClap?: () => void;
  onGrabStart?: (x: number, y: number, handedness: 'Left' | 'Right') => void;
  onGrabMove?: (x: number, y: number, handedness: 'Left' | 'Right') => void;
  onGrabEnd?: (x: number, y: number, vx: number, vy: number, handedness: 'Left' | 'Right') => void;
  onFlick?: (vx: number, vy: number, handedness: 'Left' | 'Right', speed: number) => void;
  onPinchSlideReturn?: (direction: 'left' | 'right', handedness: 'Left' | 'Right') => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  onHandsUpdate?: (hands: HandData[]) => void;
  onCameraStatusChange?: (status: 'ready' | 'loading' | 'denied' | 'unsupported') => void;
}

interface HandHistory {
  positions: { x: number; y: number; time: number }[];
  lastVelocity: { vx: number; vy: number };
}

interface PinchTrackingState {
  startX: number;
  startY: number;
  startTime: number;
  isActive: boolean;
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
  private grabbingHandedness: 'Left' | 'Right' | null = null;
  private grabHoldFrames: number = 0;

  // Multi-hand velocity & trajectory history (350ms window)
  private handHistories: Map<string, HandHistory> = new Map();

  // Pinch-and-Horizontal-Slide return tracking
  private pinchTrackers: Map<string, PinchTrackingState> = new Map();
  private lastPinchSlideTime: number = 0;
  private pinchSlideCooldown: number = 1100; // ms lockout

  // Open-palm flick detection & cooldown lockout
  private lastFlickTime: number = 0;
  private flickCooldown: number = 480; // ms lockout
  private isFlickArmed: boolean = true; // Requires returning to neutral speed before re-arming
  public minFlickSpeed: number = 0.60; // Normalized screen distance / sec
  public minFlickDisplacement: number = 0.045; // Min travel distance

  // Legacy swipe telemetry
  public lastDetectedSwipeDir: string | null = null;
  public lastSwipeVelocity: number = 0;

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

    // 2. Safely acquire webcam stream
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
          // ignore
        }
      }

      this.isRunning = true;
      this.callbacks.onCameraStatusChange?.('ready');
      this.startFrameLoop();
    } catch (err: any) {
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
          // ignore
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
    const now = performance.now();

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
        const pinkyTip = landmarks[20];

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

        // Palm scale reference (distance from wrist to indexMCP)
        const palmScale = Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y) || 0.12;

        // Check finger extension relative to palm scale
        const indexExt = distToPalm(indexTip) > palmScale * 0.95;
        const middleExt = distToPalm(middleTip) > palmScale * 0.95;
        const ringExt = distToPalm(ringTip) > palmScale * 0.90;
        const pinkyExt = distToPalm(pinkyTip) > palmScale * 0.85;

        const extendedFingerCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);

        // Open Palm: At least 3 extended fingers, not pinching, and tips not curled
        const isPinching = pinchDist < 0.088;
        const fingersCurled =
          distToPalm(indexTip) < 0.13 &&
          distToPalm(middleTip) < 0.13 &&
          distToPalm(ringTip) < 0.13;

        const isGrabbing = isPinching || fingersCurled;
        const isOpenPalm = extendedFingerCount >= 3 && !isPinching && !fingersCurled && pinchDist > 0.098;
        const openPalmConfidence = isOpenPalm ? Math.min(1, 0.4 + extendedFingerCount * 0.15) : 0;

        // Maintain rolling history of hand positions (keep last 350ms)
        const histKey = handedness;
        let hist = this.handHistories.get(histKey);
        if (!hist) {
          hist = { positions: [], lastVelocity: { vx: 0, vy: 0 } };
          this.handHistories.set(histKey, hist);
        }

        // Record palm center trajectory
        hist.positions.push({ x: palmCenter.x, y: palmCenter.y, time: now });
        hist.positions = hist.positions.filter((p) => now - p.time <= 350);

        // Calculate velocity across recent 150ms window
        if (hist.positions.length >= 2) {
          const recentPts = hist.positions.filter((p) => now - p.time <= 160);
          const oldest = recentPts[0] || hist.positions[0];
          const dt = (now - oldest.time) / 1000;
          if (dt > 0.02) {
            hist.lastVelocity = {
              vx: (palmCenter.x - oldest.x) / dt,
              vy: (palmCenter.y - oldest.y) / dt,
            };
          }
        }

        rawHands.push({
          landmarks,
          handedness,
          palmCenter,
          indexTip: { x: indexTip.x, y: indexTip.y },
          thumbTip: { x: thumbTip.x, y: thumbTip.y },
          isPinching,
          isGrabbing,
          isOpenPalm,
          openPalmConfidence,
          pinchDistance: pinchDist,
          velocity: hist.lastVelocity,
        });
      }
    }

    this.smoothHands(rawHands);
    this.callbacks.onHandsUpdate?.(this.smoothedHands);

    // 1. Clap detection for Stage 1 initial trigger
    this.checkClap(this.smoothedHands);

    // 2. Pinch + Horizontal Slide to return orb home
    this.checkPinchSlideReturn(this.smoothedHands, now);

    // 3. Open-Palm Flick to launch orb into free flight
    this.checkOpenPalmFlick(this.smoothedHands, now);

    // 4. Hand grabbing / pickup tracking
    this.checkInteractions(this.smoothedHands);
  }

  private smoothHands(rawHands: HandData[]) {
    const alpha = 0.52;

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
        isOpenPalm: rawHand.isOpenPalm,
        openPalmConfidence: rawHand.openPalmConfidence,
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

      const isVeryClose = currentDist < 0.16;
      const isRapidConvergence =
        this.prevPalmDistance !== null &&
        this.prevPalmDistance - currentDist > 0.07 &&
        currentDist < 0.24;

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

  /**
   * Priority 3: Pinch and Horizontal Slide for Returning Home
   * User pinches fingers, and while maintaining the pinch, slides horizontally left or right.
   */
  private checkPinchSlideReturn(hands: HandData[], now: number) {
    if (now - this.lastPinchSlideTime < this.pinchSlideCooldown) return;

    for (const hand of hands) {
      const key = hand.handedness;
      let tracker = this.pinchTrackers.get(key);

      if (hand.isPinching) {
        if (!tracker || !tracker.isActive) {
          // Pinch initiated: establish anchor
          tracker = {
            startX: hand.palmCenter.x,
            startY: hand.palmCenter.y,
            startTime: now,
            isActive: true,
          };
          this.pinchTrackers.set(key, tracker);
        } else {
          // Pinch maintained: test horizontal displacement
          const dx = hand.palmCenter.x - tracker.startX;
          const dy = hand.palmCenter.y - tracker.startY;
          const dt = (now - tracker.startTime) / 1000;

          // Deliberate horizontal slide criteria:
          // |dx| >= 0.075, horizontal dominates vertical (|dx| > 1.25 * |dy|), within 80ms - 550ms
          if (dt >= 0.08 && dt <= 0.55 && Math.abs(dx) >= 0.075 && Math.abs(dx) > Math.abs(dy) * 1.25) {
            const dir = dx > 0 ? 'right' : 'left';
            this.lastPinchSlideTime = now;
            this.lastDetectedSwipeDir = dir;
            tracker.isActive = false;

            console.log(`[HandTracker] Pinch-and-horizontal-slide return recognized (${dir}, dx=${dx.toFixed(2)})`);
            this.callbacks.onPinchSlideReturn?.(dir, hand.handedness);
            this.callbacks.onSwipe?.(dir);
            return;
          }
        }
      } else {
        if (tracker) {
          tracker.isActive = false;
        }
      }
    }
  }

  /**
   * Priority 2: Open-Palm Flick for Throwing / Free-Flight
   * User performs a quick, deliberate movement with an open palm.
   */
  private checkOpenPalmFlick(hands: HandData[], now: number) {
    if (hands.length === 0) return;

    // Check if hands have returned to neutral speed to re-arm flick detection
    for (const hand of hands) {
      const hist = this.handHistories.get(hand.handedness);
      const speed = Math.hypot(hist?.lastVelocity.vx || 0, hist?.lastVelocity.vy || 0);

      if (speed < 0.25) {
        this.isFlickArmed = true;
      }
    }

    if (!this.isFlickArmed || now - this.lastFlickTime < this.flickCooldown) return;

    for (const hand of hands) {
      // Must be an open palm (fingers extended, not pinching)
      if (!hand.isOpenPalm) continue;

      const hist = this.handHistories.get(hand.handedness);
      if (!hist || hist.positions.length < 3) continue;

      // Inspect recent 80ms - 220ms trajectory of palm center
      const recentPts = hist.positions.filter((p) => now - p.time <= 200);
      if (recentPts.length < 2) continue;

      const oldest = recentPts[0];
      const newest = recentPts[recentPts.length - 1];
      const dt = (newest.time - oldest.time) / 1000;
      if (dt < 0.04) continue;

      const dx = newest.x - oldest.x;
      const dy = newest.y - oldest.y;
      const displacement = Math.hypot(dx, dy);
      const speed = displacement / dt;

      // Flick criteria: deliberate rapid movement with open hand
      if (speed >= this.minFlickSpeed && displacement >= this.minFlickDisplacement) {
        const vx = dx / dt;
        const vy = dy / dt;

        this.lastFlickTime = now;
        this.isFlickArmed = false; // Require returning to neutral before re-arming

        console.log(
          `[HandTracker] Open-palm flick recognized: hand=${hand.handedness}, vx=${vx.toFixed(2)}, vy=${vy.toFixed(2)}, speed=${speed.toFixed(2)}`
        );

        this.callbacks.onFlick?.(vx, vy, hand.handedness, speed);
        return;
      }
    }
  }

  private checkInteractions(hands: HandData[]) {
    if (hands.length === 0) {
      if (this.isCurrentlyGrabbing && this.grabbingHandedness) {
        this.isCurrentlyGrabbing = false;
        const handedness = this.grabbingHandedness;
        this.grabbingHandedness = null;
        this.grabHoldFrames = 0;
        this.callbacks.onGrabEnd?.(0.5, 0.5, 0, 0, handedness);
      }
      return;
    }

    // Hand pickup / grab tracking
    if (this.isCurrentlyGrabbing && this.grabbingHandedness) {
      const activeHand = hands.find((h) => h.handedness === this.grabbingHandedness);

      if (activeHand && activeHand.isGrabbing) {
        const pt = {
          x: (activeHand.thumbTip.x + activeHand.indexTip.x) / 2,
          y: (activeHand.thumbTip.y + activeHand.indexTip.y) / 2,
        };
        this.callbacks.onGrabMove?.(pt.x, pt.y, this.grabbingHandedness);
      } else {
        this.isCurrentlyGrabbing = false;
        const handedness = this.grabbingHandedness;
        this.grabbingHandedness = null;
        this.grabHoldFrames = 0;

        const hist = this.handHistories.get(handedness);
        const vx = hist?.lastVelocity.vx || 0;
        const vy = hist?.lastVelocity.vy || 0;

        const pt = activeHand
          ? {
              x: (activeHand.thumbTip.x + activeHand.indexTip.x) / 2,
              y: (activeHand.thumbTip.y + activeHand.indexTip.y) / 2,
            }
          : { x: 0.5, y: 0.5 };

        this.callbacks.onGrabEnd?.(pt.x, pt.y, vx, vy, handedness);
      }
      return;
    }

    const newGrabbingHand = hands.find((h) => h.isGrabbing);
    if (newGrabbingHand) {
      this.grabHoldFrames++;
      if (this.grabHoldFrames >= 2) {
        this.isCurrentlyGrabbing = true;
        this.grabbingHandedness = newGrabbingHand.handedness;
        const pt = {
          x: (newGrabbingHand.thumbTip.x + newGrabbingHand.indexTip.x) / 2,
          y: (newGrabbingHand.thumbTip.y + newGrabbingHand.indexTip.y) / 2,
        };
        this.callbacks.onGrabStart?.(pt.x, pt.y, newGrabbingHand.handedness);
      }
    } else {
      this.grabHoldFrames = 0;
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      handCount: this.smoothedHands.length,
      isCurrentlyGrabbing: this.isCurrentlyGrabbing,
      grabbingHandedness: this.grabbingHandedness,
      lastSwipeDir: this.lastDetectedSwipeDir,
    };
  }
}
