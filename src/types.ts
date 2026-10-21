export type ExperienceState =
  | 'INITIAL_WORK_TABS'
  | 'ORB_FORMATION'
  | 'TAB_TRANSFER'
  | 'TAB_DISSOLUTION'
  | 'BLACK_THREADS'
  | 'GOLDEN_THREADS'
  | 'ORB_RELEASED'
  | 'ORB_GRABBED'
  | 'ORB_DOCKING'
  | 'IDLE';

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
  pinchDistance: number;
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
