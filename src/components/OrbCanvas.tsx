import React, { useEffect, useRef, useState } from 'react';
import { ExperienceState, HandData } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';

interface OrbCanvasProps {
  state: ExperienceState;
  hands: HandData[];
  handInteractionPoint: { x: number; y: number } | null;
  isGrabbingFromHand: boolean;
  dockPosition: { x: number; y: number }; // normalized (e.g. 0.65, 0.58)
  onStateChange: (newState: ExperienceState) => void;
  onOrbHoverDock: (isHovered: boolean) => void;
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
  dissolutionProgress: number; // 0 to 1
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

export const OrbCanvas: React.FC<OrbCanvasProps> = ({
  state,
  hands,
  handInteractionPoint,
  isGrabbingFromHand,
  dockPosition,
  onStateChange,
  onOrbHoverDock,
  encouragementText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Position of orb in viewport pixels
  const orbPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbTargetPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const orbRadiusRef = useRef<number>(100);

  // Internal state tracking
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation time
  const animTimeRef = useRef<number>(0);

  // Particles & filaments
  const particlesRef = useRef<Particle[]>([]);
  const filamentsRef = useRef<{ angleOffset: number; speed: number; radiusRatio: number; phase: number }[]>([]);
  const blackThreadsRef = useRef<Thread[]>([]);
  const goldenThreadsRef = useRef<{ pathProgress: number; points: { x: number; y: number }[] }[]>([]);

  // Dissolution timer & cloud morph factor
  const cloudMorphRef = useRef<number>(0); // 0 (crisp glass sphere) to 1 (soft cloud nebula)
  const formationProgressRef = useRef<number>(0);
  const dissolutionProgressRef = useRef<number>(0);

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

    // Luminous curved filaments inside glass sphere
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

  // Set default initial center position on mount / resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvasRef.current.width = w * window.devicePixelRatio;
      canvasRef.current.height = h * window.devicePixelRatio;

      // Center orb above desk initially
      if (state !== 'IDLE' && state !== 'ORB_DOCKING' && state !== 'ORB_GRABBED') {
        orbPosRef.current = { x: w * 0.5, y: h * 0.44 };
        orbTargetPosRef.current = { x: w * 0.5, y: h * 0.44 };
      } else if (state === 'IDLE') {
        orbPosRef.current = { x: w * dockPosition.x, y: h * dockPosition.y };
        orbTargetPosRef.current = { x: w * dockPosition.x, y: h * dockPosition.y };
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dockPosition]);

  // Handle state-specific initialization
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (state === 'ORB_FORMATION') {
      formationProgressRef.current = 0;
      soundSynthesizer.playOrbFormation();
    } else if (state === 'TAB_DISSOLUTION') {
      dissolutionProgressRef.current = 0;
      soundSynthesizer.playDissolution();
      // Auto transition to BLACK_THREADS after dissolution
      const timer = setTimeout(() => {
        onStateChange('BLACK_THREADS');
      }, 3500);
      return () => clearTimeout(timer);
    } else if (state === 'BLACK_THREADS') {
      soundSynthesizer.playBlackThreads();

      // Initialize black threads binding orb to desk
      const orbX = orbPosRef.current.x;
      const orbY = orbPosRef.current.y;
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

      // Auto transition to GOLDEN_THREADS after threads anchor
      const timer = setTimeout(() => {
        onStateChange('GOLDEN_THREADS');
      }, 2600);
      return () => clearTimeout(timer);
    } else if (state === 'GOLDEN_THREADS') {
      soundSynthesizer.playGoldenThreads();
      // Speak encouraging message
      soundSynthesizer.speakEncouragement(encouragementText, () => {
        // Start dissolving black threads as golden threads wrap them
        startThreadDissolution();
      });
    } else if (state === 'ORB_RELEASED') {
      // Cloud morph transition (Stage 6)
      cloudMorphRef.current = 0.85;
    } else if (state === 'IDLE') {
      soundSynthesizer.playDockSettled();
      orbTargetPosRef.current = { x: w * dockPosition.x, y: h * dockPosition.y };
    }
  }, [state, encouragementText]);

  // Dissolve black threads sequentially with golden sparkles
  const startThreadDissolution = () => {
    let threadIdx = 0;
    const interval = setInterval(() => {
      if (threadIdx < blackThreadsRef.current.length) {
        const t = blackThreadsRef.current[threadIdx];
        if (t) {
          t.dissolving = true;
          // Spawn golden sparks along thread
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
        // Once all threads dissolved, transition to ORB_RELEASED
        setTimeout(() => {
          blackThreadsRef.current = [];
          onStateChange('ORB_RELEASED');
        }, 1600);
      }
    }, 450);
  };

  // Hand grabbing sync logic
  useEffect(() => {
    if (state === 'ORB_RELEASED' || state === 'ORB_GRABBED') {
      if (handInteractionPoint && isGrabbingFromHand) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const handPx = { x: handInteractionPoint.x * w, y: handInteractionPoint.y * h };

        // Distance from hand to orb
        const dx = handPx.x - orbPosRef.current.x;
        const dy = handPx.y - orbPosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (state === 'ORB_RELEASED' && dist < orbRadiusRef.current * 1.6) {
          soundSynthesizer.playGrabChime();
          onStateChange('ORB_GRABBED');
        }

        if (state === 'ORB_GRABBED') {
          orbTargetPosRef.current = handPx;
          checkDockProximity(handPx);
        }
      } else if (state === 'ORB_GRABBED' && !isGrabbingFromHand) {
        // User opened hand / released grab
        handleRelease();
      }
    }
  }, [handInteractionPoint, isGrabbingFromHand, state]);

  const checkDockProximity = (currentPos: { x: number; y: number }) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dockPx = { x: w * dockPosition.x, y: h * dockPosition.y };

    const dx = currentPos.x - dockPx.x;
    const dy = currentPos.y - dockPx.y;
    const distToDock = Math.sqrt(dx * dx + dy * dy);

    const isHovered = distToDock < 140;
    onOrbHoverDock(isHovered);

    if (distToDock < 90) {
      // Snapping proximity
      orbTargetPosRef.current = dockPx;
      onStateChange('ORB_DOCKING');
      setTimeout(() => {
        onStateChange('IDLE');
        onOrbHoverDock(false);
      }, 700);
    }
  };

  const handleRelease = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dockPx = { x: w * dockPosition.x, y: h * dockPosition.y };
    const dx = orbPosRef.current.x - dockPx.x;
    const dy = orbPosRef.current.y - dockPx.y;
    const distToDock = Math.sqrt(dx * dx + dy * dy);

    if (distToDock < 140) {
      orbTargetPosRef.current = dockPx;
      onStateChange('ORB_DOCKING');
      setTimeout(() => {
        onStateChange('IDLE');
        onOrbHoverDock(false);
      }, 700);
    } else {
      // Released in mid-air: stay floating gently
      onStateChange('ORB_RELEASED');
    }
  };

  // Mouse & Touch Fallback handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state !== 'ORB_RELEASED' && state !== 'ORB_GRABBED') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - orbPosRef.current.x;
    const dy = mouseY - orbPosRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < orbRadiusRef.current * 1.4) {
      setIsMouseDragging(true);
      dragOffsetRef.current = { x: dx, y: dy };
      soundSynthesizer.playGrabChime();
      onStateChange('ORB_GRABBED');
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newTarget = {
      x: mouseX - dragOffsetRef.current.x,
      y: mouseY - dragOffsetRef.current.y,
    };
    orbTargetPosRef.current = newTarget;
    checkDockProximity(newTarget);
  };

  const handleMouseUp = () => {
    if (!isMouseDragging) return;
    setIsMouseDragging(false);
    handleRelease();
  };

  // Main 60fps render loop
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

      // Smooth position interpolation (Damped spring/lerp)
      const lerpSpeed = state === 'ORB_DOCKING' ? 0.12 : 0.2;
      orbPosRef.current.x += (orbTargetPosRef.current.x - orbPosRef.current.x) * lerpSpeed;
      orbPosRef.current.y += (orbTargetPosRef.current.y - orbPosRef.current.y) * lerpSpeed;

      // Add gentle floating oscillation when untethered or idle
      let floatY = 0;
      if (state === 'ORB_RELEASED' || state === 'INITIAL_WORK_TABS') {
        floatY = Math.sin(t * 1.5) * 8;
      } else if (state === 'IDLE') {
        floatY = Math.sin(t * 1.2) * 3;
      }

      const currentOrbX = orbPosRef.current.x;
      const currentOrbY = orbPosRef.current.y + floatY;

      // Breathing radius modulation
      const breathe = Math.sin(t * 2.2) * 2.5;
      const currentRadius = orbRadiusRef.current + breathe;

      // --- LAYER 1: BLACK THREADS ---
      if (blackThreadsRef.current.length > 0) {
        blackThreadsRef.current.forEach((thread) => {
          if (thread.dissolving) {
            thread.dissolutionProgress = Math.min(1, thread.dissolutionProgress + 0.02);
          }

          if (thread.dissolutionProgress < 1) {
            ctx.save();
            ctx.strokeStyle = `rgba(18, 18, 24, ${0.85 * (1 - thread.dissolutionProgress)})`;
            ctx.lineWidth = (3 - thread.dissolutionProgress * 2);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.moveTo(thread.startX, thread.startY);
            // Add subtle tension vibration
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

            // Render golden wrapping strands if in GOLDEN_THREADS state
            if (state === 'GOLDEN_THREADS' || thread.dissolving) {
              ctx.strokeStyle = `rgba(246, 214, 159, ${0.9 * (1 - thread.dissolutionProgress)})`;
              ctx.lineWidth = 1.5;
              ctx.shadowColor = 'rgba(246, 214, 159, 0.8)';
              ctx.shadowBlur = 12;
              ctx.stroke();
            }
            ctx.restore();
          }

          // Render dissolution sparks
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

      // --- LAYER 2: ORB FORMATION & DISSOLUTION STATES ---
      if (state === 'ORB_FORMATION') {
        formationProgressRef.current = Math.min(1, formationProgressRef.current + 0.018);
        renderFormationSpirals(ctx, currentOrbX, currentOrbY, formationProgressRef.current, t);
        if (formationProgressRef.current >= 1) {
          onStateChange('TAB_TRANSFER');
        }
      }

      // --- LAYER 3: HOLOGRAPHIC ORB RENDERING ---
      if (state !== 'INITIAL_WORK_TABS') {
        const isCloudState = state === 'ORB_RELEASED' || state === 'ORB_GRABBED' || state === 'ORB_DOCKING' || state === 'IDLE';

        if (isCloudState) {
          // Volumetric Nebular Cloud Orb (Stage 6-8 reference visual)
          renderCloudOrb(ctx, currentOrbX, currentOrbY, currentRadius, t, state === 'IDLE');
        } else {
          // Glass-like Holographic Orb with Filaments & Internal Dust (Stages 1-5 reference visual)
          renderGlassOrb(ctx, currentOrbX, currentOrbY, currentRadius, t, state);
        }
      }

      // --- LAYER 4: HAND TRACKING AR OVERLAY ---
      renderHandFeedback(ctx, hands, w, h);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state, hands]);

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

    // 1. Ambient outer aura glow
    const outerAura = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 2.2);
    outerAura.addColorStop(0, 'rgba(246, 214, 159, 0.28)');
    outerAura.addColorStop(0.5, 'rgba(180, 200, 255, 0.12)');
    outerAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerAura;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Clip internal rendering within orb boundary with slight glass refraction
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Internal deep core gradient
    const coreGrad = ctx.createRadialGradient(
      cx - radius * 0.2,
      cy - radius * 0.2,
      0,
      cx,
      cy,
      radius
    );
    coreGrad.addColorStop(0, 'rgba(255, 245, 220, 0.65)');
    coreGrad.addColorStop(0.3, 'rgba(246, 200, 140, 0.35)');
    coreGrad.addColorStop(0.7, 'rgba(120, 160, 230, 0.15)');
    coreGrad.addColorStop(1, 'rgba(20, 25, 40, 0.6)');
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 2. Internal swirling luminous filaments (thin curved light trails)
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

    // 3. Absorbed work fragments & stardust particles inside sphere
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

      // If in TAB_DISSOLUTION state, draw micro fragments softening
      if (currentState === 'TAB_DISSOLUTION') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(px - p.size, py - p.size, p.size * 2, p.size * 1.5);
      }
    });

    ctx.restore(); // end clip

    // 4. Glass Sphere Surface: Fresnel rim reflection & specular highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);

    // Rim highlight (Fresnel effect)
    const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    rimGrad.addColorStop(0.85, 'rgba(255, 240, 210, 0.35)');
    rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    // Delicate glass border stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = 'rgba(246, 214, 159, 0.6)';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Specular highlight crescent (top-left glass curvature reflection)
    ctx.beginPath();
    ctx.ellipse(
      cx - radius * 0.42,
      cy - radius * 0.42,
      radius * 0.32,
      radius * 0.16,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 14;
    ctx.fill();

    // Secondary subtle bottom specular bounce reflection
    ctx.beginPath();
    ctx.ellipse(
      cx + radius * 0.35,
      cy + radius * 0.45,
      radius * 0.28,
      radius * 0.08,
      -Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(245, 215, 170, 0.25)';
    ctx.fill();

    ctx.restore();
    ctx.restore();
  };

  // Render soft volumetric cloud / nebula orb (Stages 6, 7, 8)
  const renderCloudOrb = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    time: number,
    isDockedState: boolean
  ) => {
    ctx.save();

    // Breathing cloud size
    const cloudRadius = radius * 1.35;

    // 1. Outer celestial haze
    const outerNebula = ctx.createRadialGradient(cx, cy, cloudRadius * 0.2, cx, cy, cloudRadius * 2.4);
    outerNebula.addColorStop(0, 'rgba(255, 240, 215, 0.4)');
    outerNebula.addColorStop(0.4, 'rgba(245, 195, 130, 0.18)');
    outerNebula.addColorStop(0.8, 'rgba(160, 180, 220, 0.06)');
    outerNebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerNebula;
    ctx.beginPath();
    ctx.arc(cx, cy, cloudRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Layered cloud puffs (soft volumetric cumulus-like billows)
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

    // 3. Intense luminous radiant core
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

    // 4. Fine stardust motes swirling lazily through the cloud
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

  // Render particles spiraling inward to form the orb
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

  // Render subtle, non-intrusive AR hand feedback
  const renderHandFeedback = (
    ctx: CanvasRenderingContext2D,
    detectedHands: HandData[],
    w: number,
    h: number
  ) => {
    if (detectedHands.length === 0) return;

    ctx.save();
    detectedHands.forEach((hand) => {
      // Draw subtle palm center glow
      const px = hand.palmCenter.x * w;
      const py = hand.palmCenter.y * h;

      const aura = ctx.createRadialGradient(px, py, 2, px, py, 35);
      aura.addColorStop(0, hand.isGrabbing ? 'rgba(255, 200, 100, 0.45)' : 'rgba(160, 200, 255, 0.25)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(px, py, 35, 0, Math.PI * 2);
      ctx.fill();

      // Draw thumb & index pinch indicators
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

      // Line connecting thumb and index
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
        state === 'ORB_RELEASED' || state === 'ORB_GRABBED' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    />
  );
};
