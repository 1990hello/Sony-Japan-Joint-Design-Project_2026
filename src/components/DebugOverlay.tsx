import React, { useState } from 'react';
import { ExperienceState, HandData } from '../types';
import { Bug, X, Terminal, Activity, Hand, RefreshCw, Sparkles, Wind } from 'lucide-react';

export interface TransitionLog {
  from: ExperienceState | null;
  to: ExperienceState;
  reason: string;
  timestamp: string;
}

interface DebugOverlayProps {
  isOpen: boolean;
  onToggle: () => void;
  currentState: ExperienceState;
  previousState: ExperienceState | null;
  stateDurationSec: number;
  lastTransitionReason: string;
  cameraStatus: string;
  hands: HandData[];
  isGrabbingFromHand: boolean;
  handInteractionPoint: { x: number; y: number } | null;
  transitionLogs: TransitionLog[];
  tabsRemaining?: number;
  tabsTotal?: number;
  tabsComplete?: boolean;
  lastFlickInfo?: { vx: number; vy: number; speed: number; timestamp: number } | null;
  onTriggerState: (st: ExperienceState, reason: string) => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isOpen,
  onToggle,
  currentState,
  previousState,
  stateDurationSec,
  lastTransitionReason,
  cameraStatus,
  hands,
  isGrabbingFromHand,
  handInteractionPoint,
  transitionLogs,
  tabsRemaining = 6,
  tabsTotal = 6,
  tabsComplete = false,
  lastFlickInfo,
  onTriggerState,
}) => {
  const [activeTab, setActiveTab] = useState<'state' | 'absorb' | 'hands' | 'logs'>('state');

  if (!isOpen) {
    return null;
  }

  // Determine transition criteria for the current state
  const getTransitionCriteria = () => {
    switch (currentState) {
      case 'WORK_TABS':
      case 'INITIAL_WORK_TABS':
        return {
          condition: 'Hand swipe across work interfaces (or hands together)',
          met: hands.length >= 1,
          next: 'SWIPES_TO_RELEASE',
          auto: false,
          waitingReason: 'Tabs scattered indefinitely. Awaiting hand swipe or hands together gesture.',
        };
      case 'SWIPES_TO_RELEASE':
      case 'WORK_INTERFACES_DISSOLVING':
        return {
          condition: 'Swipe registered, preparing dock holographic projector (0.3s)',
          met: stateDurationSec >= 0.3,
          next: 'ORB_FORMATION',
          auto: true,
          waitingReason: 'Spawning light field above dock cradle',
        };
      case 'ORB_FORMATION':
      case 'ORB_FORMING':
        return {
          condition: 'Orb coalescing and stabilizing above docking station (2.5s)',
          met: stateDurationSec >= 2.5,
          next: 'ABSORB_TRANSFER',
          auto: true,
          waitingReason: `Orb forming above dock (${(2.5 - Math.min(2.5, stateDurationSec)).toFixed(1)}s remaining)`,
        };
      case 'ABSORB_TRANSFER':
      case 'TAB_TRANSFER':
        return {
          condition: `All ${tabsTotal} tabs move into orb center (or 4.0s fallback)`,
          met: tabsComplete || stateDurationSec >= 4.0,
          next: 'DISSOLUTION',
          auto: true,
          waitingReason:
            tabsRemaining > 0
              ? `Transferring tabs into orb (${tabsRemaining} of ${tabsTotal} remaining)...`
              : 'Staggered absorption completing...',
        };
      case 'DISSOLUTION':
      case 'TAB_DISSOLUTION':
        return {
          condition: 'Tabs dissolving into internal golden filaments (2.5s)',
          met: stateDurationSec >= 2.5,
          next: 'FLOOR_MIST',
          auto: true,
          waitingReason: `Dissolving work elements into stardust (${(2.5 - Math.min(2.5, stateDurationSec)).toFixed(1)}s remaining)`,
        };
      case 'FLOOR_MIST':
      case 'ATMOSPHERE_TRANSITION':
        return {
          condition: 'Dock fragrance mist spreading along bedroom floor (2.5s)',
          met: stateDurationSec >= 2.5,
          next: 'BLACK_THREADS',
          auto: true,
          waitingReason: 'Floor mist settling across bedroom floor',
        };
      case 'BLACK_THREADS':
      case 'BLACK_THREADS_APPEAR':
        return {
          condition: 'Fine black threads emerging connecting orb to desk (2.4s)',
          met: stateDurationSec >= 2.4,
          next: 'ACCOMPLISHMENTS',
          auto: true,
          waitingReason: 'Anchoring workday responsibilities to desk',
        };
      case 'ACCOMPLISHMENTS':
      case 'ACCOMPLISHMENTS_REVEAL':
        return {
          condition: 'Personal accomplishments list reading time (7.5s or click Continue)',
          met: stateDurationSec >= 7.5,
          next: 'ACCOMPLISHMENTS_DISSOLVE',
          auto: true,
          waitingReason: `Reflecting on 3 daily accomplishments (${(7.5 - Math.min(7.5, stateDurationSec)).toFixed(1)}s remaining)`,
        };
      case 'ACCOMPLISHMENTS_DISSOLVE':
        return {
          condition: 'Accomplishment text dissolving into particles (1.5s)',
          met: stateDurationSec >= 1.5,
          next: 'GOLDEN_ENCOURAGEMENT',
          auto: true,
          waitingReason: 'Accomplishments fading into golden stardust',
        };
      case 'GOLDEN_ENCOURAGEMENT':
      case 'ENCOURAGEMENT':
      case 'GOLDEN_THREADS':
        return {
          condition: 'Voice synthesis speaking encouragement message',
          met: stateDurationSec >= 6.0,
          next: 'CALM_RELEASE',
          auto: true,
          waitingReason: 'Delivering spoken encouragement message',
        };
      case 'CALM_RELEASE':
        return {
          condition: 'Visuals simplify; orb light softens into peaceful breathing (2.6s)',
          met: stateDurationSec >= 2.6,
          next: 'THREAD_DISSOLUTION',
          auto: true,
          waitingReason: 'Calm release easing work tension',
        };
      case 'THREAD_DISSOLUTION':
      case 'BLACK_THREADS_DISSOLVE':
        return {
          condition: 'Golden threads dissolving black threads, untethering orb',
          met: stateDurationSec >= 2.8,
          next: 'ORB_FREE_PLAY',
          auto: true,
          waitingReason: 'Dissolving black threads to free the orb',
        };
      case 'ORB_FREE_PLAY':
      case 'ORB_RELEASED':
      case 'ORB_HELD':
      case 'ORB_GRABBED':
      case 'ORB_IN_FLIGHT':
      case 'ORB_CAUGHT':
        return {
          condition: 'Orb free play active (no auto-dock). Awaiting wave/swipe to dock.',
          met: false,
          next: 'DOCKING_FLIGHT',
          auto: false,
          waitingReason: 'Play with orb (grab, flick, bounce). Wave or swipe hand to return to dock.',
        };
      case 'DOCKING_FLIGHT':
      case 'ORB_DOCKING':
      case 'ORB_RETURNING_TO_DOCK':
        return {
          condition: 'Curved bezier flight to dock cradle completes (1.15s)',
          met: stateDurationSec >= 1.15,
          next: 'DOCKED_IDLE',
          auto: true,
          waitingReason: 'Navigating curved trajectory to firewood cradle',
        };
      case 'DOCKED_IDLE':
      case 'IDLE':
        return {
          condition: 'Orb resting peacefully in dock. Preparing wisdom quote (1.0s)',
          met: stateDurationSec >= 1.0,
          next: 'WISDOM_QUOTE',
          auto: true,
          waitingReason: 'Settling in cradle before wisdom quote presentation',
        };
      case 'WISDOM_QUOTE':
      case 'QUOTE_PRESENTATION':
        return {
          condition: 'Voice speaks wisdom quote: "A calmer mind creates a brighter tomorrow"',
          met: stateDurationSec >= 4.5,
          next: 'FOOTSTEPS_APPEARING',
          auto: true,
          waitingReason: 'Presenting and speaking wisdom quote',
        };
      case 'FOOTSTEPS_APPEARING':
        return {
          condition: 'Footsteps materializing towards doorway (5.0s)',
          met: stateDurationSec >= 5.0,
          next: 'PRINT_EDIBLE_FILM',
          auto: true,
          waitingReason: 'Footsteps sequencing towards bedroom door',
        };
      case 'FOOTSTEPS_GUIDING':
        return {
          condition: 'Footsteps softly pulsing on floor guiding toward door',
          met: isGrabbingFromHand,
          next: 'PRINT_EDIBLE_FILM',
          auto: true,
          waitingReason: 'Peaceful guidance active on floor',
        };
      case 'PRINT_EDIBLE_FILM':
      case 'EDIBLE_FILM_PRINTING':
        return {
          condition: 'Dock mechanically printing quote onto edible film sheet (3.4s)',
          met: stateDurationSec >= 3.4,
          next: 'TAKEAWAY_CHOICE',
          auto: true,
          waitingReason: 'Printing edible film sheet from dock slot',
        };
      case 'TAKEAWAY_CHOICE':
        return {
          condition: 'Option A: Hold stationary to consume | Option B: Pinch & drag to water cup',
          met: false,
          next: 'CLOSURE_COMPLETE',
          auto: false,
          waitingReason: 'Awaiting takeaway ritual choice (eat or dissolve in water)',
        };
      case 'CLOSURE_COMPLETE':
        return {
          condition: 'Ritual complete. "You\'ve done enough. Now it\'s your time."',
          met: true,
          next: 'None (Final Stage)',
          auto: false,
          waitingReason: 'Work-to-personal transition complete. Enjoy your evening.',
        };
      default:
        return { condition: 'None', met: false, next: 'None', auto: false, waitingReason: 'Active' };
    }
  };

  const criteria = getTransitionCriteria();
  const absorbPercent = Math.round(((tabsTotal - tabsRemaining) / (tabsTotal || 1)) * 100);

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 max-h-[82vh] flex flex-col bg-slate-950/95 border border-amber-400/40 rounded-xl shadow-2xl backdrop-blur-xl text-slate-200 font-mono text-xs overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-amber-200">Diagnostics & State Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            title="Minimize Debug HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/60 text-[11px]">
        <button
          onClick={() => setActiveTab('state')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            activeTab === 'state' ? 'border-amber-400 text-amber-200 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Activity className="w-3 h-3" />
          State
        </button>
        <button
          onClick={() => setActiveTab('absorb')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            activeTab === 'absorb' ? 'border-amber-400 text-amber-200 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Absorb
        </button>
        <button
          onClick={() => setActiveTab('hands')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            activeTab === 'hands' ? 'border-amber-400 text-amber-200 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Hand className="w-3 h-3" />
          Gestures ({hands.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 ${
            activeTab === 'logs' ? 'border-amber-400 text-amber-200 bg-white/5' : 'border-transparent text-slate-400'
          }`}
        >
          <Terminal className="w-3 h-3" />
          Logs
        </button>
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto space-y-3 max-h-[60vh] select-text text-[11px]">
        {activeTab === 'state' && (
          <>
            {/* Current State Card */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current State:</span>
                <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
                  {currentState}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Previous State:</span>
                <span className="text-slate-300">{previousState || 'None (init)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Time in State:</span>
                <span className="text-emerald-300 font-bold">{stateDurationSec.toFixed(1)}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Why Waiting:</span>
                <span className="text-amber-200 text-[10px] text-right truncate max-w-[200px]" title={criteria.waitingReason}>
                  {criteria.waitingReason}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Last Trigger:</span>
                <span className="text-slate-300 text-[10px] truncate max-w-[170px]" title={lastTransitionReason}>
                  {lastTransitionReason}
                </span>
              </div>
            </div>

            {/* Transition Criteria */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 space-y-1.5">
              <div className="text-slate-400 font-semibold flex items-center gap-1">
                <span>Transition Condition:</span>
              </div>
              <p className="text-slate-200 text-[10px] leading-relaxed">{criteria.condition}</p>
              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-slate-400">Next Target:</span>
                <span className="text-amber-300">{criteria.next}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Condition Status:</span>
                <span className={`font-semibold ${criteria.met ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {criteria.met ? 'MET / READY' : criteria.auto ? 'PROGRESSING...' : 'AWAITING GESTURE'}
                </span>
              </div>
            </div>

            {/* Quick State Forcers (All Canonical Stages) */}
            <div className="space-y-1">
              <div className="text-slate-400 text-[10px] font-semibold">Force Stage Jump:</div>
              <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto pr-1">
                <button
                  onClick={() => onTriggerState('WORK_TABS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.1 Work Tabs
                </button>
                <button
                  onClick={() => onTriggerState('SWIPES_TO_RELEASE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.2 Swipe Release
                </button>
                <button
                  onClick={() => onTriggerState('ORB_FORMATION', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.3 Orb Formation
                </button>
                <button
                  onClick={() => onTriggerState('ABSORB_TRANSFER', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.4 Absorb Tabs
                </button>
                <button
                  onClick={() => onTriggerState('DISSOLUTION', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.5 Dissolution
                </button>
                <button
                  onClick={() => onTriggerState('FLOOR_MIST', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1.6 Floor Mist
                </button>
                <button
                  onClick={() => onTriggerState('BLACK_THREADS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2.1 Black Threads
                </button>
                <button
                  onClick={() => onTriggerState('ACCOMPLISHMENTS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2.2 Accomplishments
                </button>
                <button
                  onClick={() => onTriggerState('ACCOMPLISHMENTS_DISSOLVE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2.3 Acc. Dissolve
                </button>
                <button
                  onClick={() => onTriggerState('GOLDEN_ENCOURAGEMENT', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2.4 Encouragement
                </button>
                <button
                  onClick={() => onTriggerState('CALM_RELEASE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2.5 Calm Release
                </button>
                <button
                  onClick={() => onTriggerState('THREAD_DISSOLUTION', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3.1 Dissolve Threads
                </button>
                <button
                  onClick={() => onTriggerState('ORB_FREE_PLAY', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-left truncate cursor-pointer text-[10px] font-semibold"
                >
                  3.2 Orb Free Play
                </button>
                <button
                  onClick={() => onTriggerState('DOCKING_FLIGHT', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3.3 Docking Flight
                </button>
                <button
                  onClick={() => onTriggerState('DOCKED_IDLE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3.4 Docked Idle
                </button>
                <button
                  onClick={() => onTriggerState('WISDOM_QUOTE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3.5 Wisdom Quote
                </button>
                <button
                  onClick={() => onTriggerState('FOOTSTEPS_APPEARING', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/30 text-amber-200 text-left truncate cursor-pointer text-[10px]"
                >
                  3.6 Footstep Trail
                </button>
                <button
                  onClick={() => onTriggerState('PRINT_EDIBLE_FILM', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3.7 Print Film
                </button>
                <button
                  onClick={() => onTriggerState('TAKEAWAY_CHOICE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-left truncate cursor-pointer text-[10px] font-semibold"
                >
                  3.8 Takeaway Choice
                </button>
                <button
                  onClick={() => onTriggerState('CLOSURE_COMPLETE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-left truncate cursor-pointer text-[10px] font-semibold"
                >
                  3.9 Closure Complete
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'absorb' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-amber-200 font-semibold">
                <span>Stage 3 · Absorb & Dissolution</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {currentState === 'TAB_TRANSFER'
                    ? 'TRANSFERRING'
                    : currentState === 'TAB_DISSOLUTION'
                    ? 'DISSOLVING'
                    : 'INACTIVE'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Absorb Progress</span>
                  <span>{absorbPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400 transition-all duration-300"
                    style={{ width: `${absorbPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="p-1.5 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-400 block">Remaining Tabs:</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {tabsRemaining} / {tabsTotal}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-black/40 border border-white/5">
                  <span className="text-slate-400 block">Completion Flag:</span>
                  <span className={`font-bold text-sm ${tabsComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {tabsComplete ? 'COMPLETE' : 'IN PROGRESS'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 bg-white/5 p-2 rounded leading-relaxed">
                <span className="text-slate-400 block font-semibold mb-0.5">Why Waiting / Transition Watchdog:</span>
                {criteria.waitingReason}
              </div>
            </div>

            <button
              onClick={() => onTriggerState('TAB_DISSOLUTION', 'Force complete tab absorb via debug')}
              className="w-full py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Force Complete Absorb &rarr; Dissolve
            </button>
          </div>
        )}

        {activeTab === 'hands' && (
          <>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Camera / Vision:</span>
                <span
                  className={`font-semibold ${
                    cameraStatus === 'ready'
                      ? 'text-emerald-400'
                      : cameraStatus === 'loading'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {cameraStatus.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Detected Hands:</span>
                <span className="text-amber-300 font-bold">{hands.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Grabbing / Pinching:</span>
                <span className={isGrabbingFromHand ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {isGrabbingFromHand ? 'TRUE (HOLDING)' : 'FALSE'}
                </span>
              </div>

              {/* Gesture Controls Guide */}
              <div className="p-2 mt-1 rounded bg-black/40 border border-white/5 space-y-1 text-[10px]">
                <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                  <Wind className="w-3 h-3" />
                  <span>Configured Gesture Bindings:</span>
                </div>
                <div>&bull; <strong className="text-slate-200">Open-Palm Flick:</strong> Launches orb into free flight (any direction)</div>
                <div>&bull; <strong className="text-slate-200">Pinch + Horizontal Slide:</strong> Returns orb to docking station</div>
                <div>&bull; <strong className="text-slate-200">Pinch / Grab:</strong> Pick up from dock or catch flying orb</div>
              </div>

              {lastFlickInfo && (
                <div className="flex items-center justify-between text-[10px] text-amber-300 pt-1">
                  <span>Last Flick Speed:</span>
                  <span>{lastFlickInfo.speed.toFixed(2)} (vx={lastFlickInfo.vx.toFixed(1)}, vy={lastFlickInfo.vy.toFixed(1)})</span>
                </div>
              )}
            </div>

            {/* Individual Hands */}
            {hands.length === 0 ? (
              <div className="text-slate-500 text-center py-4 italic">
                No hands currently in camera view. Hold up hands in front of webcam.
              </div>
            ) : (
              hands.map((h, i) => (
                <div key={i} className="p-2 rounded bg-slate-900 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-amber-200 font-semibold">
                    <span>
                      Hand {i + 1}: {h.handedness}
                    </span>
                    <span className={h.isOpenPalm ? 'text-cyan-300 font-bold' : h.isGrabbing ? 'text-emerald-400' : 'text-slate-400'}>
                      {h.isOpenPalm ? 'OPEN PALM (FLICK READY)' : h.isPinching ? 'PINCHING' : h.isGrabbing ? 'GRABBED' : 'NEUTRAL'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-300">
                    <div>Palm X: {h.palmCenter.x.toFixed(2)}</div>
                    <div>Palm Y: {h.palmCenter.y.toFixed(2)}</div>
                    <div>Pinch Dist: {h.pinchDistance.toFixed(3)}</div>
                    <div>
                      Open Confidence: {h.openPalmConfidence ? `${Math.round(h.openPalmConfidence * 100)}%` : '0%'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-1.5">
            <div className="text-slate-400 text-[10px] flex items-center justify-between">
              <span>Recent Transitions ({transitionLogs.length}):</span>
              <span className="text-slate-500">Live Telemetry</span>
            </div>
            {transitionLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-4 italic">No transitions recorded yet.</div>
            ) : (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {transitionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-slate-900 border border-white/5 flex flex-col gap-0.5 text-[10px]"
                  >
                    <div className="flex items-center justify-between text-amber-200">
                      <span className="font-semibold">
                        {log.from || 'START'} &rarr; {log.to}
                      </span>
                      <span className="text-slate-500 font-mono text-[9px]">{log.timestamp}</span>
                    </div>
                    <span className="text-slate-400 truncate" title={log.reason}>
                      Reason: {log.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 bg-slate-900/90 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
        <span>Press &apos;D&apos; to toggle inspector</span>
        <button
          onClick={() => onTriggerState('INITIAL_WORK_TABS', 'Reset via debug')}
          className="flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Reset State
        </button>
      </div>
    </div>
  );
};
