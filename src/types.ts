export type ExperienceState =
  // Canonical Journey States (Section 7)
  | 'WORK_TABS'                // 1.1 Scattered work tabs, orb hidden
  | 'SWIPES_TO_RELEASE'        // 1.2 User swipes across work interfaces
  | 'ORB_FORMATION'            // 1.3 Orb appears & forms above docking station; tabs remain stationary
  | 'ABSORB_TRANSFER'          // 1.4 Tabs move inward into the formed orb
  | 'DISSOLUTION'              // 1.5 Tabs enter orb and dissolve into particles
  | 'FLOOR_MIST'               // 1.6 Calming fragrance mist spreads along bedroom floor
  | 'BLACK_THREADS'            // 2.1 Fine black threads connect orb to desk
  | 'ACCOMPLISHMENTS'          // 2.2 Personal accomplishments list coalesces inside orb
  | 'ACCOMPLISHMENTS_DISSOLVE' // 2.3 Accomplishment text dissolves into particles
  | 'GOLDEN_ENCOURAGEMENT'     // 2.4 Golden threads weave reassurance + TTS voice
  | 'CALM_RELEASE'             // 2.5 Simpler visuals, orb light softens
  | 'THREAD_DISSOLUTION'       // 3.1 Golden threads dissolve black threads
  | 'ORB_FREE_PLAY'            // 3.2 Orb free play (grab, flick, physics bounce); NO auto-dock
  | 'DOCKING_FLIGHT'           // 3.3 Deliberate user horizontal wave/swipe returns orb
  | 'DOCKED_IDLE'              // 3.4 Orb settles in dock cradle
  | 'WISDOM_QUOTE'             // 3.5 "A calmer mind creates a brighter tomorrow" + voice
  | 'PRINT_EDIBLE_FILM'        // 3.6 Dock physically prints quote onto edible film sheet
  | 'TAKEAWAY_CHOICE'          // 3.7 Option A (2 pinches to eat) or Option B (drag to water cup)
  | 'CLOSURE_COMPLETE'         // 3.8 "You've done enough. Now it's your time." Stable final state
  // Compatibility Aliases
  | 'INITIAL_WORK_TABS'
  | 'WORK_INTERFACES_DISSOLVING'
  | 'ORB_FORMING'
  | 'ATMOSPHERE_TRANSITION'
  | 'BLACK_THREADS_APPEAR'
  | 'ACCOMPLISHMENTS_REVEAL'
  | 'ENCOURAGEMENT'
  | 'BLACK_THREADS_DISSOLVE'
  | 'ORB_RETURNING_TO_DOCK'
  | 'QUOTE_PRESENTATION'
  | 'EDIBLE_FILM_PRINTING'
  | 'TAB_TRANSFER'
  | 'TAB_DISSOLUTION'
  | 'GOLDEN_THREADS'
  | 'ORB_RELEASED'
  | 'ORB_HELD'
  | 'ORB_GRABBED'
  | 'ORB_IN_FLIGHT'
  | 'ORB_CAUGHT'
  | 'ORB_DOCKING'
  | 'IDLE'
  | 'FOOTSTEPS_APPEARING'
  | 'FOOTSTEPS_GUIDING';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: HandLandmark[];
  handedness: 'Left' | 'Right';
  palmCenter: { x: number; y: number };
  indexTip: { x: number; y: number };
  thumbTip: { x: number; y: number };
  isPinching: boolean;
  isGrabbing: boolean;
  isOpenPalm?: boolean;
  openPalmConfidence?: number;
  pinchDistance: number;
  velocity?: { vx: number; vy: number };
}

export interface WorkTabItem {
  id: string;
  title: string;
  category: string;
  iconName: string;
  initialPos: { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number };
  snippet: string;
  status: 'active' | 'transferring' | 'absorbed';
}

export interface EncouragementMessage {
  text: string;
  subtitle: string;
}
