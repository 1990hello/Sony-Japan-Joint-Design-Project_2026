import React, { useEffect, useRef } from 'react';
import { ExperienceState } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';

interface FootstepTrailProps {
  state: ExperienceState;
  dockPosition: { x: number; y: number };
  onTrailComplete: () => void;
}

interface TrailPoint {
  id: number;
  isRightFoot: boolean;
  xNorm: number; // 0..1 normalized
  yNorm: number; // 0..1 normalized
  angleDeg: number;
  perspectiveScale: number;
  revealTimeMs: number; // offset in ms from start of reveal
}

interface DriftParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PathSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

// 10 Footprints (5 alternating pairs) naturally curving from floor near desk across to doorway
const TRAIL_WAYPOINTS: TrailPoint[] = [
  // Pair 1: Near desk base on the floor
  { id: 0, isRightFoot: true,  xNorm: 0.655, yNorm: 0.825, angleDeg: -152, perspectiveScale: 1.00, revealTimeMs: 0 },
  { id: 1, isRightFoot: false, xNorm: 0.595, yNorm: 0.800, angleDeg: -154, perspectiveScale: 0.94, revealTimeMs: 440 },

  // Pair 2: Moving forward & leftward into the center room
  { id: 2, isRightFoot: true,  xNorm: 0.535, yNorm: 0.772, angleDeg: -156, perspectiveScale: 0.88, revealTimeMs: 880 },
  { id: 3, isRightFoot: false, xNorm: 0.472, yNorm: 0.745, angleDeg: -158, perspectiveScale: 0.82, revealTimeMs: 1320 },

  // Pair 3: Gentle arch through the open room
  { id: 4, isRightFoot: true,  xNorm: 0.410, yNorm: 0.718, angleDeg: -160, perspectiveScale: 0.76, revealTimeMs: 1760 },
  { id: 5, isRightFoot: false, xNorm: 0.350, yNorm: 0.692, angleDeg: -162, perspectiveScale: 0.70, revealTimeMs: 2200 },

  // Pair 4: Approaching the doorway threshold
  { id: 6, isRightFoot: true,  xNorm: 0.292, yNorm: 0.668, angleDeg: -164, perspectiveScale: 0.64, revealTimeMs: 2640 },
  { id: 7, isRightFoot: false, xNorm: 0.238, yNorm: 0.648, angleDeg: -166, perspectiveScale: 0.58, revealTimeMs: 3080 },

  // Pair 5: Landing directly at the bedroom doorway portal
  { id: 8, isRightFoot: true,  xNorm: 0.188, yNorm: 0.630, angleDeg: -168, perspectiveScale: 0.52, revealTimeMs: 3520 },
  { id: 9, isRightFoot: false, xNorm: 0.142, yNorm: 0.615, angleDeg: -170, perspectiveScale: 0.46, revealTimeMs: 3960 },
];

