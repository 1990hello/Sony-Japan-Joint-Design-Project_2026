import React, { useEffect, useRef, useState } from 'react';
import { ExperienceState, HandData } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';

interface OrbCanvasProps {
  state: ExperienceState;
  hands: HandData[];
  handInteractionPoint: { x: number; y: number } | null;
  isGrabbingFromHand: boolean;
  dockPosition: { x: number; y: number };
  onStateChange: (newState: ExperienceState, reason?: string) => void;
  onOrbHoverDock?: (hovered: boolean) => void;
  flickAction?: { vx: number; vy: number; speed: number; timestamp: number } | null;
  onAbsorbProgress?: (progress: number, activeParticles: number) => void;
  encouragementText: string;
}

interface Thread {
  startX: number;
  startY: number;
  controlX1: number;
  controlY1: number;
  controlX2: number;
  controlY2: number;
  endX: number;
  endY: number;
  dissolutionProgress: number;
  dissolving: boolean;
  sparks: { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[];
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  alpha: number;
  baseRadius: number;
  angle: number;
  speed: number;
}

interface WallRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface ImpactSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

interface DockFlight {
  start: { x: number; y: number };
  control: { x: number; y: number };
  target: { x: number; y: number };
  startTime: number;
  duration: number;
}

export const OrbCanvas: React.FC<OrbCanvasProps> = ({
  state,
  hands,
  handInteractionPoint,
  isGrabbingFromHand,
  dockPosition,
  onStateChange,
  onOrbHoverDock,
  flickAction,
  onAbsorbProgress,
  encouragementText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Position, Velocity, and Radius
  const orbPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbTargetPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbVelRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const orbRadiusRef = useRef<number>(95);

  // Throw & Catch State
  const lastReleasingHandRef = useRef<'Left' | 'Right' | null>(null);
  const throwCooldownUntilRef = useRef<number>(0);
  const handTrailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastProcessedFlickRef = useRef<number>(0);

  // Curved Flight to Dock (triggered by pinch + horizontal slide)
  const dockFlightRef = useRef<DockFlight | null>(null);
  const swipeShimmerRef = useRef<number>(0);

  // Visual Effects
  const ripplesRef = useRef<WallRipple[]>([]);
  const wallSparksRef = useRef<ImpactSpark[]>([]);
  const catchPulseRef = useRef<number>(0);

  // Mouse / Touch Dragging State
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseTrailRef = useRef<{ x: number; y: number; time: number }[]>([]);

  // Animation time
  const animTimeRef = useRef<number>(0);

  // Internal Particles, Filaments, and Threads
  const particlesRef = useRef<Particle[]>([]);
  const filamentsRef = useRef<{ angleOffset: number; speed: number; radiusRatio: number; phase: number }[]>([]);
  const blackThreadsRef = useRef<Thread[]>([]);
  const formationProgressRef = useRef<number>(0);
  const stateRef = useRef<ExperienceState>(state);
  const onAbsorbProgressRef = useRef(onAbsorbProgress);
  onAbsorbProgressRef.current = onAbsorbProgress;

  // Keep stateRef in sync for render loop without tearing
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle open-palm flick action from HandTracker
  useEffect(() => {
    if (!flickAction || flickAction.timestamp === lastProcessedFlickRef.current) return;
    lastProcessedFlickRef.current = flickAction.timestamp;

    const currentState = stateRef.current;

    // Requirement: When docked in IDLE, an open-palm flick ALONE must NOT launch from dock
    if (currentState === 'IDLE') {
      console.log('[OrbCanvas] Open-palm flick ignored while docked. Pick up orb first.');
      return;
    }

    const isPlayable =
      currentState === 'ORB_RELEASED' ||
      currentState === 'ORB_HELD' ||
      currentState === 'ORB_GRABBED' ||
      currentState === 'ORB_IN_FLIGHT' ||
      currentState === 'ORB_CAUGHT';

    if (isPlayable) {
      setIsMouseDragging(false);

      // Convert flick speed and direction into launch velocity
      const throwMultiplier = 1150;
      const maxVel = 1400;
      const vx = Math.max(-maxVel, Math.min(maxVel, flickAction.vx * throwMultiplier));
      const vy = Math.max(-maxVel, Math.min(maxVel, flickAction.vy * throwMultiplier));

      orbVelRef.current = { vx, vy };
      catchPulseRef.current = 1.3;
      soundSynthesizer.playBounceSound(1.2);

      // Launch sparks in throw direction
      for (let i = 0; i < 20; i++) {
        wallSparksRef.current.push({
          x: orbPosRef.current.x,
          y: orbPosRef.current.y,
          vx: vx * 0.25 + (Math.random() - 0.5) * 260,
          vy: vy * 0.25 + (Math.random() - 0.5) * 260,
          alpha: 1,
          size: Math.random() * 3 + 1,
          color: '#ffe099',
        });
      }

      const dirName = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      onStateChange('ORB_IN_FLIGHT', `Open-palm flick (${dirName}, speed=${flickAction.speed.toFixed(2)})`);
    }
  }, [flickAction, onStateChange]);

  // Initialize particles & filaments
  useEffect(() => {
    const parts: Particle[] = [];
    for (let i = 0; i < 220; i++) {
      const radius = Math.random() * 85 + 5;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.4 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1);
      parts.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.8 + 1.2,
        color: Math.random() > 0.3 ? '#f6d69f' : '#ffffff',
        alpha: Math.random() * 0.7 + 0.3,
        baseRadius: radius,
        angle,
        speed,
      });
    }
    particlesRef.current = parts;

    const fils = [];
    for (let i = 0; i < 9; i++) {
      fils.push({
        angleOffset: (i * Math.PI * 2) / 9,
        speed: 0.008 + (i % 3) * 0.004,
        radiusRatio: 0.4 + (i % 5) * 0.12,
        phase: Math.random() * Math.PI * 2,
      });
    }
    filamentsRef.current = fils;
  }, []);

  // Screen resize and initial position
  const dockX = dockPosition.x;
  const dockY = dockPosition.y;

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current.width = w * window.devicePixelRatio;
      canvasRef.current.height = h * window.devicePixelRatio;

      if (stateRef.current === 'IDLE' && !dockFlightRef.current) {
        orbPosRef.current = { x: w * dockX, y: h * dockY };
        orbTargetPosRef.current = { x: w * dockX, y: h * dockY };
      } else if (orbPosRef.current.x === 0) {
        orbPosRef.current = { x: w * 0.5, y: h * 0.44 };
        orbTargetPosRef.current = { x: w * 0.5, y: h * 0.44 };
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dockX, dockY]);

  // Stage Transitions Lifecycle (Guaranteed Automatic Progression)
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (state === 'ORB_FORMATION') {
      formationProgressRef.current = 0;
      soundSynthesizer.playOrbFormation();

      // Safe fallback timer: ensures formation always completes within 2.2s
      const timer = setTimeout(() => {
        if (stateRef.current === 'ORB_FORMATION') {
          onStateChange('TAB_TRANSFER', 'Orb formation completed (timer)');
        }
      }, 2200);
      return () => clearTimeout(timer);
    } else if (state === 'TAB_TRANSFER') {
      // Priority 1: Stage 3 Absorb Watchdog Fallback
      // Guarantees progression after 4.5s even if tab absorption triggers are delayed
      const timer = setTimeout(() => {
        if (stateRef.current === 'TAB_TRANSFER') {
          console.log('[OrbCanvas] Stage 3 Absorb watchdog fallback transitioning to TAB_DISSOLUTION');
          onStateChange('TAB_DISSOLUTION', 'Stage 3 Absorb watchdog timer (4.5s)');
        }
      }, 4500);
      return () => clearTimeout(timer);
    } else if (state === 'TAB_DISSOLUTION') {
      soundSynthesizer.playDissolution();
      // Tabs progressively dissolve into internal stardust particles and filaments
      const timer = setTimeout(() => {
        if (stateRef.current === 'TAB_DISSOLUTION') {
          onStateChange('BLACK_THREADS', 'Tab dissolution completed into filaments');
        }
      }, 3000);
      return () => clearTimeout(timer);
    } else if (state === 'BLACK_THREADS') {
      soundSynthesizer.playBlackThreads();

      const orbX = orbPosRef.current.x || w * 0.5;
      const orbY = orbPosRef.current.y || h * 0.44;
      const deskY = h * 0.76;
      const threads: Thread[] = [];

      for (let i = 0; i < 7; i++) {
        const spread = (i - 3) * 35;
        const startAngle = Math.PI * 0.25 + (i / 6) * Math.PI * 0.5;
        const startX = orbX + Math.cos(startAngle) * (orbRadiusRef.current * 0.9);
        const startY = orbY + Math.sin(startAngle) * (orbRadiusRef.current * 0.9);
        const endX = orbX + spread * 2.2;
        const endY = deskY + Math.sin(i) * 12;

        threads.push({
          startX,
          startY,
          controlX1: startX + (Math.random() - 0.5) * 40,
          controlY1: startY + 60,
          controlX2: endX + (Math.random() - 0.5) * 50,
          controlY2: endY - 40,
          endX,
          endY,
          dissolutionProgress: 0,
          dissolving: false,
          sparks: [],
        });
      }
      blackThreadsRef.current = threads;

      const timer = setTimeout(() => {
        if (stateRef.current === 'BLACK_THREADS') {
          onStateChange('GOLDEN_THREADS', 'Black threads anchored');
        }
      }, 2400);
      return () => clearTimeout(timer);
    } else if (state === 'GOLDEN_THREADS') {
      soundSynthesizer.playGoldenThreads();

      // Speak encouraging message with guaranteed fallback completion
      soundSynthesizer.speakEncouragement(encouragementText, () => {
        startThreadDissolution();
      });
    } else if (state === 'ORB_DOCKING') {
      soundSynthesizer.playSwipePulse();
      swipeShimmerRef.current = 1.0;
      orbVelRef.current = { vx: 0, vy: 0 };

      const dockPx = { x: w * dockX, y: h * dockY };
      const startPos = { x: orbPosRef.current.x, y: orbPosRef.current.y };
      const midX = (startPos.x + dockPx.x) / 2;
      const midY = Math.min(startPos.y, dockPx.y) - 130;

      dockFlightRef.current = {
        start: startPos,
        control: { x: midX, y: midY },
        target: dockPx,
        startTime: performance.now(),
        duration: 1.1,
      };
    } else if (state === 'IDLE' || state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING') {
      dockFlightRef.current = null;
      orbVelRef.current = { vx: 0, vy: 0 };
      orbPosRef.current = { x: w * dockX, y: h * dockY };
      orbTargetPosRef.current = { x: w * dockX, y: h * dockY };
    }
  }, [state, encouragementText, dockX, dockY, onStateChange]);

  // Dissolve black threads sequentially with golden sparkles
  const startThreadDissolution = () => {
    let threadIdx = 0;
    const interval = setInterval(() => {
      if (threadIdx < blackThreadsRef.current.length) {
        const t = blackThreadsRef.current[threadIdx];
        if (t) {
          t.dissolving = true;
          for (let s = 0; s < 18; s++) {
            t.sparks.push({
              x: t.startX + (t.endX - t.startX) * (s / 18),
              y: t.startY + (t.endY - t.startY) * (s / 18),
              vx: (Math.random() - 0.5) * 2,
              vy: -Math.random() * 2 - 0.5,
              alpha: 1,
              size: Math.random() * 3 + 1,
            });
          }
        }
        threadIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          blackThreadsRef.current = [];
          onStateChange('ORB_RELEASED', 'Threads dissolved; orb untethered');
        }, 1500);
      }
    }, 400);
  };

  // Wall Collision Event: Spawns glowing ripple ring and impact sparks
  const handleWallCollision = (x: number, y: number, surface: 'left' | 'right' | 'top' | 'desk') => {
    ripplesRef.current.push({
      x,
      y,
      radius: 8,
      maxRadius: 55,
      alpha: 0.9,
      color: '#ffe5b4',
    });

    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const angle =
        surface === 'left'
          ? (Math.random() - 0.5) * Math.PI
          : surface === 'right'
          ? Math.PI + (Math.random() - 0.5) * Math.PI
          : surface === 'top'
          ? Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI
          : -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;

      const spd = Math.random() * 220 + 80;
      wallSparksRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        alpha: 1,
        size: Math.random() * 2.5 + 1.2,
        color: Math.random() > 0.4 ? '#ffdf9e' : '#ffffff',
      });
    }

    const currentSpeed = Math.hypot(orbVelRef.current.vx, orbVelRef.current.vy);
    soundSynthesizer.playBounceSound(Math.min(1.5, currentSpeed / 300));
  };

  // Process Hand Tracking State in Animation Loop (Prevents Stale Props & Racing)
  const processHandInteractions = (w: number, h: number, now: number) => {
    const currentState = stateRef.current;
    const isPlayable =
      currentState === 'ORB_RELEASED' ||
      currentState === 'ORB_HELD' ||
      currentState === 'ORB_GRABBED' ||
      currentState === 'ORB_IN_FLIGHT' ||
      currentState === 'ORB_CAUGHT' ||
      currentState === 'IDLE' ||
      currentState === 'FOOTSTEPS_APPEARING' ||
      currentState === 'FOOTSTEPS_GUIDING';

    if (!isPlayable) return;

    // A. Pickup from Dock (when IDLE or FOOTSTEPS) or Floating (when ORB_RELEASED)
    if (
      currentState === 'IDLE' ||
      currentState === 'FOOTSTEPS_APPEARING' ||
      currentState === 'FOOTSTEPS_GUIDING' ||
      currentState === 'ORB_RELEASED'
    ) {
      if (handInteractionPoint && isGrabbingFromHand) {
        const handPx = { x: handInteractionPoint.x * w, y: handInteractionPoint.y * h };
        const dist = Math.hypot(handPx.x - orbPosRef.current.x, handPx.y - orbPosRef.current.y);

        if (dist < orbRadiusRef.current * 1.55) {
          soundSynthesizer.playGrabChime();
          catchPulseRef.current = 1.0;
          orbVelRef.current = { vx: 0, vy: 0 };
          orbTargetPosRef.current = handPx;
          handTrailRef.current = [{ x: handPx.x, y: handPx.y, time: now }];
          onStateChange('ORB_HELD', 'Picked up by hand');
        }
      }
    }

    // B. Holding the Orb (following hand) & Throw Release Detection
    else if (currentState === 'ORB_HELD' || currentState === 'ORB_GRABBED') {
      if (handInteractionPoint && isGrabbingFromHand) {
        const handPx = { x: handInteractionPoint.x * w, y: handInteractionPoint.y * h };
        orbTargetPosRef.current = handPx;

        // Record rolling hand position history
        handTrailRef.current.push({ x: handPx.x, y: handPx.y, time: now });
        handTrailRef.current = handTrailRef.current.filter((p) => now - p.time <= 200);
      } else if (!isGrabbingFromHand) {
        // Hand opened without a flick: gently release orb to float calmly
        orbVelRef.current = { vx: 0, vy: 0 };
        const activeHand = hands.find((h) => h.handedness);
        if (activeHand) {
          lastReleasingHandRef.current = activeHand.handedness;
        }
        throwCooldownUntilRef.current = now + 350;
        onStateChange('ORB_RELEASED', 'Released gently to float in air');
      }
    }

    // C. Catching the Orb in Flight by Any Eligible Hand
    else if (currentState === 'ORB_IN_FLIGHT') {
      for (const hand of hands) {
        // Prevent immediate re-catch by the releasing hand during cooldown
        if (hand.handedness === lastReleasingHandRef.current && now < throwCooldownUntilRef.current) {
          continue;
        }

        const handPx = {
          x: (hand.thumbTip.x + hand.indexTip.x) * 0.5 * w,
          y: (hand.thumbTip.y + hand.indexTip.y) * 0.5 * h,
        };
        const dist = Math.hypot(handPx.x - orbPosRef.current.x, handPx.y - orbPosRef.current.y);

        // Catch window: within radius and either grabbing, pinching, or close palm
        if (dist < orbRadiusRef.current * 1.55) {
          if (hand.isGrabbing || hand.pinchDistance < 0.12) {
            soundSynthesizer.playCatchChime();
            catchPulseRef.current = 1.0;
            orbVelRef.current = { vx: 0, vy: 0 };
            orbTargetPosRef.current = handPx;
            handTrailRef.current = [{ x: handPx.x, y: handPx.y, time: now }];
            onStateChange('ORB_HELD', `Caught by ${hand.handedness} hand`);
            break;
          }
        }
      }
    }
  };

  // Mouse & Touch Fallback: Pickup, Drag, Throw, Catch
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const currentState = stateRef.current;
    const isInteractive =
      currentState === 'ORB_RELEASED' ||
      currentState === 'ORB_HELD' ||
      currentState === 'ORB_GRABBED' ||
      currentState === 'ORB_IN_FLIGHT' ||
      currentState === 'IDLE' ||
      currentState === 'FOOTSTEPS_APPEARING' ||
      currentState === 'FOOTSTEPS_GUIDING';

    if (!isInteractive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - orbPosRef.current.x;
    const dy = mouseY - orbPosRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist < orbRadiusRef.current * 1.55) {
      setIsMouseDragging(true);
      dragOffsetRef.current = { x: dx, y: dy };
      mouseTrailRef.current = [{ x: mouseX, y: mouseY, time: performance.now() }];
      orbVelRef.current = { vx: 0, vy: 0 };

      if (currentState === 'ORB_IN_FLIGHT') {
        soundSynthesizer.playCatchChime();
        catchPulseRef.current = 1.0;
      } else {
        soundSynthesizer.playGrabChime();
      }

      onStateChange('ORB_HELD', 'Picked up with mouse');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const now = performance.now();

    mouseTrailRef.current.push({ x: mouseX, y: mouseY, time: now });
    mouseTrailRef.current = mouseTrailRef.current.filter((p) => now - p.time <= 160);

    const newTarget = {
      x: mouseX - dragOffsetRef.current.x,
      y: mouseY - dragOffsetRef.current.y,
    };
    orbTargetPosRef.current = newTarget;
  };

  const handleMouseUp = () => {
    if (!isMouseDragging) return;
    setIsMouseDragging(false);

    const trail = mouseTrailRef.current;
    if (trail.length >= 2) {
      const oldest = trail[0];
      const newest = trail[trail.length - 1];
      const dt = (newest.time - oldest.time) / 1000;

      if (dt > 0.02) {
        const vx = ((newest.x - oldest.x) / dt) * 1.15;
        const vy = ((newest.y - oldest.y) / dt) * 1.15;
        const speed = Math.hypot(vx, vy);

        if (speed > 100) {
          orbVelRef.current = {
            vx: Math.max(-1400, Math.min(1400, vx)),
            vy: Math.max(-1400, Math.min(1400, vy)),
          };
          onStateChange('ORB_IN_FLIGHT', `Thrown with mouse (speed=${speed.toFixed(0)})`);
          return;
        }
      }
    }

    orbVelRef.current = { vx: 0, vy: 0 };
    onStateChange('ORB_RELEASED', 'Released gently with mouse');
  };

  // Main 60fps Physics & Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      animTimeRef.current += 0.016;
      const t = animTimeRef.current;
      const dt = 0.016;
      const now = performance.now();
      const currentState = stateRef.current;

      // 1. Process Hand Catching, Holding, and Releases
      processHandInteractions(w, h, now);

      // 2. DOCKED FLIGHT TRAJECTORY (Single Owner during return-to-dock)
      if (dockFlightRef.current && currentState === 'ORB_DOCKING') {
        const flight = dockFlightRef.current;
        const elapsed = (now - flight.startTime) / 1000;
        const p = Math.min(1, elapsed / flight.duration);

        // Smooth cubic ease-in-out
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        const inv = 1 - ease;
        const bx = inv * inv * flight.start.x + 2 * inv * ease * flight.control.x + ease * ease * flight.target.x;
        const by = inv * inv * flight.start.y + 2 * inv * ease * flight.control.y + ease * ease * flight.target.y;

        orbPosRef.current = { x: bx, y: by };
        orbTargetPosRef.current = { x: bx, y: by };

        if (p >= 1) {
          dockFlightRef.current = null;
          orbPosRef.current = flight.target;
          orbTargetPosRef.current = flight.target;
          soundSynthesizer.playDockSettled();
          onStateChange('IDLE', 'Dock flight completed');
        }
      }

      // 3. ORB IN FLIGHT PHYSICS & WALL BOUNCES (Single Owner)
      else if (currentState === 'ORB_IN_FLIGHT') {
        const r = orbRadiusRef.current;

        orbPosRef.current.x += orbVelRef.current.vx * dt;
        orbPosRef.current.y += orbVelRef.current.vy * dt;

        // Buoyant gravity & drag
        orbVelRef.current.vy += 220 * dt;
        orbVelRef.current.vx *= 0.992;
        orbVelRef.current.vy *= 0.992;

        const restitution = 0.72;

        // Left wall collision
        if (orbPosRef.current.x - r < 18) {
          orbPosRef.current.x = 18 + r;
          orbVelRef.current.vx = -orbVelRef.current.vx * restitution;
          handleWallCollision(18, orbPosRef.current.y, 'left');
        }
        // Right wall collision
        else if (orbPosRef.current.x + r > w - 18) {
          orbPosRef.current.x = w - 18 - r;
          orbVelRef.current.vx = -orbVelRef.current.vx * restitution;
          handleWallCollision(w - 18, orbPosRef.current.y, 'right');
        }

        // Top ceiling collision
        if (orbPosRef.current.y - r < 20) {
          orbPosRef.current.y = 20 + r;
          orbVelRef.current.vy = -orbVelRef.current.vy * restitution;
          handleWallCollision(orbPosRef.current.x, 20, 'top');
        }
        // Bottom desk boundary collision
        else if (orbPosRef.current.y + r > h * 0.88) {
          orbPosRef.current.y = h * 0.88 - r;
          orbVelRef.current.vy = -orbVelRef.current.vy * restitution;
          handleWallCollision(orbPosRef.current.x, h * 0.88, 'desk');
        }

        orbTargetPosRef.current = { ...orbPosRef.current };
      }

      // 4. ORB HELD (Smooth Positional Attachment)
      else if (currentState === 'ORB_HELD' || currentState === 'ORB_GRABBED') {
        const lerpSpeed = 0.35;
        orbPosRef.current.x += (orbTargetPosRef.current.x - orbPosRef.current.x) * lerpSpeed;
        orbPosRef.current.y += (orbTargetPosRef.current.y - orbPosRef.current.y) * lerpSpeed;
      }

      // 5. FREE FLOATING OR IDLE DOCKED
      else {
        const lerpSpeed = 0.18;
        orbPosRef.current.x += (orbTargetPosRef.current.x - orbPosRef.current.x) * lerpSpeed;
        orbPosRef.current.y += (orbTargetPosRef.current.y - orbPosRef.current.y) * lerpSpeed;
      }

      // Subtle atmospheric floating oscillation
      let floatY = 0;
      if (currentState === 'ORB_RELEASED' || currentState === 'INITIAL_WORK_TABS') {
        floatY = Math.sin(t * 1.5) * 8;
      } else if (
        currentState === 'IDLE' ||
        currentState === 'FOOTSTEPS_APPEARING' ||
        currentState === 'FOOTSTEPS_GUIDING'
      ) {
        floatY = Math.sin(t * 1.2) * 3;
      }

      const currentOrbX = orbPosRef.current.x;
      const currentOrbY = orbPosRef.current.y + floatY;

      // Dynamic breathing + pulse effect
      const breathe = Math.sin(t * 2.2) * 2.5;
      const pulseEffect = catchPulseRef.current * 16;
      catchPulseRef.current = Math.max(0, catchPulseRef.current - 0.05);

      const currentRadius = orbRadiusRef.current + breathe + pulseEffect;

      // --- RENDER WALL RIPPLES ---
      if (ripplesRef.current.length > 0) {
        ctx.save();
        ripplesRef.current.forEach((rip) => {
          rip.radius += 2.2;
          rip.alpha -= 0.035;

          if (rip.alpha > 0) {
            ctx.strokeStyle = `rgba(255, 235, 180, ${rip.alpha})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(255, 215, 140, 0.9)';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
        ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0);
        ctx.restore();
      }

      // --- RENDER WALL SPARKS ---
      if (wallSparksRef.current.length > 0) {
        ctx.save();
        wallSparksRef.current.forEach((spark) => {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          spark.alpha -= 0.03;

          if (spark.alpha > 0) {
            ctx.fillStyle = spark.color;
            ctx.shadowColor = spark.color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = spark.alpha;

            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        wallSparksRef.current = wallSparksRef.current.filter((s) => s.alpha > 0);
        ctx.restore();
      }

      // --- RENDER BLACK THREADS ---
      if (blackThreadsRef.current.length > 0) {
        blackThreadsRef.current.forEach((thread) => {
          if (thread.dissolving) {
            thread.dissolutionProgress = Math.min(1, thread.dissolutionProgress + 0.02);
          }

          if (thread.dissolutionProgress < 1) {
            ctx.save();
            ctx.strokeStyle = `rgba(18, 18, 24, ${0.85 * (1 - thread.dissolutionProgress)})`;
            ctx.lineWidth = 3 - thread.dissolutionProgress * 2;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.moveTo(thread.startX, thread.startY);
            const vib = Math.sin(t * 8 + thread.startX) * 1.8;
            ctx.bezierCurveTo(
              thread.controlX1 + vib,
              thread.controlY1,
              thread.controlX2 - vib,
              thread.controlY2,
              thread.endX,
              thread.endY
            );
            ctx.stroke();

            if (currentState === 'GOLDEN_THREADS' || thread.dissolving) {
              ctx.strokeStyle = `rgba(246, 214, 159, ${0.9 * (1 - thread.dissolutionProgress)})`;
              ctx.lineWidth = 1.5;
              ctx.shadowColor = 'rgba(246, 214, 159, 0.8)';
              ctx.shadowBlur = 12;
              ctx.stroke();
            }
            ctx.restore();
          }

          if (thread.sparks.length > 0) {
            ctx.save();
            thread.sparks.forEach((spark) => {
              spark.x += spark.vx;
              spark.y += spark.vy;
              spark.alpha -= 0.02;

              if (spark.alpha > 0) {
                ctx.fillStyle = `rgba(255, 230, 160, ${spark.alpha})`;
                ctx.shadowColor = 'rgba(255, 200, 100, 0.9)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
                ctx.fill();
              }
            });
            ctx.restore();
          }
        });
      }

      // --- RENDER ORB FORMATION SPIRALS ---
      if (currentState === 'ORB_FORMATION') {
        formationProgressRef.current = Math.min(1, formationProgressRef.current + 0.016);
        renderFormationSpirals(ctx, currentOrbX, currentOrbY, formationProgressRef.current, t);
        if (formationProgressRef.current >= 1) {
          onStateChange('TAB_TRANSFER', 'Orb formed (animation complete)');
        }
      }

      // --- RENDER HOLOGRAPHIC ORB ---
      if (currentState !== 'INITIAL_WORK_TABS') {
        const isCloudMorph =
          currentState === 'ORB_RELEASED' ||
          currentState === 'ORB_HELD' ||
          currentState === 'ORB_GRABBED' ||
          currentState === 'ORB_IN_FLIGHT' ||
          currentState === 'ORB_CAUGHT' ||
          currentState === 'ORB_DOCKING' ||
          currentState === 'IDLE';

        if (isCloudMorph) {
          renderCloudOrb(ctx, currentOrbX, currentOrbY, currentRadius, t, currentState === 'IDLE');
        } else {
          renderGlassOrb(ctx, currentOrbX, currentOrbY, currentRadius, t, currentState);
        }

        // Horizontal Return Swipe Shimmer Glow
        if (swipeShimmerRef.current > 0) {
          ctx.save();
          const sh = swipeShimmerRef.current;
          ctx.strokeStyle = `rgba(255, 235, 180, ${sh * 0.85})`;
          ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(255, 215, 130, 1)';
          ctx.shadowBlur = 24;

          const shimmerLen = currentRadius * 3.2;
          ctx.beginPath();
          ctx.moveTo(currentOrbX - shimmerLen, currentOrbY);
          ctx.lineTo(currentOrbX + shimmerLen, currentOrbY);
          ctx.stroke();

          swipeShimmerRef.current = Math.max(0, swipeShimmerRef.current - 0.03);
          ctx.restore();
        }
      }

      // --- RENDER HAND TRACKING AR OVERLAY ---
      renderHandFeedback(ctx, hands, w, h);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hands, onStateChange]);

  // Render glass-like transparent holographic sphere
  const renderGlassOrb = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    time: number,
    currentState: ExperienceState
  ) => {
    ctx.save();

    const outerAura = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 2.2);
    outerAura.addColorStop(0, 'rgba(246, 214, 159, 0.28)');
    outerAura.addColorStop(0.5, 'rgba(180, 200, 255, 0.12)');
    outerAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerAura;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const coreGrad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, 0, cx, cy, radius);
    coreGrad.addColorStop(0, 'rgba(255, 245, 220, 0.65)');
    coreGrad.addColorStop(0.3, 'rgba(246, 200, 140, 0.35)');
    coreGrad.addColorStop(0.7, 'rgba(120, 160, 230, 0.15)');
    coreGrad.addColorStop(1, 'rgba(20, 25, 40, 0.6)');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    filamentsRef.current.forEach((fil, idx) => {
      ctx.save();
      const filAngle = time * fil.speed * 60 + fil.angleOffset;
      const r = radius * fil.radiusRatio;

      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(255, 235, 190, 0.75)' : 'rgba(210, 225, 255, 0.6)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(246, 214, 159, 0.9)';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      for (let step = 0; step < 24; step++) {
        const theta = filAngle + (step / 24) * Math.PI * 2;
        const wave = Math.sin(theta * 3 + fil.phase) * (radius * 0.18);
        const fx = cx + Math.cos(theta) * (r + wave);
        const fy = cy + Math.sin(theta) * (r * 0.7 + wave * 0.6);

        if (step === 0) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    particlesRef.current.forEach((p) => {
      p.angle += p.speed * 0.02;
      const currentR = p.baseRadius * (0.8 + Math.sin(time + p.angle) * 0.2);
      const px = cx + Math.cos(p.angle) * currentR;
      const py = cy + Math.sin(p.angle) * (currentR * 0.85);

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = p.alpha;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (currentState === 'TAB_DISSOLUTION') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(px - p.size, py - p.size, p.size * 2, p.size * 1.5);
      }
    });

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);

    const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rimGrad.addColorStop(0.85, 'rgba(255, 240, 210, 0.35)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = 'rgba(246, 214, 159, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.42, cy - radius * 0.42, radius * 0.32, radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx + radius * 0.35, cy + radius * 0.45, radius * 0.28, radius * 0.08, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 215, 170, 0.25)';
    ctx.fill();

    ctx.restore();
    ctx.restore();
  };

  // Render soft volumetric cloud / nebula orb
  const renderCloudOrb = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    time: number,
    isDockedState: boolean
  ) => {
    ctx.save();
    const cloudRadius = radius * 1.35;

    const outerNebula = ctx.createRadialGradient(cx, cy, cloudRadius * 0.2, cx, cy, cloudRadius * 2.4);
    outerNebula.addColorStop(0, 'rgba(255, 240, 215, 0.4)');
    outerNebula.addColorStop(0.4, 'rgba(245, 195, 130, 0.18)');
    outerNebula.addColorStop(0.8, 'rgba(160, 180, 220, 0.06)');
    outerNebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerNebula;
    ctx.beginPath();
    ctx.arc(cx, cy, cloudRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    const puffCount = 16;
    for (let i = 0; i < puffCount; i++) {
      const angle = (i / puffCount) * Math.PI * 2 + time * 0.12;
      const dist = cloudRadius * 0.42 + Math.sin(time * 1.5 + i * 2) * (cloudRadius * 0.15);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const puffR = cloudRadius * (0.45 + Math.sin(i * 3 + time) * 0.12);

      const puffGrad = ctx.createRadialGradient(px, py, puffR * 0.1, px, py, puffR);
      puffGrad.addColorStop(0, 'rgba(255, 252, 245, 0.75)');
      puffGrad.addColorStop(0.4, 'rgba(250, 230, 195, 0.45)');
      puffGrad.addColorStop(0.8, 'rgba(235, 190, 140, 0.15)');
      puffGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = puffGrad;
      ctx.beginPath();
      ctx.arc(px, py, puffR, 0, Math.PI * 2);
      ctx.fill();
    }

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cloudRadius * 0.65);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    coreGrad.addColorStop(0.3, 'rgba(255, 240, 200, 0.85)');
    coreGrad.addColorStop(0.7, 'rgba(245, 190, 120, 0.4)');
    coreGrad.addColorStop(1, 'rgba(245, 190, 120, 0)');
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = 'rgba(255, 230, 180, 0.95)';
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(cx, cy, cloudRadius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    particlesRef.current.slice(0, 80).forEach((p) => {
      p.angle += p.speed * 0.01;
      const r = p.baseRadius * 1.1;
      const px = cx + Math.cos(p.angle) * r;
      const py = cy + Math.sin(p.angle) * r;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffe7b3';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = p.alpha * (isDockedState ? 0.6 : 0.8);

      ctx.beginPath();
      ctx.arc(px, py, p.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  const renderFormationSpirals = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    progress: number,
    time: number
  ) => {
    ctx.save();
    const count = 70;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 6 + time * 3;
      const dist = (1 - progress) * (window.innerWidth * 0.35) * (1 - (i / count) * 0.3);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;

      ctx.fillStyle = 'rgba(255, 235, 180, 0.85)';
      ctx.shadowColor = 'rgba(246, 214, 159, 0.9)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(px, py, 2.5 * progress + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const renderHandFeedback = (
    ctx: CanvasRenderingContext2D,
    detectedHands: HandData[],
    w: number,
    h: number
  ) => {
    if (detectedHands.length === 0) return;

    ctx.save();
    detectedHands.forEach((hand) => {
      const px = hand.palmCenter.x * w;
      const py = hand.palmCenter.y * h;

      const aura = ctx.createRadialGradient(px, py, 2, px, py, 35);
      aura.addColorStop(0, hand.isGrabbing ? 'rgba(255, 200, 100, 0.45)' : 'rgba(160, 200, 255, 0.25)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(px, py, 35, 0, Math.PI * 2);
      ctx.fill();

      const ix = hand.indexTip.x * w;
      const iy = hand.indexTip.y * h;
      const tx = hand.thumbTip.x * w;
      const ty = hand.thumbTip.y * h;

      ctx.fillStyle = hand.isPinching ? 'rgba(255, 220, 130, 0.9)' : 'rgba(200, 230, 255, 0.6)';
      ctx.shadowColor = 'rgba(246, 214, 159, 0.8)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.arc(ix, iy, 4, 0, Math.PI * 2);
      ctx.arc(tx, ty, 4, 0, Math.PI * 2);
      ctx.fill();

      if (hand.pinchDistance < 0.12) {
        ctx.strokeStyle = 'rgba(255, 220, 130, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    });
    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as any);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as any);
      }}
      onTouchEnd={handleMouseUp}
      className={`absolute inset-0 w-full h-full z-20 ${
        state === 'ORB_RELEASED' || state === 'ORB_HELD' || state === 'ORB_GRABBED' || state === 'ORB_IN_FLIGHT' || state === 'IDLE'
          ? 'cursor-grab active:cursor-grabbing'
          : 'cursor-default'
      }`}
    />
  );
};
