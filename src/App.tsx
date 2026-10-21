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
import { HandTracker } from './services/handTracking';
import { soundSynthesizer } from './services/soundSynthesizer';

const ENCOURAGEMENT_MESSAGES = [
  'You have done enough for today.',
  'Every small step counts.',
  'Your effort matters, even when progress feels small.',
  'You can rest now.',
  'You do not have to finish everything today.',
];

export default function App() {
  const [state, setState] = useState<ExperienceState>('INITIAL_WORK_TABS');
  const [hands, setHands] = useState<HandData[]>([]);
  const [handInteractionPoint, setHandInteractionPoint] = useState<{ x: number; y: number } | null>(null);
  const [isGrabbingFromHand, setIsGrabbingFromHand] = useState<boolean>(false);
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'ready' | 'loading' | 'denied' | 'unsupported'>('loading');
  const [isARPassThrough, setIsARPassThrough] = useState<boolean>(true);
  const [roomDimming, setRoomDimming] = useState<number>(0.25);
  const [encouragementText, setEncouragementText] = useState<string>(ENCOURAGEMENT_MESSAGES[0]);

  // Dock position normalized (approx 68% X, 58% Y on desk)
  const dockPosition = { x: 0.68, y: 0.58 };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);

  // Initialize Audio & Sound on first interaction
  const initAudio = () => {
    soundSynthesizer.init();
  };

  // Clap Trigger Handler
  const handleClap = useCallback(() => {
    setState((currentState) => {
      if (currentState === 'INITIAL_WORK_TABS') {
        initAudio();
        soundSynthesizer.playClapAcknowledge();
        return 'ORB_FORMATION';
      }
      return currentState;
    });
  }, []);

  // Hand Tracker callbacks
  useEffect(() => {
    const tracker = new HandTracker({
      onClap: handleClap,
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
      onSwipe: (dir) => {
        // Sticky note from Miro: "swipe action in any direction and ball moves back to docking station"
        setState((curr) => {
          if (curr === 'ORB_RELEASED' || curr === 'ORB_GRABBED') {
            soundSynthesizer.playGrabChime();
            setTimeout(() => {
              setState('IDLE');
            }, 600);
            return 'ORB_DOCKING';
          }
          return curr;
        });
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
  }, [handleClap]);

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

  // Transition to TAB_DISSOLUTION once all tabs have entered the orb
  const handleAllTabsAbsorbed = () => {
    setState('TAB_DISSOLUTION');
  };

  // State transitions management
  const handleStateChange = (newState: ExperienceState) => {
    setState(newState);
  };

  // Fallback Simulation triggers
  const simulateClap = () => {
    initAudio();
    if (state === 'INITIAL_WORK_TABS') {
      soundSynthesizer.playClapAcknowledge();
      setState('ORB_FORMATION');
    }
  };

  const simulateGrab = () => {
    initAudio();
    if (state === 'ORB_RELEASED') {
      soundSynthesizer.playGrabChime();
      setState('ORB_GRABBED');
    }
  };

  const simulateDock = () => {
    initAudio();
    setState('ORB_DOCKING');
    setTimeout(() => {
      setState('IDLE');
    }, 700);
  };

  const resetExperience = () => {
    // Pick next randomized encouragement quote
    const nextIdx = (ENCOURAGEMENT_MESSAGES.indexOf(encouragementText) + 1) % ENCOURAGEMENT_MESSAGES.length;
    setEncouragementText(ENCOURAGEMENT_MESSAGES[nextIdx]);
    setIsDockHovered(false);
    setIsGrabbingFromHand(false);
    setState('INITIAL_WORK_TABS');
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundSynthesizer.setMuted(newMuted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* Layer 1: Bedroom Environment / Live Camera Room & Bonsai Docking Station */}
      <BedroomEnvironment
        state={state}
        isDockHovered={isDockHovered}
        dockPosition={dockPosition}
        videoRef={videoRef}
        cameraStatus={cameraStatus}
        isARPassThrough={isARPassThrough}
        roomDimming={roomDimming}
      />

      {/* Layer 2: Floating Work Tabs */}
      <WorkTabsLayer
        state={state}
        orbCenter={{ x: 0.5, y: 0.44 }}
        onAllTabsAbsorbed={handleAllTabsAbsorbed}
      />

      {/* Layer 3 & 4: Holographic Orb, Filaments, Black & Golden Threads, AR Hand Feedback */}
      <OrbCanvas
        state={state}
        hands={hands}
        handInteractionPoint={handInteractionPoint}
        isGrabbingFromHand={isGrabbingFromHand}
        dockPosition={dockPosition}
        onStateChange={handleStateChange}
        onOrbHoverDock={setIsDockHovered}
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
        onSimulateDock={simulateDock}
        onReset={resetExperience}
        onJumpToState={(targetState) => {
          initAudio();
          setState(targetState);
        }}
      />
    </div>
  );
}
