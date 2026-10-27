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
import { EdibleFilmTakeaway } from './components/EdibleFilmTakeaway';
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

// Fixed normalized Dock position (approx 68% X, 48% Y on desk for optimal AR framing and edible film spacing)
// Kept outside component body so reference is stable and never causes re-render cascades
const DOCK_POSITION = { x: 0.68, y: 0.48 };

export default function App() {
  const [state, setState] = useState<ExperienceState>('WORK_TABS');
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
  const isGrabbingFromHandRef = useRef<boolean>(false);
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'ready' | 'loading' | 'denied' | 'unsupported'>('loading');
  const [isARPassThrough, setIsARPassThrough] = useState<boolean>(true);
  const [roomDimming, setRoomDimming] = useState<number>(0.25);
  const [encouragementText, setEncouragementText] = useState<string>(ENCOURAGEMENT_MESSAGES[0]);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    isGrabbingFromHandRef.current = isGrabbingFromHand;
  }, [isGrabbingFromHand]);

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

  // Central release trigger: starts dissolution of work tabs into particles
  const handleStartRelease = useCallback((reasonDesc: string = 'Release gesture') => {
    initAudio();
    setState((currentState) => {
      if (currentState === 'WORK_TABS' || currentState === 'INITIAL_WORK_TABS') {
        soundSynthesizer.playSwipeSound();
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[STATE TRANSITION] ${currentState} -> SWIPES_TO_RELEASE | Reason: ${reasonDesc} | Time: ${timeStr}`);
        setPreviousState(currentState);
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason(reasonDesc);
        setTransitionLogs((prev) => [
          { from: currentState, to: 'SWIPES_TO_RELEASE', reason: reasonDesc, timestamp: timeStr },
          ...prev.slice(0, 24),
        ]);
        return 'SWIPES_TO_RELEASE';
      }
      return currentState;
    });
  }, []);

  // Hands Coming Together Trigger Handler -> Starts Release
  const handleHandsTogether = useCallback(() => {
    handleStartRelease('Hands coming together gesture recognized');
  }, [handleStartRelease]);

  // Swipe gesture or pinch-and-horizontal slide return handler
  const handleSwipeReturn = useCallback((reasonDesc: string = 'horizontal gesture') => {
    initAudio();
    setState((curr) => {
      if (curr === 'WORK_TABS' || curr === 'INITIAL_WORK_TABS') {
        soundSynthesizer.playSwipeSound();
        setPreviousState(curr);
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason(reasonDesc);
        return 'SWIPES_TO_RELEASE';
      } else if (
        curr === 'ORB_FREE_PLAY' ||
        curr === 'ORB_RELEASED' ||
        curr === 'ORB_HELD' ||
        curr === 'ORB_GRABBED' ||
        curr === 'ORB_IN_FLIGHT' ||
        curr === 'ORB_CAUGHT' ||
        curr === 'BLACK_THREADS_DISSOLVE' ||
        curr === 'CALM_RELEASE'
      ) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[STATE TRANSITION] ${curr} -> DOCKING_FLIGHT | Reason: ${reasonDesc} | Time: ${timeStr}`);
        setPreviousState(curr);
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason(reasonDesc);
        setTransitionLogs((prev) => [
          { from: curr, to: 'DOCKING_FLIGHT', reason: reasonDesc, timestamp: timeStr },
          ...prev.slice(0, 24),
        ]);
        return 'DOCKING_FLIGHT';
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
        isGrabbingFromHandRef.current = true;
      },
      onGrabMove: (x, y) => {
        setHandInteractionPoint({ x, y });
      },
      onGrabEnd: (x, y) => {
        setHandInteractionPoint({ x, y });
        setIsGrabbingFromHand(false);
        isGrabbingFromHandRef.current = false;
      },
      onFlick: handleFlick,
      onOpenPalmSwipe: (direction, handedness) => {
        // Prevent dock triggers if user is actively holding/dragging orb
        if (isGrabbingFromHandRef.current) return;
        handleSwipeReturn(`Open-palm swipe (${direction}) via ${handedness} hand`);
      },
      onSwipe: (dir) => {
        if (isGrabbingFromHandRef.current) return;
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
    // Rule 3: Orb can only be picked up from cradle for free play once the closure ritual is complete!
    if (state === 'CLOSURE_COMPLETE' || state === 'IDLE') {
      soundSynthesizer.stopCampfireCrackle();
      soundSynthesizer.playGrabChime();
      transitionState('ORB_HELD', 'Picked up from firewood cradle after closure complete');
    }
  }, [state, transitionState]);

  // Rule 2: Automatically Print Edible Film when footsteps animation finishes
  const handleTrailComplete = useCallback(() => {
    setState((curr) => {
      if (curr === 'FOOTSTEPS_APPEARING' || curr === 'FOOTSTEPS_GUIDING') {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[STATE TRANSITION] ${curr} -> PRINT_EDIBLE_FILM | Reason: Footsteps finished; auto-printing edible film | Time: ${timeStr}`);
        setPreviousState(curr);
        setStateEnteredAt(Date.now());
        setStateDurationSec(0);
        setLastTransitionReason('Footsteps finished; auto-printing edible film');
        setTransitionLogs((prev) => [
          { from: curr, to: 'PRINT_EDIBLE_FILM', reason: 'Footsteps finished; auto-printing edible film', timestamp: timeStr },
          ...prev.slice(0, 24),
        ]);
        return 'PRINT_EDIBLE_FILM';
      }
      return curr;
    });
  }, []);

  const simulateFlick = useCallback(() => {
    initAudio();
    if (
      state === 'ORB_FREE_PLAY' ||
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

  // Stable Transition to DISSOLUTION once all tabs have entered the orb / dissolved
  const handleAllTabsAbsorbed = useCallback(() => {
    transitionState('DISSOLUTION', 'All work tabs dissolved into light particles inside orb');
  }, [transitionState]);

  // Tab progress handler for telemetry
  const handleTabProgress = useCallback((remaining: number, total: number, isComplete: boolean) => {
    setTabProgress({ remaining, total, isComplete });
  }, []);

  const simulateClap = () => {
    initAudio();
    if (state === 'WORK_TABS' || state === 'INITIAL_WORK_TABS') {
      handleStartRelease('Simulate Hands Together button clicked');
    }
  };

  const simulateGrab = () => {
    initAudio();
    if (state === 'ORB_FREE_PLAY' || state === 'ORB_RELEASED') {
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
    transitionState('WORK_TABS', 'Experience reset');
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

      {/* Layer 5: Stage 2 Personalised Accomplishments & Golden Encouragement Handwriting */}
      <EncouragementDisplay
        state={state}
        text={encouragementText}
        onAdvanceFromAccomplishments={() => {
          initAudio();
          transitionState('ACCOMPLISHMENTS_DISSOLVE', 'User clicked Continue on accomplishments');
        }}
      />

      {/* Layer 5.5: Stage 3 Edible Film Printing & Closing Takeaway Ritual */}
      <EdibleFilmTakeaway
        state={state}
        dockPosition={DOCK_POSITION}
        hands={hands}
        onChoiceSelected={(choice) => {
          initAudio();
          transitionState('CLOSURE_COMPLETE', `Takeaway selected: ${choice}`);
        }}
        onRestart={resetExperience}
      />

      {/* Layer 6: Minimal HUD & 3-Stage Progress Navigation */}
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
        onSimulateSwipe={() => {
          if (state === 'WORK_TABS' || state === 'INITIAL_WORK_TABS') {
            handleStartRelease('Swipe across work interfaces');
          } else {
            handleSwipeReturn('Pinch-and-slide manual button');
          }
        }}
        onSimulatePickupFromDock={simulatePickupFromDock}
        onSimulateToss={simulateFlick}
        onSimulateFlick={simulateFlick}
        onReset={resetExperience}
        onJumpToState={(targetState) => {
          initAudio();
          transitionState(targetState, `Jumped via Dev Tray to ${targetState}`);
        }}
        onAdvanceFromAccomplishments={() => {
          initAudio();
          transitionState('ACCOMPLISHMENTS_DISSOLVE', 'User clicked Continue on accomplishments');
        }}
        onTakeawayWater={() => {
          initAudio();
          soundSynthesizer.playWaterDissolve();
          transitionState('CLOSURE_COMPLETE', 'Dissolve in water selected');
        }}
        onTakeawayEat={() => {
          initAudio();
          soundSynthesizer.playEdibleConsume();
          transitionState('CLOSURE_COMPLETE', 'Eat edible film selected');
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