export const FootstepTrail: React.FC<FootstepTrailProps> = ({
  state,
  dockPosition,
  onTrailComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation timeline state
  const isStartedRef = useRef<boolean>(false);
  const startTimestampRef = useRef<number>(0);
  const driftParticlesRef = useRef<DriftParticle[]>([]);
  const pathSparklesRef = useRef<PathSparkle[]>([]);
  const hasTriggeredAudioStepsRef = useRef<Set<number>>(new Set());
  const hasTriggeredAwakenAudioRef = useRef<boolean>(false);
  const hasTriggeredDoorwayAudioRef = useRef<boolean>(false);
  const hasCompletedTrailRef = useRef<boolean>(false);

  // Threshold doorway ripple effect
  const doorwayRipplesRef = useRef<{ radius: number; maxRadius: number; alpha: number }[]>([]);

  const isGuidingState = state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING';

  useEffect(() => {
    if (state === 'FOOTSTEPS_APPEARING') {
      isStartedRef.current = true;
      startTimestampRef.current = performance.now();
      hasTriggeredAudioStepsRef.current.clear();
      hasTriggeredAwakenAudioRef.current = false;
      hasTriggeredDoorwayAudioRef.current = false;
      hasCompletedTrailRef.current = false;
      doorwayRipplesRef.current = [];
    } else if (state === 'FOOTSTEPS_GUIDING') {
      isStartedRef.current = true;
      // If entered GUIDING directly (e.g. via Dev Tray jump), establish start in past
      if (startTimestampRef.current === 0) {
        startTimestampRef.current = performance.now() - 6000;
      }
      hasCompletedTrailRef.current = true;
    } else if (
      state === 'INITIAL_WORK_TABS' ||
      state === 'ORB_FORMATION' ||
      state === 'TAB_TRANSFER' ||
      state === 'TAB_DISSOLUTION' ||
      state === 'BLACK_THREADS' ||
      state === 'GOLDEN_THREADS'
    ) {
      // Complete reset on experience restart
      isStartedRef.current = false;
      startTimestampRef.current = 0;
      driftParticlesRef.current = [];
      pathSparklesRef.current = [];
      doorwayRipplesRef.current = [];
      hasCompletedTrailRef.current = false;
    }
  }, [state]);

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Handle Resize / DPI
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (!isStartedRef.current) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      const elapsed = time - startTimestampRef.current;

      // ==========================================
      // PHASE 1: PARTICLES DRIFT FROM DOCK TO FLOOR
      // (Elapsed: 0ms to 1800ms)
      // ==========================================
      const dockScreenX = dockPosition.x * w;
      const dockScreenY = dockPosition.y * h + 25; // Base of bonsai pedestal
      const floorTargetX = TRAIL_WAYPOINTS[0].xNorm * w;
      const floorTargetY = TRAIL_WAYPOINTS[0].yNorm * h;

      if (elapsed < 2400) {
        if (!hasTriggeredAwakenAudioRef.current && elapsed > 200) {
          hasTriggeredAwakenAudioRef.current = true;
          soundSynthesizer.playFootstepAwaken();
        }

        // Spawn golden-white drift particles descending from dock
        if (Math.random() < 0.65) {
          const t = Math.random();
          const startX = dockScreenX + (Math.random() - 0.5) * 50;
          const startY = dockScreenY + Math.random() * 10;
          driftParticlesRef.current.push({
            x: startX,
            y: startY,
            vx: (floorTargetX - startX) * 0.015 + (Math.random() - 0.5) * 0.8,
            vy: Math.random() * 1.8 + 1.2,
            alpha: 0,
            maxAlpha: Math.random() * 0.75 + 0.25,
            size: Math.random() * 2.8 + 1.2,
            life: 0,
            maxLife: Math.random() * 70 + 60,
            color: Math.random() > 0.3 ? '#fef3c7' : '#ffffff',
          });
        }
      }

      // Update & Draw Drift Particles
      ctx.save();
      for (let i = driftParticlesRef.current.length - 1; i >= 0; i--) {
        const p = driftParticlesRef.current[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Gentle curvature towards floor target
        p.vx += (floorTargetX - p.x) * 0.0006;
        p.vy += 0.02; // slight gravity

        const progress = p.life / p.maxLife;
        if (progress < 0.25) {
          p.alpha = (progress / 0.25) * p.maxAlpha;
        } else {
          p.alpha = (1 - progress) * p.maxAlpha;
        }

        if (progress >= 1) {
          driftParticlesRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = p.size * 3;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Floor gathering soft glow patch under desk base
      if (elapsed > 400 && elapsed < 3200) {
        const gatherAlpha = Math.min(1, (elapsed - 400) / 900) * Math.max(0, 1 - (elapsed - 1800) / 1400);
        ctx.save();
        ctx.globalAlpha = gatherAlpha * 0.45;
        const grad = ctx.createRadialGradient(floorTargetX, floorTargetY, 2, floorTargetX, floorTargetY, 70);
        grad.addColorStop(0, 'rgba(255, 230, 170, 0.6)');
        grad.addColorStop(0.5, 'rgba(245, 195, 120, 0.2)');
        grad.addColorStop(1, 'rgba(245, 195, 120, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(floorTargetX, floorTargetY, 65, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ==========================================
      // PHASE 2: SEQUENTIAL FOOTSTEP MATERIALIZATION
      // (Elapsed: 1200ms onwards)
      // ==========================================
      const FOOTSTEP_BASE_START = 1200;

      TRAIL_WAYPOINTS.forEach((wp, index) => {
        const stepAppearTime = FOOTSTEP_BASE_START + wp.revealTimeMs;
        if (elapsed < stepAppearTime) return;

        // Play gentle harmonic chime when this step begins to appear
        if (!hasTriggeredAudioStepsRef.current.has(index)) {
          hasTriggeredAudioStepsRef.current.add(index);
          soundSynthesizer.playFootstepStep(index);

          // Spawn burst of path sparkles travelling towards next footprint
          const stepX = wp.xNorm * w;
          const stepY = wp.yNorm * h;
          for (let s = 0; s < 8; s++) {
            const spd = Math.random() * 1.5 + 0.4;
            const angle = (wp.angleDeg * Math.PI) / 180 + (Math.random() - 0.5) * 0.8;
            pathSparklesRef.current.push({
              x: stepX + (Math.random() - 0.5) * 12,
              y: stepY + (Math.random() - 0.5) * 6,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              alpha: 0.95,
              size: Math.random() * 2.2 + 0.8,
              color: Math.random() > 0.4 ? '#fde68a' : '#ffffff',
            });
          }
        }

        // Calculate Footprint Fade-in and Ambient Breathing
        const stepAge = elapsed - stepAppearTime;
        const fadeInProgress = Math.min(1, stepAge / 700); // smooth 700ms materialize

        // Ambient breathing pulse once fully appeared
        // Slow peaceful breathing wave travelling along the path (frequency 1.4 rad/s)
        const wavePhase = (time * 0.0016) - (index * 0.35);
        const breathingFactor = 0.82 + Math.sin(wavePhase) * 0.18;

        // Base opacity: translucent, delicate, luminous
        const baseAlpha = fadeInProgress * breathingFactor;

        // Perspective scale & coordinates
        const posX = wp.xNorm * w;
        const posY = wp.yNorm * h;
        const scale = wp.perspectiveScale;

        drawFootprint(ctx, posX, posY, wp.angleDeg, scale, wp.isRightFoot, baseAlpha);
      });

      // Update & Render Path Sparkles
      ctx.save();
      for (let s = pathSparklesRef.current.length - 1; s >= 0; s--) {
        const sp = pathSparklesRef.current[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= 0.022;

        if (sp.alpha <= 0) {
          pathSparklesRef.current.splice(s, 1);
          continue;
        }

        ctx.fillStyle = sp.color;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.globalAlpha = sp.alpha;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ==========================================
      // PHASE 3: DOORWAY THRESHOLD PULSE
      // ==========================================
      const finalStepTime = FOOTSTEP_BASE_START + TRAIL_WAYPOINTS[TRAIL_WAYPOINTS.length - 1].revealTimeMs;
      if (elapsed >= finalStepTime + 300) {
        if (!hasTriggeredDoorwayAudioRef.current) {
          hasTriggeredDoorwayAudioRef.current = true;
          soundSynthesizer.playDoorwayThreshold();

          // Spawn threshold ripples at doorway
          const doorX = TRAIL_WAYPOINTS[9].xNorm * w - 10;
          const doorY = TRAIL_WAYPOINTS[9].yNorm * h;
          doorwayRipplesRef.current.push(
            { radius: 10, maxRadius: 90, alpha: 0.9 },
            { radius: 2,  maxRadius: 65, alpha: 0.7 }
          );
        }
      }

      // Draw Doorway Ripples
      if (doorwayRipplesRef.current.length > 0) {
        ctx.save();
        const doorX = TRAIL_WAYPOINTS[9].xNorm * w - 10;
        const doorY = TRAIL_WAYPOINTS[9].yNorm * h;

        for (let r = doorwayRipplesRef.current.length - 1; r >= 0; r--) {
          const rip = doorwayRipplesRef.current[r];
          rip.radius += 1.2;
          rip.alpha -= 0.016;

          if (rip.alpha <= 0) {
            doorwayRipplesRef.current.splice(r, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = `rgba(255, 235, 175, ${rip.alpha * 0.75})`;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          // Perspective flattened ellipse on the floor threshold
          ctx.ellipse(doorX, doorY, rip.radius, rip.radius * 0.35, -0.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // Transition to FOOTSTEPS_GUIDING state once all steps have appeared
      if (elapsed >= finalStepTime + 1200 && !hasCompletedTrailRef.current) {
        hasCompletedTrailRef.current = true;
        onTrailComplete();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [dockPosition, onTrailComplete]);

  // Procedural Anatomical Holographic Footprint Renderer
  const drawFootprint = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angleDeg: number,
    scale: number,
    isRightFoot: boolean,
    alpha: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Rotate along path trajectory with natural anatomical toe-out
    // Right foot naturally toes out clockwise (~+6 deg), Left foot counter-clockwise (~-6 deg)
    const toeOut = isRightFoot ? 6 : -6;
    ctx.rotate(((angleDeg + toeOut) * Math.PI) / 180);

    // Floor perspective flattening (simulate 3D projection on horizontal floor plane)
    ctx.scale(scale, scale * 0.46);

    // Mirror for left foot
    if (!isRightFoot) {
      ctx.scale(-1, 1);
    }

    // 1. Soft Ambient Holographic Glow Aura (Layer 1)
    const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    auraGrad.addColorStop(0, `rgba(254, 243, 199, ${alpha * 0.45})`);
    auraGrad.addColorStop(0.6, `rgba(245, 195, 120, ${alpha * 0.2})`);
    auraGrad.addColorStop(1, 'rgba(245, 195, 120, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Footprint Body: Heel Pad, Arch, and Metatarsal (Ball of foot)
    // Heel Pad (back center)
    ctx.fillStyle = `rgba(255, 244, 215, ${alpha * 0.8})`;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8 * scale;

    ctx.beginPath();
    ctx.ellipse(0, 20, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sole Contour (connecting heel to ball of foot with inward arch)
    ctx.beginPath();
    // Start at outer heel
    ctx.moveTo(7, 18);
    // Outer edge curve (straight/slightly convex)
    ctx.bezierCurveTo(9, 6, 12, -6, 11, -12);
    // Ball of the foot (metatarsal pad across top)
    ctx.bezierCurveTo(10, -22, -10, -22, -9, -12);
    // Inner arch curve (concave arch on inside of foot)
    ctx.bezierCurveTo(-9, -4, -3, 6, -6, 18);
    // Heel base
    ctx.bezierCurveTo(-6, 28, 6, 28, 7, 18);
    ctx.closePath();

    // Fill with luminous golden-white gradient
    const footGrad = ctx.createLinearGradient(0, -24, 0, 26);
    footGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.88})`);
    footGrad.addColorStop(0.35, `rgba(254, 240, 190, ${alpha * 0.78})`);
    footGrad.addColorStop(1, `rgba(252, 211, 140, ${alpha * 0.65})`);
    ctx.fillStyle = footGrad;
    ctx.fill();

    // 3. Delicate Luminous Outline
    ctx.strokeStyle = `rgba(255, 250, 230, ${alpha * 0.95})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. Five Natural Radiant Toe Pads
    // Toe 1 (Big Toe - innermost, largest)
    const toes = [
      { x: -7.5, y: -27, rx: 4.0, ry: 4.8, rot: -0.1 },
      { x: -2.5, y: -29, rx: 3.0, ry: 3.8, rot: -0.05 },
      { x: 2.2,  y: -28, rx: 2.6, ry: 3.4, rot: 0.05 },
      { x: 6.5,  y: -26, rx: 2.2, ry: 3.0, rot: 0.12 },
      { x: 10.2, y: -23, rx: 1.8, ry: 2.5, rot: 0.22 },
    ];

    toes.forEach((t) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, t.rx, t.ry, t.rot, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(254, 243, 199, ${alpha * 0.85})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    ctx.restore();
  };

  if (!isGuidingState && !isStartedRef.current) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
      style={{
        mixBlendMode: 'screen',
      }}
    />
  );
};
