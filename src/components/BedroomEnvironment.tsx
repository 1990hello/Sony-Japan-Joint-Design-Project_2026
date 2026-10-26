import React from 'react';
import { ExperienceState } from '../types';

interface BedroomEnvironmentProps {
  state: ExperienceState;
  isDockHovered: boolean;
  dockPosition: { x: number; y: number }; // normalized 0..1
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: 'ready' | 'loading' | 'denied' | 'unsupported';
  isARPassThrough: boolean;
  roomDimming: number;
}

export const BedroomEnvironment: React.FC<BedroomEnvironmentProps> = ({
  state,
  isDockHovered,
  dockPosition,
  videoRef,
  cameraStatus,
  isARPassThrough,
  roomDimming,
}) => {
  const isDocked =
    state === 'IDLE' ||
    state === 'QUOTE_PRESENTATION' ||
    state === 'EDIBLE_FILM_PRINTING' ||
    state === 'TAKEAWAY_CHOICE' ||
    state === 'CLOSURE_COMPLETE' ||
    state === 'FOOTSTEPS_APPEARING' ||
    state === 'FOOTSTEPS_GUIDING';
  const isGuiding = state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING';
  const isHoldingOrb = state === 'ORB_GRABBED' || state === 'ORB_DOCKING' || state === 'ORB_RETURNING_TO_DOCK';
  const isCameraActive = cameraStatus === 'ready' && isARPassThrough;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Live Camera Feed Background (User's Real Room) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-0 transition-opacity duration-1000 ${
          isCameraActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          filter: 'contrast(1.05) brightness(0.96) saturate(1.04)',
        }}
      />

      {/* 2. AR Ambient Optical Tint & Hologram Contrast Grading */}
      {isCameraActive && (
        <div
          className="absolute inset-0 z-1 pointer-events-none transition-opacity duration-700"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(10, 14, 24, ${roomDimming * 0.35}) 0%, rgba(5, 7, 12, ${roomDimming}) 100%)
            `,
          }}
        />
      )}

      {/* 3. Fallback / Virtual Sanctuary Bedroom (Shown when camera is off or in Virtual mode) */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${
          isCameraActive ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Twilight smart-window horizon background */}
        <div className="absolute inset-0 bg-radial from-slate-900/60 via-slate-950/90 to-black" />

        {/* Futuristic bedroom & skyline backdrop */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 75% 25%, rgba(245, 185, 120, 0.12) 0%, transparent 50%),
              radial-gradient(circle at 25% 35%, rgba(100, 140, 210, 0.08) 0%, transparent 60%),
              linear-gradient(to bottom, #090b10 0%, #101524 60%, #080a0f 100%)
            `,
          }}
        />

        {/* Workstation Desk Surface (Virtual Mode only) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[38vh] z-1"
          style={{
            background:
              'linear-gradient(to top, rgba(10, 12, 18, 0.98) 0%, rgba(15, 19, 28, 0.92) 55%, rgba(22, 28, 42, 0.4) 100%)',
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.07)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />
          <div className="absolute top-1 left-0 right-0 h-16 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 4. Architectural Bedroom Doorway / Sanctuary Exit (Anchor for Footstep Trail) */}
      <div
        className="absolute z-1 pointer-events-none transition-all duration-1000"
        style={{
          left: '8%',
          bottom: '26%',
          width: '120px',
          height: '42vh',
        }}
      >
        {/* Soft warm light spill from living room beyond the door */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 rounded-t-xl ${
            isGuiding ? 'opacity-85' : 'opacity-40'
          }`}
          style={{
            background:
              'linear-gradient(to bottom, rgba(255, 210, 140, 0.14) 0%, rgba(255, 180, 100, 0.08) 60%, rgba(245, 160, 80, 0.22) 100%)',
            boxShadow: isGuiding
              ? '0 0 60px rgba(255, 200, 120, 0.3), inset 0 0 30px rgba(255, 220, 160, 0.15)'
              : '0 0 25px rgba(200, 160, 100, 0.12)',
            border: '1px solid rgba(255, 220, 160, 0.2)',
            borderBottom: 'none',
          }}
        />

        {/* Minimalist door frame accent */}
        <div className="absolute inset-x-2 top-2 bottom-0 border-t border-x border-amber-200/20 rounded-t-lg pointer-events-none" />

        {/* Warm light casting across the floor threshold */}
        <div
          className={`absolute -bottom-8 -left-12 -right-12 h-20 rounded-full blur-xl transition-all duration-1000 ${
            isGuiding ? 'opacity-90 scale-110' : 'opacity-35 scale-90'
          }`}
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255, 210, 140, 0.35) 0%, rgba(245, 170, 90, 0.12) 60%, transparent 100%)',
          }}
        />

        {/* Floor threshold line */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-1000 ${
            isGuiding
              ? 'bg-gradient-to-r from-amber-300/10 via-amber-200/70 to-amber-300/10 shadow-[0_0_12px_rgba(255,220,160,0.8)]'
              : 'bg-gradient-to-r from-transparent via-amber-200/20 to-transparent'
          }`}
        />

        {/* Soft sanctuary exit hint */}
        <div
          className={`absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-opacity duration-1000 whitespace-nowrap ${
            isGuiding ? 'opacity-70' : 'opacity-25'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isGuiding ? 'bg-amber-300 animate-pulse' : 'bg-amber-200/40'}`} />
          <span className="text-[9px] tracking-[0.22em] uppercase text-amber-100/70 font-sans">
            Doorway · Rest
          </span>
        </div>
      </div>

      {/* 5. Atmospheric warm ambient lamp glow */}
      <div
        className="absolute top-1/4 left-1/6 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-all duration-1000 z-1"
        style={{
          background: isDocked
            ? 'radial-gradient(circle, rgba(235, 180, 110, 0.16) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(200, 170, 130, 0.09) 0%, transparent 70%)',
        }}
      />

      {/* 6. Dream-like Low Floor Mist Layer (Spreading along the floor, below desk) */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[28vh] z-2 pointer-events-none transition-opacity duration-1000 ${
          state === 'INITIAL_WORK_TABS' ? 'opacity-25' : 'opacity-85'
        }`}
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 50% 100%, rgba(180, 215, 245, 0.22) 0%, rgba(140, 185, 230, 0.12) 45%, transparent 80%)',
            filter: 'blur(24px)',
            animation: 'pulse 6s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-3/4 h-32 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 30% 90%, rgba(200, 225, 255, 0.18) 0%, rgba(160, 200, 240, 0.08) 50%, transparent 80%)',
            filter: 'blur(28px)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-2/3 h-36 opacity-65"
          style={{
            background:
              'radial-gradient(ellipse at 70% 90%, rgba(220, 210, 255, 0.16) 0%, rgba(170, 190, 240, 0.08) 50%, transparent 80%)',
            filter: 'blur(30px)',
          }}
        />
      </div>

      {/* 7. Desk-Mounted Glass of Water (For Stage 3 Takeaway Ritual) */}
      <div
        className="absolute z-10 pointer-events-none transition-all duration-700"
        style={{
          left: '81%',
          top: '59%',
          width: '54px',
          height: '76px',
        }}
      >
        {/* Shadow under glass */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full bg-black/60 blur-xs" />
        {/* Glass body */}
        <div
          className={`relative w-full h-full rounded-b-xl border border-white/20 transition-all duration-700 backdrop-blur-[2px] ${
            state === 'TAKEAWAY_CHOICE'
              ? 'border-cyan-300/60 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
              : 'bg-gradient-to-b from-white/5 via-cyan-500/10 to-cyan-400/20'
          }`}
          style={{
            background:
              state === 'CLOSURE_COMPLETE'
                ? 'linear-gradient(to top, rgba(251, 191, 36, 0.45) 0%, rgba(56, 189, 248, 0.3) 65%, rgba(255, 255, 255, 0.1) 100%)'
                : 'linear-gradient(to top, rgba(56, 189, 248, 0.25) 0%, rgba(147, 197, 253, 0.12) 65%, rgba(255, 255, 255, 0.05) 100%)',
          }}
        >
          {/* Water level line */}
          <div className="absolute top-4 inset-x-1 h-[1px] bg-white/40" />
          {/* Glass specular highlights */}
          <div className="absolute top-2 left-1.5 bottom-2 w-[2px] bg-white/30 rounded-full" />
          <div className="absolute top-3 right-1.5 bottom-3 w-[1px] bg-white/20 rounded-full" />
          {/* Gentle bubbles if dissolved */}
          {state === 'CLOSURE_COMPLETE' && (
            <div className="absolute inset-x-2 bottom-2 top-6 flex justify-around items-end">
              <span className="w-1 h-1 rounded-full bg-amber-200 animate-ping opacity-70" />
              <span className="w-1 h-1 rounded-full bg-amber-300 animate-pulse opacity-80" />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 animate-bounce opacity-75" />
            </div>
          )}
        </div>
        {/* Micro text label */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-60">
          <span className="text-[7.5px] uppercase tracking-wider text-slate-300 font-sans">
            Water · Ritual
          </span>
        </div>
      </div>

      {/* 8. Multifunctional Smart Docking Station (Projector + Printer + Mist Generator) */}
      <div
        className="absolute z-10 transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: `${dockPosition.x * 100}%`,
          top: `${dockPosition.y * 100}%`,
          width: '320px',
          height: '240px',
        }}
      >
        {/* Contact shadow on desk under the dock */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-16 rounded-full blur-md pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.9) 0%, transparent 75%)',
          }}
        />

        {/* Ambient warm projector light cast upward onto desk & space */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
            isDockHovered
              ? 'scale-125 opacity-95 shadow-[0_0_120px_rgba(251,191,36,0.6)]'
              : isHoldingOrb
              ? 'scale-105 opacity-75 shadow-[0_0_80px_rgba(251,191,36,0.4)]'
              : isDocked
              ? 'scale-115 opacity-85 shadow-[0_0_90px_rgba(251,191,36,0.45)]'
              : 'scale-95 opacity-55 shadow-[0_0_50px_rgba(56,189,248,0.25)]'
          }`}
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.22) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 75%)',
          }}
        />

        {/* Sleek Cylindrical Dock Body */}
        <div className="relative w-full h-full flex flex-col items-center justify-end">
          {/* Main Cylindrical Base */}
          <div
            className={`w-64 h-24 rounded-2xl transition-all duration-700 shadow-2xl relative flex flex-col items-center justify-between p-3 ${
              isDockHovered
                ? 'border border-amber-300/80 shadow-[0_0_40px_rgba(251,191,36,0.45)]'
                : isDocked
                ? 'border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
                : 'border border-slate-700/80'
            }`}
            style={{
              background: 'linear-gradient(180deg, #1e2532 0%, #111622 55%, #0b0e17 100%)',
            }}
          >
            {/* Top Projector Ring Surface */}
            <div className="relative w-full h-8 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center overflow-hidden">
              {/* Projector Ring Glow */}
              <div
                className={`w-36 h-5 rounded-full blur-xs transition-all duration-700 ${
                  isDocked
                    ? 'bg-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
                    : 'bg-cyan-400/50 shadow-[0_0_15px_rgba(56,189,248,0.6)]'
                }`}
              />
              {/* Holographic upward light projector cone beam */}
              <div
                className={`absolute inset-x-8 -top-16 h-20 pointer-events-none transition-opacity duration-700 ${
                  isDocked ? 'opacity-70' : 'opacity-40'
                }`}
                style={{
                  background:
                    'linear-gradient(to top, rgba(251, 191, 36, 0.35) 0%, rgba(56, 189, 248, 0.15) 60%, transparent 100%)',
                  clipPath: 'polygon(15% 100%, 85% 100%, 100% 0%, 0% 0%)',
                }}
              />
            </div>

            {/* Front Panel: OLED Display & Edible Film Printer Slot */}
            <div className="w-full flex items-center justify-between px-2 pt-1">
              {/* OLED Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[8.5px] font-mono tracking-widest text-cyan-200 uppercase">
                  SANCTUARY
                </span>
              </div>

              {/* Mist Emitter status */}
              <div className="flex items-center gap-1 opacity-70">
                <span className="text-[7.5px] font-sans uppercase tracking-wider text-slate-400">
                  Mist Active
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
              </div>
            </div>

            {/* Edible Film Printer Slot */}
            <div className="relative w-full px-2 pb-0.5">
              <div className="w-full h-1.5 rounded-full bg-black border border-white/10 relative overflow-hidden shadow-inner">
                {/* Printer light guide */}
                <div
                  className={`absolute inset-y-0 left-1/4 w-1/2 transition-all duration-500 ${
                    state === 'EDIBLE_FILM_PRINTING' || state === 'TAKEAWAY_CHOICE'
                      ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                      : 'bg-cyan-400/40'
                  }`}
                />
              </div>
            </div>

            {/* Dock Inscription */}
            <div className="w-full flex items-center justify-between px-2 text-[7px] text-slate-500 font-mono">
              <span>HOLO-PROJ</span>
              <span>FILM-PRINT</span>
              <span>FRAGRANCE-MIST</span>
            </div>
          </div>

          {/* Dock Target Indicator (When user holds orb and guides to dock) */}
          {isHoldingOrb && !isDocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div
                className="w-20 h-20 rounded-full border border-dashed border-amber-300/70"
                style={{ animation: 'spin 8s linear infinite' }}
              />
              <span className="text-[10px] tracking-widest text-amber-200/90 uppercase font-sans mt-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-amber-400/30">
                Dock Target
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
