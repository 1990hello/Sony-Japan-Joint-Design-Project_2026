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

      {/* 5. The Bonsai Docking Station (Placed in User's Room) */}
      <div
        className="absolute z-20 transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${dockPosition.x * 100}%`,
          top: `${dockPosition.y * 100}%`,
          width: '320px',
          height: '340px',
        }}
      >
        {/* Contact shadow on user's real or virtual desk */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-64 h-8 rounded-full blur-md pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.75) 0%, transparent 80%)',
          }}
        />

        {/* Dock Target Glow Halo */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
            isDockHovered
              ? 'scale-115 opacity-90 shadow-[0_0_80px_rgba(245,190,120,0.45)]'
              : isHoldingOrb
              ? 'scale-105 opacity-60 shadow-[0_0_50px_rgba(245,190,120,0.25)]'
              : isDocked
              ? 'scale-100 opacity-70 shadow-[0_0_60px_rgba(245,190,120,0.3)]'
              : 'scale-95 opacity-25 shadow-[0_0_30px_rgba(200,160,100,0.1)]'
          }`}
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(245, 195, 130, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Circular Ring Frame (The Bonsai Enclosure) */}
        <div className="relative w-full h-full flex flex-col items-center justify-end">
          {/* Circular Metallic Ring */}
          <div
            className={`relative w-64 h-64 rounded-full border-4 transition-all duration-500 flex items-center justify-center backdrop-blur-xs ${
              isDockHovered
                ? 'border-amber-300/80 shadow-[0_0_35px_rgba(245,195,130,0.6)]'
                : isDocked
                ? 'border-amber-200/50 shadow-[0_0_25px_rgba(245,195,130,0.35)]'
                : 'border-zinc-700/60 shadow-[0_0_15px_rgba(0,0,0,0.8)]'
            }`}
            style={{
              background: 'radial-gradient(circle at 50% 45%, rgba(20, 24, 34, 0.35) 0%, rgba(10, 12, 16, 0.7) 100%)',
            }}
          >
            {/* Inner Ring Glow */}
            <div
              className={`absolute inset-2 rounded-full border transition-all duration-500 ${
                isDockHovered
                  ? 'border-amber-300/60 animate-pulse'
                  : isDocked
                  ? 'border-amber-200/30'
                  : 'border-white/5'
              }`}
            />

            {/* Bonsai Tree Miniature Artistry */}
            <svg
              className="absolute bottom-4 w-48 h-36 z-10 transition-transform duration-700"
              viewBox="0 0 200 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.85))' }}
            >
              {/* Bonsai Trunk (Graceful S-curve natural wood) */}
              <path
                d="M 100 145 C 95 125 78 110 82 85 C 84 70 102 65 110 50 C 114 42 110 32 108 24"
                stroke="#3f2e22"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 98 145 C 93 125 79 110 83 85 C 85 71 101 66 109 51"
                stroke="#5c4434"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Branch 1 Left */}
              <path
                d="M 82 90 C 65 82 52 86 40 82"
                stroke="#4a3729"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Branch 2 Right */}
              <path
                d="M 95 72 C 118 68 135 74 152 70"
                stroke="#4a3729"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Branch 3 Upper Right */}
              <path
                d="M 108 45 C 122 38 135 41 144 36"
                stroke="#4a3729"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Foliage Clouds (Lush dark pine needles) */}
              {/* Left foliage cluster */}
              <ellipse cx="38" cy="80" rx="22" ry="12" fill="#1b3323" opacity="0.95" />
              <ellipse cx="40" cy="78" rx="18" ry="9" fill="#2d5238" opacity="0.9" />
              <ellipse cx="36" cy="76" rx="12" ry="6" fill="#467352" opacity="0.8" />

              {/* Lower right foliage cluster */}
              <ellipse cx="152" cy="68" rx="28" ry="14" fill="#1b3323" opacity="0.95" />
              <ellipse cx="154" cy="66" rx="22" ry="10" fill="#2d5238" opacity="0.9" />
              <ellipse cx="150" cy="63" rx="16" ry="7" fill="#467352" opacity="0.8" />

              {/* Top main canopy */}
              <ellipse cx="112" cy="22" rx="30" ry="15" fill="#1b3323" opacity="0.95" />
              <ellipse cx="114" cy="20" rx="24" ry="11" fill="#2d5238" opacity="0.9" />
              <ellipse cx="110" cy="18" rx="16" ry="7" fill="#467352" opacity="0.8" />

              {/* Upper right side canopy */}
              <ellipse cx="144" cy="35" rx="20" ry="11" fill="#1b3323" opacity="0.95" />
              <ellipse cx="145" cy="33" rx="15" ry="8" fill="#2d5238" opacity="0.9" />

              {/* Subtle warm light catch on leaves */}
              <ellipse
                cx="110"
                cy="19"
                rx="8"
                ry="4"
                fill={isDocked ? '#ffdf9e' : '#a2bfa8'}
                opacity={isDocked ? 0.35 : 0.15}
              />
            </svg>

            {/* Dock Target Indicator (When user holds orb and guides to dock) */}
            {isHoldingOrb && !isDocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div
                  className="w-16 h-16 rounded-full border border-dashed border-amber-300/60"
                  style={{ animation: 'spin 8s linear infinite' }}
                />
                <span className="text-[10px] tracking-widest text-amber-200/80 uppercase font-sans mt-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                  Dock Target
                </span>
              </div>
            )}
          </div>

          {/* Milled Dark Wood Pedestal */}
          <div
            className="w-56 h-8 rounded-b-lg -mt-3 z-20 flex flex-col items-center justify-center shadow-2xl relative"
            style={{
              background: 'linear-gradient(to bottom, #2b1f18 0%, #17110d 100%)',
              borderTop: '1px solid rgba(245, 195, 130, 0.25)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Subtle illuminated smart home emblem */}
            <div className="flex items-center gap-1.5 opacity-60">
              <div className={`w-1.5 h-1.5 rounded-full ${isDocked ? 'bg-amber-400 animate-pulse' : 'bg-amber-200/40'}`} />
              <span className="text-[8px] tracking-[0.25em] uppercase text-amber-100/60 font-sans">
                SANCTUARY · 2040
              </span>
            </div>
          </div>

          {/* Calming base mist when docked */}
          {isDocked && (
            <div
              className="absolute -bottom-4 w-72 h-16 rounded-full blur-xl pointer-events-none animate-mist"
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 230, 180, 0.25) 0%, rgba(200, 160, 100, 0.08) 60%, transparent 100%)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
