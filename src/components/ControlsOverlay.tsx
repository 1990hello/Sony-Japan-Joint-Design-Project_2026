import React, { useState } from 'react';
import { ExperienceState } from '../types';
import {
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Sparkles,
  RotateCcw,
  Sliders,
  Hand,
  ArrowRightLeft,
  CircleDot,
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
  onSimulateSwipe: () => void;
  onSimulatePickupFromDock: () => void;
  onSimulateToss: () => void;
  onSimulateFlick?: () => void;
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
  onSimulateSwipe,
  onSimulatePickupFromDock,
  onSimulateToss,
  onSimulateFlick,
  onReset,
  onJumpToState,
}) => {
  const [showDevTray, setShowDevTray] = useState(false);

  // Contextual gentle guidance text
  const getGuidanceText = () => {
    switch (state) {
      case 'INITIAL_WORK_TABS':
        return {
          stage: 'SCATTERED WORK TABS',
          instruction: 'Gently bring both hands together in front of you to absorb tabs into the orb',
          actionLabel: 'or Click to Bring Hands Together',
          onAction: onSimulateClap,
        };
      case 'ORB_FORMATION':
        return {
          stage: 'STAGE 1 · ORB ENCLOSURE',
          instruction: 'Holographic orb forming and expanding around the scattered tabs...',
        };
      case 'TAB_TRANSFER':
        return {
          stage: 'STAGE 3 · ABSORB',
          instruction: 'Enclosed tabs moving inward and absorbing into the orb core...',
        };
      case 'TAB_DISSOLUTION':
        return {
          stage: 'STAGE 3 · DISSOLUTION',
          instruction: 'Work tabs fully dissolved into calm golden filaments...',
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
          stage: 'STAGE 3 · CLOSURE & PLAY',
          instruction: 'Orb is free! Flick with an open palm to throw, or pinch and slide horizontally to return home.',
          actionLabel: 'Pinch-Slide to Dock',
          onAction: onSimulateSwipe,
        };
      case 'ORB_HELD':
      case 'ORB_GRABBED':
        return {
          stage: 'PLAYFUL INTERACTION',
          instruction: 'Holding orb. Flick with an open palm to launch, or pinch and slide horizontally to dock.',
          actionLabel: 'Open-Palm Flick',
          onAction: onSimulateFlick || onSimulateToss,
        };
      case 'ORB_IN_FLIGHT':
        return {
          stage: 'PLAYFUL INTERACTION',
          instruction: 'Orb in flight! Catch with pinch/grab, or pinch and slide horizontally to dock.',
          actionLabel: 'Pinch-Slide to Dock',
          onAction: onSimulateSwipe,
        };
      case 'ORB_CAUGHT':
        return {
          stage: 'PLAYFUL INTERACTION',
          instruction: 'Caught! Flick with an open hand to launch, or pinch and slide horizontally to return home.',
          actionLabel: 'Open-Palm Flick',
          onAction: onSimulateFlick || onSimulateToss,
        };
      case 'ORB_DOCKING':
        return {
          stage: 'CLOSURE · DOCKING',
          instruction: 'Returning smoothly to the bonsai docking station...',
        };
      case 'IDLE':
        return {
          stage: 'SANCTUARY · REST MODE',
          instruction: 'Orb has settled in peace. Luminous footsteps awakening...',
          actionLabel: 'Pick Up Orb for Play',
          onAction: onSimulatePickupFromDock,
        };
      case 'FOOTSTEPS_APPEARING':
        return {
          stage: 'SANCTUARY · GUIDING LIGHT',
          instruction: 'Luminous golden footsteps materializing towards the door...',
          actionLabel: 'Pick Up Orb for Play',
          onAction: onSimulatePickupFromDock,
        };
      case 'FOOTSTEPS_GUIDING':
        return {
          stage: 'SANCTUARY · DOORWAY GUIDANCE',
          instruction: 'Footsteps softly illuminate the path to the door. Rest or depart at your own pace.',
          actionLabel: 'Pick Up Orb for Play',
          onAction: onSimulatePickupFromDock,
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

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Action: Swipe to Dock button when orb is in playful interaction */}
          {(state === 'ORB_RELEASED' ||
            state === 'ORB_HELD' ||
            state === 'ORB_GRABBED' ||
            state === 'ORB_IN_FLIGHT' ||
            state === 'ORB_CAUGHT') && (
            <>
              <button
                onClick={onSimulateFlick || onSimulateToss}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-200 text-[11px] backdrop-blur-md transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                title="Perform open-palm flick to launch orb into free flight"
              >
                <CircleDot className="w-3.5 h-3.5 text-cyan-300" />
                <span>Open-Palm Flick</span>
              </button>
              <button
                onClick={onSimulateSwipe}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-[11px] backdrop-blur-md transition-all cursor-pointer shadow-[0_0_15px_rgba(245,190,120,0.2)]"
                title="Pinch fingers and slide horizontally to return orb smoothly to dock"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-300" />
                <span>Pinch-Slide to Dock</span>
              </button>
            </>
          )}

          {/* Quick Action: Pick Up button when docked */}
          {state === 'IDLE' && (
            <button
              onClick={onSimulatePickupFromDock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-[11px] backdrop-blur-md transition-all cursor-pointer shadow-[0_0_15px_rgba(245,190,120,0.2)]"
              title="Pick up the orb from the bonsai dock for playful tossing"
            >
              <Hand className="w-3.5 h-3.5 text-amber-300" />
              <span>Pick Up Orb</span>
            </button>
          )}

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

          {/* AR Room Dimming Adjuster */}
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

          <div className="flex items-center gap-2 mt-1">
            {guidance.actionLabel && guidance.onAction && (
              <button
                onClick={guidance.onAction}
                className="px-4 py-1.5 rounded-full text-xs font-medium text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-300/40 shadow-[0_0_15px_rgba(245,190,120,0.25)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                {guidance.actionLabel}
              </button>
            )}

            {state === 'IDLE' && (
              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded-full text-xs font-normal text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                Repeat Journey
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Stage Timeline & Dev Controller */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {showDevTray && (
          <div className="glass-panel p-3 rounded-2xl border border-white/10 flex flex-wrap items-center justify-center gap-2 max-w-2xl backdrop-blur-xl animate-breathe">
            <span className="text-[10px] text-amber-200/80 uppercase font-sans font-medium mr-1">
              Play & Stages:
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
              2. Clap
            </button>

            <button
              onClick={() => onJumpToState('TAB_TRANSFER')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'TAB_TRANSFER'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              3. Absorb
            </button>

            <button
              onClick={() => onJumpToState('BLACK_THREADS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'BLACK_THREADS'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              4. Tethers
            </button>

            <button
              onClick={() => onJumpToState('GOLDEN_THREADS')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'GOLDEN_THREADS'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              5. Voice
            </button>

            <button
              onClick={() => onJumpToState('ORB_RELEASED')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'ORB_RELEASED' || state === 'ORB_HELD' || state === 'ORB_GRABBED' || state === 'ORB_IN_FLIGHT'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              6. Free Play
            </button>

            <button
              onClick={() => onJumpToState('FOOTSTEPS_GUIDING')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans border transition-all cursor-pointer ${
                state === 'IDLE' || state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING'
                  ? 'bg-amber-400/30 text-amber-200 border-amber-400/60'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              7. Footsteps
            </button>

            {/* Play Actions in Tray */}
            <button
              onClick={onSimulateSwipe}
              className="px-2.5 py-1 rounded-lg text-[10px] font-sans bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 cursor-pointer flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" />
              Swipe to Dock
            </button>

            <button
              onClick={onSimulatePickupFromDock}
              className="px-2.5 py-1 rounded-lg text-[10px] font-sans bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 cursor-pointer flex items-center gap-1"
            >
              <Hand className="w-3 h-3" />
              Pick Up from Dock
            </button>

            <button
              onClick={onSimulateToss}
              className="px-2.5 py-1 rounded-lg text-[10px] font-sans bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 cursor-pointer flex items-center gap-1"
            >
              <CircleDot className="w-3 h-3" />
              Toss Orb
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

        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'INITIAL_WORK_TABS' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'ORB_FORMATION' || state === 'TAB_TRANSFER' || state === 'TAB_DISSOLUTION' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'BLACK_THREADS' || state === 'GOLDEN_THREADS' ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <div className={`w-1.5 h-1.5 rounded-full ${state === 'ORB_RELEASED' || state === 'ORB_HELD' || state === 'ORB_GRABBED' || state === 'ORB_IN_FLIGHT' || state === 'ORB_CAUGHT' || state === 'ORB_DOCKING' || state === 'IDLE' ? 'bg-amber-400' : 'bg-slate-600'}`} />
        </div>
      </div>
    </div>
  );
};
