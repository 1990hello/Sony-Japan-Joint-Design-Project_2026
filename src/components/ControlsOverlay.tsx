import React, { useState } from 'react';
import { ExperienceState } from '../types';
import {
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Hand,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  MoveRight,
} from 'lucide-react';

interface ControlsOverlayProps {
  state: ExperienceState;
  isMuted: boolean;
  onToggleMute: () => void;
  cameraStatus: 'ready' | 'loading' | 'denied' | 'unsupported';
  isARPassThrough: boolean;
  onToggleARPassThrough: () => void;
  roomDimming: number;
  onChangeRoomDimming: () => void;
  onRequestEnableCamera: () => void;
  onSimulateClap: () => void;
  onSimulateGrab: () => void;
  onSimulateDock: () => void;
  onReset: () => void;
  onJumpToState: (st: ExperienceState) => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  isMuted,
  onToggleMute,
  cameraStatus,
  isARPassThrough,
  onToggleARPassThrough,
  roomDimming,
  onChangeRoomDimming,
  onRequestEnableCamera,
  onSimulateClap,
  onSimulateGrab,
  onSimulateDock,
  onReset,
  onJumpToState,
}) => {
  const [showDevTray, setShowDevTray] = useState(false);

  // Contextual gentle guidance text
  const getGuidanceText = () => {
    switch (state) {
      case 'INITIAL_WORK_TABS':
        return {
          stage: 'STAGE 1 · ACKNOWLEDGEMENT',
          instruction: 'Gently bring your hands together in front of you to begin',
          actionLabel: 'or Click to Clap',
          onAction: onSimulateClap,
        };
      case 'ORB_FORMATION':
        return {
          stage: 'STAGE 1 · ACKNOWLEDGEMENT',
          instruction: 'Virtual holographic orb is forming above your desk...',
        };
      case 'TAB_TRANSFER':
        return {
          stage: 'STAGE 1 · ACKNOWLEDGEMENT',
          instruction: 'Gathering workday projects and telemetry into the sphere...',
        };
      case 'TAB_DISSOLUTION':
        return {
          stage: 'STAGE 1 · ACKNOWLEDGEMENT',
          instruction: 'Work elements softening and dissolving into calm stardust...',
        };
      case 'BLACK_THREADS':
        return {
          stage: 'STAGE 2 · ENCOURAGEMENT',
          instruction: 'Lingering workday responsibilities tethering the mind...',
        };
      case 'GOLDEN_THREADS':
        return {
          stage: 'STAGE 2 · ENCOURAGEMENT',
          instruction: 'Luminous golden filaments weaving words of reassurance...',
        };
      case 'ORB_RELEASED':
        return {
          stage: 'STAGE 3 · CLOSURE',
          instruction: 'The orb is untethered. Reach out and pinch or grab the sphere',
          actionLabel: 'or Click & Drag Orb',
          onAction: onSimulateGrab,
        };
      case 'ORB_GRABBED':
        return {
          stage: 'STAGE 3 · CLOSURE',
          instruction: 'Holding the orb. Guide it towards the bonsai docking station',
          actionLabel: 'or Auto-Dock',
          onAction: onSimulateDock,
        };
      case 'ORB_DOCKING':
        return {
          stage: 'STAGE 3 · CLOSURE',
          instruction: 'Settling into the bonsai docking station...',
        };
      case 'IDLE':
        return {
          stage: 'SANCTUARY · REST MODE',
          instruction: 'Your workday is acknowledged and closed. Rest peacefully.',
          actionLabel: 'Repeat Experience',
          onAction: onReset,
        };
      default:
        return null;
    }
  };

  const guidance = getGuidanceText();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Brand & Stage Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,190,120,0.8)] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.25em] uppercase text-amber-200/60 font-sans">
              2040 SMART HOME · EVENING SANCTUARY
            </span>
            <span className="text-xs font-serif-luxury text-slate-300 font-light tracking-wide">
              {guidance?.stage || 'Sanctuary Experience'}
            </span>
          </div>
        </div>

        {/* Top Right Controls: Camera Preview, Audio Mute, Dev Tray Toggle */}
        <div className="flex items-center gap-2">
          {/* Camera Status & AR Room Pass-Through Toggle */}
          <button
            onClick={() => {
              if (cameraStatus === 'ready') {
                onToggleARPassThrough();
              } else {
                onRequestEnableCamera();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10 hover:border-amber-400/40 text-slate-300 text-[11px] backdrop-blur-md transition-all cursor-pointer"
            title={
              cameraStatus === 'ready'
                ? isARPassThrough
                  ? 'Switch to Virtual Sanctuary Backdrop'
                  : 'Switch to Live AR Camera Room'
                : 'Click to enable camera for live room background & gestures'
            }
          >
            {cameraStatus === 'ready' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                <span>{isARPassThrough ? 'AR Room: Live' : 'Virtual Room'}</span>
              </>
            ) : cameraStatus === 'loading' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <Camera className="w-3.5 h-3.5 text-amber-300" />
                <span>Connecting Camera...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                <CameraOff className="w-3.5 h-3.5 text-amber-300" />
                <span>Enable Camera</span>
              </>
            )}
          </button>

          {/* AR Room Dimming Adjuster (Available when AR room is active) */}
          {cameraStatus === 'ready' && isARPassThrough && (
            <button
              onClick={onChangeRoomDimming}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/60 border border-white/10 hover:border-amber-400/40 text-slate-300 text-[11px] backdrop-blur-md transition-all cursor-pointer"
              title="Adjust Room Contrast / Dimming"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Dim: {Math.round(roomDimming * 100)}%</span>
            </button>
          )}

          {/* Audio Mute/Unmute */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-full bg-slate-900/60 border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-amber-200 backdrop-blur-md transition-all cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Dev Tray Expand */}
          <button
            onClick={() => setShowDevTray(!showDevTray)}
            className="p-2 rounded-full bg-slate-900/60 border border-white/10 hover:border-amber-400/40 text-slate-300 hover:text-amber-200 backdrop-blur-md transition-all cursor-pointer"
            title="Stage Navigator & Test Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Dynamic Guidance Instruction */}
      {guidance && (
        <div className="self-center flex flex-col items-center text-center pointer-events-auto transition-all duration-700 max-w-lg mb-8">
          <p className="text-sm md:text-base font-light text-slate-200/90 tracking-wide font-sans mb-2 px-4 py-1.5 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/5 shadow-xl">
            {guidance.instruction}
          </p>

          {guidance.actionLabel && guidance.onAction && (
            <button
              onClick={guidance.onAction}
              className="mt-1 px-4 py-1.5 rounded-full text-xs font-medium text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/40 shadow-[0_0_15px_rgba(245,190,120,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              {guidance.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Bottom Stage Timeline & Dev Controller */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* Interactive Dev Tray Drawer */}
        {showDevTray && (
          <div className="glass-panel p-3 rounded-2xl border border-white/10 flex flex-wrap items-center justify-center gap-2 max-w-2xl backdrop-blur-xl animate-breathe">
            <span className="text-[10px] text-amber-200/80 uppercase font-sans font-medium mr-1">
              Direct Stage Jump:
            </span>

            <button
              onClick={() => onJumpToState('INITIAL_WORK_TABS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'INITIAL_WORK_TABS'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              1. Tabs
            </button>

            <button
              onClick={onSimulateClap}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'ORB_FORMATION'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              2. Clap & Form
            </button>

            <button
              onClick={() => onJumpToState('TAB_TRANSFER')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'TAB_TRANSFER'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              3. Absorb Tabs
            </button>

            <button
              onClick={() => onJumpToState('TAB_DISSOLUTION')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'TAB_DISSOLUTION'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              4. Dissolve
            </button>

            <button
              onClick={() => onJumpToState('BLACK_THREADS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'BLACK_THREADS'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              5. Black Threads
            </button>

            <button
              onClick={() => onJumpToState('GOLDEN_THREADS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'GOLDEN_THREADS'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              6. Encouragement
            </button>

            <button
              onClick={() => onJumpToState('ORB_RELEASED')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'ORB_RELEASED' || state === 'ORB_GRABBED'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              7. Cloud & Grab
            </button>

            <button
              onClick={onSimulateDock}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'IDLE' || state === 'ORB_DOCKING'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              8. Dock Idle
            </button>

            <button
              onClick={onReset}
              className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white border border-white/10 cursor-pointer"
              title="Reset Experience"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Minimal Subtle Step Indicator */}
        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'INITIAL_WORK_TABS' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'ORB_FORMATION' || state === 'TAB_TRANSFER' || state === 'TAB_DISSOLUTION' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'BLACK_THREADS' || state === 'GOLDEN_THREADS' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'ORB_RELEASED' || state === 'ORB_GRABBED' || state === 'ORB_DOCKING' || state === 'IDLE' ? 'bg-amber-400' : 'bg-slate-600'}`} />
        </div>
      </div>
    </div>
  );
};
