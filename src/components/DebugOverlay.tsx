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
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-amber-300 text-xs font-mono border border-amber-400/30 backdrop-blur-md shadow-xl transition-all cursor-pointer pointer-events-auto"
        title="Open Diagnostic & State Transition Debugger (Press 'D')"
      >
        <Bug className="w-3.5 h-3.5 text-amber-400" />
        <span>Debug HUD [{currentState}]</span>
      </button>
    );
  }

  // Determine transition criteria for the current state
  const getTransitionCriteria = () => {
    switch (currentState) {
      case 'INITIAL_WORK_TABS':
        return {
          condition: 'Two-hand clap gesture (palm distance < 0.16)',
          met: hands.length >= 2,
          next: 'ORB_FORMATION',
          auto: false,
          waitingReason: 'Awaiting user bringing hands together in front of camera',
        };
      case 'ORB_FORMATION':
        return {
          condition: 'Orb coalescence timer (2.2s auto)',
          met: stateDurationSec >= 2.2,
          next: 'TAB_TRANSFER',
          auto: true,
          waitingReason: `Assembling holographic sphere (${(2.2 - Math.min(2.2, stateDurationSec)).toFixed(1)}s remaining)`,
        };
      case 'TAB_TRANSFER':
        return {
          condition: `All ${tabsTotal} tabs flow into orb center (or 4.2s bounded fallback)`,
          met: tabsComplete || stateDurationSec >= 4.0,
          next: 'TAB_DISSOLUTION',
          auto: true,
          waitingReason:
            tabsRemaining > 0
              ? `Transferring tabs (${tabsRemaining} of ${tabsTotal} remaining)...`
              : 'Staggered absorption completing...',
        };
      case 'TAB_DISSOLUTION':
        return {
          condition: 'Tab dissolution into internal golden filaments (3.0s auto)',
          met: stateDurationSec >= 3.0,
          next: 'BLACK_THREADS',
          auto: true,
          waitingReason: `Dissolving work elements into stardust (${(3.0 - Math.min(3.0, stateDurationSec)).toFixed(1)}s remaining)`,
        };
      case 'BLACK_THREADS':
        return {
          condition: 'Black responsibility tethers anchoring (2.4s auto)',
          met: stateDurationSec >= 2.4,
          next: 'GOLDEN_THREADS',
          auto: true,
          waitingReason: 'Anchoring workday responsibilities to desk',
        };
      case 'GOLDEN_THREADS':
        return {
          condition: 'Voice synthesis speaking + golden thread sparkles dissolution',
          met: stateDurationSec >= 5.5,
          next: 'ORB_RELEASED',
          auto: true,
          waitingReason: 'Delivering spoken encouragement message and dissolving tethers',
        };
      case 'ORB_RELEASED':
        return {
          condition: 'Pinch/Grab hand to hold, open-palm flick to toss, or pinch-slide to dock',
          met: isGrabbingFromHand,
          next: 'ORB_HELD, ORB_IN_FLIGHT, or ORB_DOCKING',
          auto: false,
          waitingReason: 'Awaiting user gesture: open-palm flick or pinch-and-slide',
        };
      case 'ORB_HELD':
      case 'ORB_GRABBED':
        return {
          condition: 'Open-palm flick to launch into free flight, or pinch-and-slide horizontally to dock',
          met: false,
          next: 'ORB_IN_FLIGHT or ORB_DOCKING',
          auto: false,
          waitingReason: 'Holding orb. Flick with open hand to throw, or pinch-and-slide to dock.',
        };
      case 'ORB_IN_FLIGHT':
        return {
          condition: 'Opposite hand catch (pinch/grab in radius) or pinch-and-slide to dock',
          met: false,
          next: 'ORB_HELD or ORB_DOCKING',
          auto: false,
          waitingReason: 'Free flight under physics. Bouncing off walls or awaiting catch.',
        };
      case 'ORB_DOCKING':
        return {
          condition: 'Curved bezier flight to bonsai dock completes (1.1s)',
          met: stateDurationSec >= 1.1,
          next: 'IDLE',
          auto: true,
          waitingReason: 'Navigating curved trajectory to bonsai pedestal',
        };
      case 'IDLE':
        return {
          condition: 'Orb resting peacefully. Footstep trail awakening automatically in 1.4s...',
          met: stateDurationSec >= 1.4,
          next: 'FOOTSTEPS_APPEARING',
          auto: true,
          waitingReason: 'Brief pause allowing user to register Closure completion',
        };
      case 'FOOTSTEPS_APPEARING':
        return {
          condition: 'Particles drift from dock & 10 glowing footsteps materialize sequentially',
          met: stateDurationSec >= 5.0,
          next: 'FOOTSTEPS_GUIDING',
          auto: true,
          waitingReason: 'Footsteps sequencing towards bedroom door',
        };
      case 'FOOTSTEPS_GUIDING':
        return {
          condition: 'Footsteps softly pulsing on floor. Pick up orb anytime or rest.',
          met: isGrabbingFromHand,
          next: 'ORB_HELD (optional pickup)',
          auto: false,
          waitingReason: 'Peaceful guidance active. No forced action required.',
        };
      default:
        return { condition: 'None', met: false, next: 'None', auto: false, waitingReason: 'Idle' };
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

            {/* Quick State Forcers */}
            <div className="space-y-1">
              <div className="text-slate-400 text-[10px]">Force Stage Jump:</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onTriggerState('INITIAL_WORK_TABS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  1. Work Tabs
                </button>
                <button
                  onClick={() => onTriggerState('ORB_FORMATION', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  2. Formation
                </button>
                <button
                  onClick={() => onTriggerState('TAB_TRANSFER', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  3. Absorb (Transfer)
                </button>
                <button
                  onClick={() => onTriggerState('TAB_DISSOLUTION', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  4. Dissolution
                </button>
                <button
                  onClick={() => onTriggerState('BLACK_THREADS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  5. Black Threads
                </button>
                <button
                  onClick={() => onTriggerState('GOLDEN_THREADS', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  6. Golden Threads
                </button>
                <button
                  onClick={() => onTriggerState('ORB_RELEASED', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  7. Orb Free Play
                </button>
                <button
                  onClick={() => onTriggerState('ORB_DOCKING', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  8. Docking Flight
                </button>
                <button
                  onClick={() => onTriggerState('IDLE', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  9. Docked (Idle)
                </button>
                <button
                  onClick={() => onTriggerState('FOOTSTEPS_GUIDING', 'Manual debug override')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-left truncate cursor-pointer text-[10px]"
                >
                  10. Footsteps Guide
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
