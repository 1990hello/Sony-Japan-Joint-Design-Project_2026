/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExperienceState, HandData } from './types';
import { BedroomEnvironment } from './components/BedroomEnvironment';
import { WorkTabsLayer } from './components/WorkTabsLayer';
import { OrbCanvas } from './components/OrbCanvas';
import { EncouragementDisplay } from './components/EncouragementDisplay';
import { ControlsOverlay } from './components/ControlsOverlay';
import { DebugOverlay, TransitionLog } from './components/DebugOverlay';
import { FootstepTrail } from './components/FootstepTrail';
import { HandTracker } from './services/handTracking';
import { soundSynthesizer } from './services/soundSynthesizer';

const ENCOURAGEMENT_MESSAGES = [
  'You have done enough for today.',
  'Every small step counts.',
  'Your effort matters, even when progress feels small.',
  'You can rest now.',
  'You do not have to finish everything today.',
];

// Fixed normalized Dock position (approx 68% X, 58% Y on desk)
// Kept outside component body so reference is stable and never causes re-render cascades
const DOCK_POSITION = { x: 0.68, y: 0.58 };

export default function App() {
  const [state, setState] = useState<ExperienceState>('INITIAL_WORK_TABS');
  const [previousState, setPreviousState] = useState<ExperienceState | null>(null);
  const [stateEnteredAt, setStateEnteredAt] = useState<number>(() => Date.now());
  const [stateDurationSec, setStateDurationSec] = useState<number>(0);
  const [lastTransitionReason, setLastTransitionReason] = useState<string>('App initial mount');
  const [transitionLogs, setTransitionLogs] = useState<TransitionLog[]>([]);

  // Telemetry for Priority 1: Absorb Stage & Tab Progress
  const [tabProgress, setTabProgress] = useState<{ remaining: number; total: number; isComplete: boolean }>({
    remaining: 6,
    total: 6,
    isComplete: false,
  });

  // Telemetry & Action for Priority 2: Open-Palm Flick
  const [lastFlick, setLastFlick] = useState<{ vx: number; vy: number; speed: number; timestamp: number } | null>(null);

  const [hands, setHands] = useState<HandData[]>([]);
  const [handInteractionPoint, setHandInteractionPoint] = useState<{ x: number; y: number } | null>(null);
  const [isGrabbingFromHand, setIsGrabbingFromHand] = useState<boolean>(false);
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'ready' | 'loading' | 'denied' | 'unsupported'>('loading');
  const [isARPassThrough, setIsARPassThrough] = useState<boolean>(true);
  const [roomDimming, setRoomDimming] = useState<number>(0.25);
  const [encouragementText, setEncouragementText] = useState<string>(ENCOURAGEMENT_MESSAGES[0]);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);

  // Initialize Audio & Sound on first interaction
  const initAudio = () => {
    soundSynthesizer.init();
  };

  // Central State Machine Transition Dispatcher with Logging
  const transitionState = useCallback((nextState: ExperienceState, reason: string = 'User interaction') => {
    setState((curr) => {
      if (curr === nextState) return curr;

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

      console.log(
        `%c[STATE TRANSITION]%c ${curr} -> ${nextState} | Reason: ${reason} | Time: ${timeStr}`,
        'color: #f59e0b; font-weight: bold;',
        'color: #38bdf8;'
      );

      setPreviousState(curr);
      setStateEnteredAt(Date.now());
      setStateDurationSec(0);
      setLastTransitionReason(reason);

      setTransitionLogs((prev) => [
        { from: curr, to: nextState, reason, timestamp: timeStr },
        ...prev.slice(0, 24),
      ]);

      return nextState;
    });
  }, []);

  // Time in current state ticker for debug display
  useEffect(() => {
    const timer = setInterval(() => {
      setStateDurationSec((Date.now() - stateEnteredAt) / 1000);
    }, 100);
    return () => clearInterval(timer);
  }, [stateEnteredAt]);

  // Keyboard shortcut: Press 'D' to toggle debug inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        setIsDebugOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hands Coming Together Trigger Handler -> Starts Orb Appearance & Formation
  const handleHandsTogether = useCallback(() => {
    initAudio();
    setState((currentState) => {
      if (currentState === 'INITIAL_WORK_TABS') {
        soundSynthesizer.playClapAcknowledge();
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[STATE TRANSITION] INITIAL_WORK_TABS -> ORB_FORMATION | Reason: Hands coming together recognized | Time: ${timeStr}`);
        setPreviousState('INITIAL_WORK_TABS');
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason('Hands coming together gesture recognized');
        setTransitionLogs((prev) => [
          { from: 'INITIAL_WORK_TABS', to: 'ORB_FORMATION', reason: 'Hands coming together gesture recognized', timestamp: timeStr },
          ...prev.slice(0, 24),
        ]);
        return 'ORB_FORMATION';
      }
      return currentState;
    });
  }, []);

  // Priority 3: Pinch and Horizontal Slide return handler
  const handleSwipeReturn = useCallback((reasonDesc: string = 'horizontal gesture') => {
    initAudio();
    setState((curr) => {
      if (
        curr === 'ORB_RELEASED' ||
        curr === 'ORB_HELD' ||
        curr === 'ORB_GRABBED' ||
        curr === 'ORB_IN_FLIGHT' ||
        curr === 'ORB_CAUGHT'
      ) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[STATE TRANSITION] ${curr} -> ORB_DOCKING | Reason: ${reasonDesc} | Time: ${timeStr}`);
        setPreviousState(curr);
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason(reasonDesc);
        setTransitionLogs((prev) => [
          { from: curr, to: 'ORB_DOCKING', reason: reasonDesc, timestamp: timeStr },
          ...prev.slice(0, 24),
        ]);
        return 'ORB_DOCKING';
      }
      return curr;
    });
  }, []);

  // Priority 2: Open-Palm Flick handler
  const handleFlick = useCallback((vx: number, vy: number, handedness: 'Left' | 'Right', speed: number) => {
    initAudio();
    setLastFlick({ vx, vy, speed, timestamp: Date.now() });
  }, []);

  // Hand Tracker callbacks
  useEffect(() => {
    const tracker = new HandTracker({
      onHandsTogether: handleHandsTogether,
      onClap: handleHandsTogether,
      onGrabStart: (x, y) => {
        setHandInteractionPoint({ x, y });
        setIsGrabbingFromHand(true);
      },
      onGrabMove: (x, y) => {
        setHandInteractionPoint({ x, y });
      },
      onGrabEnd: (x, y) => {
        setHandInteractionPoint({ x, y });
        setIsGrabbingFromHand(false);
      },
      onFlick: handleFlick,
      onPinchSlideReturn: (direction, handedness) => {
        handleSwipeReturn(`Pinch-and-slide return (${direction}) via ${handedness} hand`);
      },
      onSwipe: (dir) => {
        handleSwipeReturn(`Swipe return (${dir})`);
      },
      onHandsUpdate: (detectedHands) => {
        setHands(detectedHands);
      },
      onCameraStatusChange: (status) => {
        setCameraStatus(status);
      },
    });

    handTrackerRef.current = tracker;

    if (videoRef.current) {
      tracker.start(videoRef.current);
    }

    return () => {
      tracker.stop();
    };
  }, [handleHandsTogether, handleFlick, handleSwipeReturn]);

  const simulatePickupFromDock = useCallback(() => {
    initAudio();
    if (state === 'IDLE' || state === 'FOOTSTEPS_APPEARING' || state === 'FOOTSTEPS_GUIDING') {
      soundSynthesizer.stopCampfireCrackle();
      soundSynthesizer.playGrabChime();
      transitionState('ORB_HELD', 'Picked up from firewood cradle');
    }
  }, [state, transitionState]);

  // Trigger Footstep Materialization after Orb settles in IDLE dock state
  useEffect(() => {
    if (state === 'IDLE') {
      const timer = setTimeout(() => {
        // Only trigger if still IDLE (user didn't immediately grab the orb)
        setState((curr) => {
          if (curr === 'IDLE') {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
            console.log(`[STATE TRANSITION] IDLE -> FOOTSTEPS_APPEARING | Reason: Orb settled in dock; glowing footsteps awaken | Time: ${timeStr}`);
            setPreviousState('IDLE');
            setStateEnteredAt(Date.now());
            setStateDurationSec(0);
            setLastTransitionReason('Orb settled in dock; glowing footsteps awaken');
            setTransitionLogs((prev) => [
              { from: 'IDLE', to: 'FOOTSTEPS_APPEARING', reason: 'Orb settled in dock; glowing footsteps awaken', timestamp: timeStr },
              ...prev.slice(0, 24),
            ]);
            return 'FOOTSTEPS_APPEARING';
          }
          return curr;
        });
      }, 1400); // 1.4s respectful pause allowing user to register Closure completion

      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleTrailComplete = useCallback(() => {
    transitionState('FOOTSTEPS_GUIDING', 'Sequential footstep trail materialized; soft guide active');
  }, [transitionState]);

  const simulateFlick = useCallback(() => {
    initAudio();
    if (
      state === 'ORB_RELEASED' ||
      state === 'ORB_HELD' ||
      state === 'ORB_GRABBED' ||
      state === 'ORB_IN_FLIGHT' ||
      state === 'ORB_CAUGHT'
    ) {
      // Simulate upward-right diagonal flick
      const angle = -Math.PI * 0.35;
      const speed = 0.88;
      setLastFlick({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        speed,
        timestamp: Date.now(),
      });
    }
  }, [state]);

  const requestEnableCamera = useCallback(() => {
    if (videoRef.current && handTrackerRef.current) {
      handTrackerRef.current.start(videoRef.current);
    }
  }, []);

  // Trigger audio initialization on any user click / key press
  useEffect(() => {
    const handleFirstGesture = () => {
      initAudio();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Priority 1: Stable Transition to TAB_DISSOLUTION once all tabs have entered the orb
  const handleAllTabsAbsorbed = useCallback(() => {
    transitionState('TAB_DISSOLUTION', 'All work tabs entered orb');
  }, [transitionState]);

  // Tab progress handler for telemetry
  const handleTabProgress = useCallback((remaining: number, total: number, isComplete: boolean) => {
    setTabProgress({ remaining, total, isComplete });
  }, []);

  const simulateClap = () => {
    initAudio();
    if (state === 'INITIAL_WORK_TABS') {
      soundSynthesizer.playClapAcknowledge();
      transitionState('ORB_FORMATION', 'Simulate Hands Together button clicked');
    }
  };

  const simulateGrab = () => {
    initAudio();
    if (state === 'ORB_RELEASED') {
      soundSynthesizer.playGrabChime();
      transitionState('ORB_HELD', 'Simulate Grab button clicked');
    }
  };

  const resetExperience = () => {
    const nextIdx = (ENCOURAGEMENT_MESSAGES.indexOf(encouragementText) + 1) % ENCOURAGEMENT_MESSAGES.length;
    setEncouragementText(ENCOURAGEMENT_MESSAGES[nextIdx]);
    setIsDockHovered(false);
    setIsGrabbingFromHand(false);
    setTabProgress({ remaining: 6, total: 6, isComplete: false });
    transitionState('INITIAL_WORK_TABS', 'Experience reset');
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundSynthesizer.setMuted(newMuted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* Layer 1: Bedroom Environment / Live Camera Room & Firewood Cradle Docking Hearth */}
      <BedroomEnvironment
        state={state}
        isDockHovered={isDockHovered}
        dockPosition={DOCK_POSITION}
        videoRef={videoRef}
        cameraStatus={cameraStatus}
        isARPassThrough={isARPassThrough}
        roomDimming={roomDimming}
      />

      {/* Layer 1.5: Glowing Holographic Footstep Trail to Doorway */}
      <FootstepTrail
        state={state}
        dockPosition={DOCK_POSITION}
        onTrailComplete={handleTrailComplete}
      />

      {/* Layer 2: Floating Work Tabs */}
      <WorkTabsLayer
        state={state}
        orbCenter={{ x: 0.5, y: 0.44 }}
        onAllTabsAbsorbed={handleAllTabsAbsorbed}
        onTabProgress={handleTabProgress}
      />

      {/* Layer 3 & 4: Holographic Orb, Filaments, Black & Golden Threads, AR Hand Feedback */}
      <OrbCanvas
        state={state}
        hands={hands}
        handInteractionPoint={handInteractionPoint}
        isGrabbingFromHand={isGrabbingFromHand}
        dockPosition={DOCK_POSITION}
        onStateChange={transitionState}
        onOrbHoverDock={setIsDockHovered}
        flickAction={lastFlick}
        encouragementText={encouragementText}
      />

      {/* Layer 5: Golden Thread Encouragement Handwriting */}
      <EncouragementDisplay
        state={state}
        text={encouragementText}
      />

      {/* Layer 6: Minimal HUD & Fallback Interaction Controls */}
      <ControlsOverlay
        state={state}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        cameraStatus={cameraStatus}
        isARPassThrough={isARPassThrough}
        onToggleARPassThrough={() => setIsARPassThrough((p) => !p)}
        roomDimming={roomDimming}
        onChangeRoomDimming={() =>
          setRoomDimming((prev) => (prev === 0.15 ? 0.35 : prev === 0.35 ? 0.55 : 0.15))
        }
        onRequestEnableCamera={requestEnableCamera}
        onSimulateClap={simulateClap}
        onSimulateGrab={simulateGrab}
        onSimulateSwipe={() => handleSwipeReturn('Pinch-and-slide manual button')}
        onSimulatePickupFromDock={simulatePickupFromDock}
        onSimulateToss={simulateFlick}
        onSimulateFlick={simulateFlick}
        onReset={resetExperience}
        onJumpToState={(targetState) => {
          initAudio();
          transitionState(targetState, `Jumped via Dev Tray to ${targetState}`);
        }}
      />

      {/* Layer 7: State Machine & Hand Telemetry Debug Inspector */}
      <DebugOverlay
        isOpen={isDebugOpen}
        onToggle={() => setIsDebugOpen((prev) => !prev)}
        currentState={state}
        previousState={previousState}
        stateDurationSec={stateDurationSec}
        lastTransitionReason={lastTransitionReason}
        cameraStatus={cameraStatus}
        hands={hands}
        isGrabbingFromHand={isGrabbingFromHand}
        handInteractionPoint={handInteractionPoint}
        transitionLogs={transitionLogs}
        tabsRemaining={tabProgress.remaining}
        tabsTotal={tabProgress.total}
        tabsComplete={tabProgress.isComplete}
        lastFlickInfo={lastFlick}
        onTriggerState={transitionState}
      />
    </div>
  );
}
