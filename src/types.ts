export type ExperienceState =
  | 'INITIAL_WORK_TABS'
  | 'ORB_FORMATION'
  | 'TAB_TRANSFER'
  | 'TAB_DISSOLUTION'
  | 'BLACK_THREADS'
  | 'GOLDEN_THREADS'
  | 'ORB_RELEASED' // or FREE_ORB
  | 'ORB_HELD'     // Orb is held by a hand
  | 'ORB_GRABBED'  // Synonym for ORB_HELD
  | 'ORB_IN_FLIGHT'// Orb is thrown / bouncing under physics
  | 'ORB_CAUGHT'   // Orb caught by receiving hand
  | 'ORB_DOCKING'  // Animating back to dock via swipe
  | 'IDLE';        // ORB_DOCKED

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
