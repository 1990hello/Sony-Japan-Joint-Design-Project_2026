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
  ChevronRight,
  Play,
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
  onAdvanceFromAccomplishments?: () => void;
  onTakeawayWater?: () => void;
  onTakeawayEat?: () => void;
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
  onAdvanceFromAccomplishments,
  onTakeawayWater,
  onTakeawayEat,
}) => {
  const [showDevTray, setShowDevTray] = useState(false);

  // Determine current active stage number (1, 2, or 3)
  const getActiveStageNumber = (): 1 | 2 | 3 => {
    switch (state) {
      case 'WORK_TABS':
      case 'INITIAL_WORK_TABS':
      case 'SWIPES_TO_RELEASE':
      case 'WORK_INTERFACES_DISSOLVING':
      case 'ORB_FORMATION':
      case 'ORB_FORMING':
      case 'ABSORB_TRANSFER':
      case 'TAB_TRANSFER':
      case 'DISSOLUTION':
      case 'TAB_DISSOLUTION':
      case 'FLOOR_MIST':
      case 'ATMOSPHERE_TRANSITION':
        return 1;
      case 'BLACK_THREADS':
      case 'BLACK_THREADS_APPEAR':
      case 'ACCOMPLISHMENTS':
      case 'ACCOMPLISHMENTS_REVEAL':
      case 'ACCOMPLISHMENTS_DISSOLVE':
      case 'GOLDEN_ENCOURAGEMENT':
      case 'ENCOURAGEMENT':
      case 'GOLDEN_THREADS':
      case 'CALM_RELEASE':
        return 2;
      case 'THREAD_DISSOLUTION':
      case 'BLACK_THREADS_DISSOLVE':
      case 'ORB_FREE_PLAY':
      case 'ORB_RELEASED':
      case 'ORB_HELD':
      case 'ORB_GRABBED':
      case 'ORB_IN_FLIGHT':
      case 'ORB_CAUGHT':
      case 'DOCKING_FLIGHT':
      case 'ORB_DOCKING':
      case 'ORB_RETURNING_TO_DOCK':
      case 'DOCKED_IDLE':
      case 'IDLE':
      case 'WISDOM_QUOTE':
      case 'QUOTE_PRESENTATION':
      case 'PRINT_EDIBLE_FILM':
      case 'EDIBLE_FILM_PRINTING':
      case 'TAKEAWAY_CHOICE':
      case 'CLOSURE_COMPLETE':
      case 'FOOTSTEPS_APPEARING':
      case 'FOOTSTEPS_GUIDING':
      default:
        return 3;
    }
  };

  const activeStage = getActiveStageNumber();

  // Contextual guidance text and primary action button for each canonical state
  const getGuidance = () => {
    switch (state) {
      case 'WORK_TABS':
      case 'INITIAL_WORK_TABS':
        return {
          stepNum: '1.1',
          title: 'Start · Release the day’s work',
          instruction: 'Close individual work tabs or perform a hand swipe across the windows to release.',
          actionLabel: 'Swipe to Release Work',
          onAction: onSimulateSwipe,
          altActionLabel: 'Hands Together Gesture',
          onAltAction: onSimulateClap,
        };
      case 'SWIPES_TO_RELEASE':
      case 'WORK_INTERFACES_DISSOLVING':
        return {
          stepNum: '1.2',
          title: 'Swipe to Release',
          instruction: 'User swipe initiated. Preparing holographic projector...',
        };
      case 'ORB_FORMATION':
      case 'ORB_FORMING':
        return {
          stepNum: '1.3',
          title: 'Orb Formation Above Dock',
          instruction: 'Orb appearing and forming above the docking station; work tabs remain stationary...',
        };
      case 'ABSORB_TRANSFER':
      case 'TAB_TRANSFER':
        return {
          stepNum: '1.4',
          title: 'Absorb Work Tabs',
          instruction: 'Orb is formed. Work tabs moving inward from scattered positions into the orb core...',
        };
      case 'DISSOLUTION':
      case 'TAB_DISSOLUTION':
        return {
          stepNum: '1.5',
          title: 'Work Dissolution',
          instruction: 'Tabs dissolving into internal stardust particles and filaments inside the orb...',
        };
      case 'FLOOR_MIST':
      case 'ATMOSPHERE_TRANSITION':
        return {
          stepNum: '1.6',
          title: 'Floor Mist Layer',
          instruction: 'Dock emits calming fragrance; dream-like mist spreads gently along the floor...',
        };
      case 'BLACK_THREADS':
      case 'BLACK_THREADS_APPEAR':
        return {
          stepNum: '2.1',
          title: 'Lingering Concerns (Black Threads)',
          instruction: 'Fine black threads emerge connecting orb to desk, representing lingering work concerns...',
        };
      case 'ACCOMPLISHMENTS':
      case 'ACCOMPLISHMENTS_REVEAL':
        return {
          stepNum: '2.2',
          title: 'Personal Accomplishments',
          instruction: 'Your day’s efforts are reflected in a personalised progress list inside the orb.',
          actionLabel: 'Continue to Encouragement',
          onAction: onAdvanceFromAccomplishments || (() => onJumpToState('ACCOMPLISHMENTS_DISSOLVE')),
        };
      case 'ACCOMPLISHMENTS_DISSOLVE':
        return {
          stepNum: '2.3',
          title: 'Accomplishments Dissolving',
          instruction: 'Accomplishment text dissolves gently into golden filaments...',
        };
      case 'GOLDEN_ENCOURAGEMENT':
      case 'ENCOURAGEMENT':
      case 'GOLDEN_THREADS':
        return {
          stepNum: '2.4',
          title: 'Golden Encouragement',
          instruction: 'Delicate golden threads weave words of reassurance: “You have done enough.”',
          actionLabel: 'Proceed to Release',
          onAction: () => onJumpToState('CALM_RELEASE'),
        };
      case 'CALM_RELEASE':
        return {
          stepNum: '2.5',
          title: 'Calm & Release',
          instruction: 'Orb light softens into calm orbital rings, creating quiet space to let go.',
          actionLabel: 'Dissolve Connections',
          onAction: () => onJumpToState('THREAD_DISSOLUTION'),
        };
      case 'THREAD_DISSOLUTION':
      case 'BLACK_THREADS_DISSOLVE':
        return {
          stepNum: '3.1',
          title: 'Thread Dissolution',
          instruction: 'Golden threads interact with black threads, dissolving them and freeing the orb...',
        };
      case 'ORB_FREE_PLAY':
      case 'ORB_RELEASED':
      case 'ORB_HELD':
      case 'ORB_GRABBED':
      case 'ORB_IN_FLIGHT':
      case 'ORB_CAUGHT':
        return {
          stepNum: '3.2',
          title: 'Orb Free Play',
          instruction: 'Orb is free! Play with it (flick, grab, wall bounces). When ready, wave or swipe to return to dock.',
          actionLabel: 'Wave / Swipe to Dock',
          onAction: onSimulateSwipe,
          altActionLabel: 'Open-Palm Flick',
          onAltAction: onSimulateFlick || onSimulateToss,
        };
      case 'DOCKING_FLIGHT':
      case 'ORB_DOCKING':
      case 'ORB_RETURNING_TO_DOCK':
        return {
          stepNum: '3.3',
          title: 'Docking Flight',
          instruction: 'Orb navigating curved trajectory to the docking station projector cradle...',
        };
      case 'DOCKED_IDLE':
      case 'IDLE':
        return {
          stepNum: '3.4',
          title: 'Docked Idle',
          instruction: 'Orb safely resting in docking cradle. Preparing evening wisdom quote...',
        };
      case 'WISDOM_QUOTE':
      case 'QUOTE_PRESENTATION':
        return {
          stepNum: '3.5',
          title: 'Wisdom Quote',
          instruction: '“A calmer mind creates a brighter tomorrow.” Spoken aloud and presented on dock...',
          actionLabel: 'Print Edible Film',
          onAction: () => onJumpToState('PRINT_EDIBLE_FILM'),
        };
      case 'PRINT_EDIBLE_FILM':
      case 'EDIBLE_FILM_PRINTING':
        return {
          stepNum: '3.6',
          title: 'Print Edible Film',
          instruction: 'Dock physically prints wisdom quote onto translucent edible film sheet...',
          actionLabel: 'Proceed to Choice',
          onAction: () => onJumpToState('TAKEAWAY_CHOICE'),
        };
      case 'TAKEAWAY_CHOICE':
        return {
          stepNum: '3.7',
          title: 'Takeaway Ritual Choice',
          instruction: 'Pinch film twice to eat, or drag it into the water glass on desk to dissolve.',
          actionLabel: 'Dissolve in Water',
          onAction: onTakeawayWater || (() => onJumpToState('CLOSURE_COMPLETE')),
          altActionLabel: 'Eat Edible Film (2 Pinches)',
          onAltAction: onTakeawayEat || (() => onJumpToState('CLOSURE_COMPLETE')),
        };
      case 'CLOSURE_COMPLETE':
      case 'FOOTSTEPS_GUIDING':
      case 'FOOTSTEPS_APPEARING':
        return {
          stepNum: '3.8',
          title: 'Closure Complete',
          instruction: '“You’ve done enough. Now it’s your time.” Ritual finished. Enjoy your personal evening.',
          actionLabel: 'Experience Again',
          onAction: onReset,
        };
      default:
        return {
          stepNum: 'AR',
          title: 'AR Smart Sanctuary',
          instruction: 'Interact with the holographic interface in front of you.',
          actionLabel: 'Return to Dock',
          onAction: onSimulateSwipe,
        };
    }
  };

  const guidance = getGuidance();

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 select-none font-sans">
      {/* Top Header Bar: 3-Stage Progress Nav & System Affordances */}
      <header className="flex items-center justify-between gap-4 w-full">
        {/* Left: Journey Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-amber-300/30 backdrop-blur-md shadow-lg pointer-events-auto">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-semibold tracking-wide text-slate-100 uppercase">
              The Journey
            </div>
            <div className="text-[10px] md:text-xs text-amber-200/70 hidden sm:block">
              From work mode to personal time
            </div>
          </div>
        </div>

        {/* Center: The 3 Stage Steppers */}
        <div className="hidden lg:flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/85 border border-white/10 backdrop-blur-md shadow-xl pointer-events-auto">
          {/* Stage 1 */}
          <button
            onClick={() => onJumpToState('WORK_TABS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeStage === 1
                ? 'bg-amber-400/20 border border-amber-300/40 text-amber-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-amber-400/30 text-amber-200">
              1
            </span>
            <span className="font-medium whitespace-nowrap">Start</span>
          </button>

          <ChevronRight className="w-3 h-3 text-slate-600" />

          {/* Stage 2 */}
          <button
            onClick={() => onJumpToState('ACCOMPLISHMENTS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeStage === 2
                ? 'bg-amber-400/20 border border-amber-300/40 text-amber-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-amber-400/30 text-amber-200">
              2
            </span>
            <span className="font-medium whitespace-nowrap">Acknowledgement</span>
          </button>

          <ChevronRight className="w-3 h-3 text-slate-600" />

          {/* Stage 3 */}
          <button
            onClick={() => onJumpToState('ORB_FREE_PLAY')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
              activeStage === 3
                ? 'bg-amber-400/20 border border-amber-300/40 text-amber-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-amber-400/30 text-amber-200">
              3
            </span>
            <span className="font-medium whitespace-nowrap">Closure</span>
          </button>
        </div>

        {/* Right: Quick System Affordances */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-300" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={onToggleARPassThrough}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
            title="Toggle AR Passthrough Mode"
          >
            {isARPassThrough ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Dev Tray Toggle */}
          <button
            onClick={() => setShowDevTray((p) => !p)}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
            title="Toggle Journey Stage Navigator"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Reset Experience */}
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
            title="Restart Experience"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Developer State Tray (Journey Stage Navigator with all 18 sequential steps) */}
      {showDevTray && (
        <div className="mx-auto my-2 p-4 rounded-2xl bg-slate-900/95 border border-amber-300/30 backdrop-blur-xl shadow-2xl max-w-3xl w-full pointer-events-auto text-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <span className="font-semibold text-amber-200 uppercase tracking-wider text-[11px]">
              Journey Stage Navigator (Canonical States)
            </span>
            <button
              onClick={() => setShowDevTray(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <button
              onClick={() => onJumpToState('WORK_TABS')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.1 Work Tabs
            </button>
            <button
              onClick={() => onJumpToState('SWIPES_TO_RELEASE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.2 Swipe Release
            </button>
            <button
              onClick={() => onJumpToState('ORB_FORMATION')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.3 Orb Formation
            </button>
            <button
              onClick={() => onJumpToState('ABSORB_TRANSFER')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.4 Absorb Tabs
            </button>
            <button
              onClick={() => onJumpToState('DISSOLUTION')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.5 Dissolution
            </button>
            <button
              onClick={() => onJumpToState('FLOOR_MIST')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              1.6 Floor Mist
            </button>
            <button
              onClick={() => onJumpToState('BLACK_THREADS')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              2.1 Black Threads
            </button>
            <button
              onClick={() => onJumpToState('ACCOMPLISHMENTS')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              2.2 Accomplishments
            </button>
            <button
              onClick={() => onJumpToState('ACCOMPLISHMENTS_DISSOLVE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              2.3 Dissolve Progress
            </button>
            <button
              onClick={() => onJumpToState('GOLDEN_ENCOURAGEMENT')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              2.4 Encouragement
            </button>
            <button
              onClick={() => onJumpToState('CALM_RELEASE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              2.5 Calm & Release
            </button>
            <button
              onClick={() => onJumpToState('THREAD_DISSOLUTION')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.1 Dissolve Threads
            </button>
            <button
              onClick={() => onJumpToState('ORB_FREE_PLAY')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-left border border-amber-400/30 truncate cursor-pointer font-bold"
            >
              3.2 Orb Free Play
            </button>
            <button
              onClick={() => onJumpToState('DOCKING_FLIGHT')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.3 Docking Flight
            </button>
            <button
              onClick={() => onJumpToState('DOCKED_IDLE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.4 Docked Idle
            </button>
            <button
              onClick={() => onJumpToState('WISDOM_QUOTE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.5 Wisdom Quote
            </button>
            <button
              onClick={() => onJumpToState('PRINT_EDIBLE_FILM')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.6 Print Edible Film
            </button>
            <button
              onClick={() => onJumpToState('TAKEAWAY_CHOICE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-left border border-white/5 truncate cursor-pointer"
            >
              3.7 Takeaway Choice
            </button>
            <button
              onClick={() => onJumpToState('CLOSURE_COMPLETE')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-left border border-amber-300/30 truncate cursor-pointer"
            >
              3.8 Closure Complete
            </button>
          </div>
        </div>
      )}

      {/* Bottom Guidance Card & Primary Fallback Action Button */}
      <footer className="w-full max-w-xl mx-auto pointer-events-auto">
        <div className="p-4 md:p-5 rounded-2xl bg-slate-950/85 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Step Indicator & Human Text */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-mono text-[10px] border border-amber-300/30">
                Step {guidance.stepNum}
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {guidance.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              {guidance.instruction}
            </p>
          </div>

          {/* Action Affordances */}
          <div className="flex items-center gap-2 shrink-0">
            {guidance.actionLabel && (
              <button
                onClick={guidance.onAction}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-102 cursor-pointer"
              >
                <span>{guidance.actionLabel}</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            )}

            {guidance.altActionLabel && (
              <button
                onClick={guidance.altActionLabel ? guidance.onAltAction : undefined}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs font-medium transition-all cursor-pointer"
              >
                {guidance.altActionLabel}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
