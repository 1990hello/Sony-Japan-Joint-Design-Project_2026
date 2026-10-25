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
  const isDocked = state === 'IDLE' || state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING';
  const isGuiding = state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING';
  const isHoldingOrb = state === 'ORB_GRABBED' || state === 'ORB_DOCKING';
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

        {/* Subtle subtle floor threshold line */}
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

      {/* 5. Atmospheric warm ambient lamp glow (soft light anchor) */}
      <div
        className="absolute top-1/4 left-1/6 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-all duration-1000 z-1"
        style={{
          background:
            isDocked
              ? 'radial-gradient(circle, rgba(235, 180, 110, 0.16) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(200, 170, 130, 0.09) 0%, transparent 70%)',
        }}
      />

      {/* 5. The Firewood Cradle Docking Hearth (Anchored on Desk) */}
      <div
        className="absolute z-10 transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: `${dockPosition.x * 100}%`,
          top: `${dockPosition.y * 100}%`,
          width: '320px',
          height: '240px',
        }}
      >
        {/* Contact shadow on desk under the firewood cradle */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-16 rounded-full blur-md pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.88) 0%, transparent 75%)',
          }}
        />

        {/* Ambient warm campfire light cast onto user's desk & room */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
            isDockHovered
              ? 'scale-120 opacity-95 shadow-[0_0_100px_rgba(255,140,30,0.55)]'
              : isHoldingOrb
              ? 'scale-105 opacity-75 shadow-[0_0_70px_rgba(255,140,30,0.35)]'
              : isDocked
              ? 'scale-110 opacity-85 shadow-[0_0_80px_rgba(255,140,30,0.4)]'
              : 'scale-95 opacity-40 shadow-[0_0_40px_rgba(230,100,20,0.18)]'
          }`}
          style={{
            background: 'radial-gradient(circle at 50% 55%, rgba(255, 140, 30, 0.22) 0%, rgba(230, 70, 10, 0.08) 60%, transparent 80%)',
          }}
        />

        {/* Low Natural Slate Hearth Coaster on Desk */}
        <div className="relative w-full h-full flex flex-col items-center justify-end">
          <div
            className={`w-64 h-10 rounded-full transition-all duration-700 shadow-2xl relative flex items-center justify-center ${
              isDockHovered
                ? 'border border-amber-400/60 shadow-[0_0_30px_rgba(255,160,40,0.4)]'
                : isDocked
                ? 'border border-amber-500/30 shadow-[0_0_20px_rgba(255,140,30,0.25)]'
                : 'border border-stone-800/60'
            }`}
            style={{
              background: 'linear-gradient(to bottom, #1c1410 0%, #0e0a08 100%)',
            }}
          >
            {/* Subtle burnt wood ash bed glow */}
            <div
              className={`w-48 h-6 rounded-full blur-xs transition-opacity duration-700 ${
                isDocked ? 'opacity-85' : 'opacity-40'
              }`}
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 120, 20, 0.35) 0%, rgba(180, 40, 10, 0.15) 60%, transparent 100%)',
              }}
            />

            {/* Subtle illuminated smart home cradle inscription */}
            <div className="absolute -bottom-5 flex items-center gap-1.5 opacity-65">
              <div className={`w-1.5 h-1.5 rounded-full ${isDocked ? 'bg-amber-400 animate-pulse' : 'bg-amber-300/40'}`} />
              <span className="text-[8px] tracking-[0.26em] uppercase text-amber-200/60 font-sans">
                SANCTUARY · FIREWOOD CRADLE
              </span>
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
                Cradle Target
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
