import React, { useEffect, useState, useRef } from 'react';
import { ExperienceState, WorkTabItem } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';
import {
  FileText,
  Activity,
  Layers,
  CheckSquare,
  BarChart3,
  X,
  Boxes,
} from 'lucide-react';

interface WorkTabsLayerProps {
  state: ExperienceState;
  orbCenter: { x: number; y: number }; // normalized 0..1 (dock is at ~0.68, 0.58)
  onAllTabsAbsorbed: () => void;
  onTabProgress?: (remaining: number, total: number, isComplete: boolean) => void;
}

const INITIAL_TABS: WorkTabItem[] = [
  {
    id: 'tab-1',
    title: 'Earpience: 3D Ergonomic Modelling v4',
    category: 'Industrial Design',
    iconName: 'Boxes',
    initialPos: { x: -340, y: -160, z: -30, rotX: 6, rotY: 14, rotZ: -3 },
    snippet: 'Surfacing completed. Exported OBJ mesh for prototype review.',
    status: 'active',
  },
  {
    id: 'tab-2',
    title: 'Project 1: Client Review Agenda & Meeting',
    category: 'Client Alignment',
    iconName: 'CheckSquare',
    initialPos: { x: 330, y: -170, z: -20, rotX: 8, rotY: -16, rotZ: 3 },
    snippet: 'Scheduled with European team for 09:30 CET tomorrow.',
    status: 'active',
  },
  {
    id: 'tab-3',
    title: 'Project 2: Ideation & Concept Sketches',
    category: 'Design Strategy',
    iconName: 'Layers',
    initialPos: { x: -390, y: 70, z: 20, rotX: -4, rotY: 18, rotZ: -2 },
    snippet: '18 exploratory thumbnail layouts drafted and tagged.',
    status: 'active',
  },
  {
    id: 'tab-4',
    title: 'Sprint Deliverables & Task Ledger',
    category: 'Sprint Milestones',
    iconName: 'BarChart3',
    initialPos: { x: 360, y: 60, z: 10, rotX: -6, rotY: -18, rotZ: 2 },
    snippet: 'All daily milestones logged. Zero blocking dependencies.',
    status: 'active',
  },
  {
    id: 'tab-5',
    title: 'Human Factors & Sensor Biometrics Dossier',
    category: 'User Research',
    iconName: 'FileText',
    initialPos: { x: -20, y: -260, z: -60, rotX: 12, rotY: 0, rotZ: 0 },
    snippet: 'Spatial audio fit test validated across 12 participant profiles.',
    status: 'active',
  },
  {
    id: 'tab-6',
    title: 'Cognitive Workload & Focus Telemetry',
    category: 'Circadian Monitor',
    iconName: 'Activity',
    initialPos: { x: -30, y: 190, z: 40, rotX: -10, rotY: 4, rotZ: 1 },
    snippet: 'Peak focus session concluded. Natural time to power down.',
    status: 'active',
  },
];

export const WorkTabsLayer: React.FC<WorkTabsLayerProps> = ({
  state,
  orbCenter,
  onAllTabsAbsorbed,
  onTabProgress,
}) => {
  const [tabs, setTabs] = useState<WorkTabItem[]>(INITIAL_TABS);

  const onAllTabsAbsorbedRef = useRef(onAllTabsAbsorbed);
  useEffect(() => {
    onAllTabsAbsorbedRef.current = onAllTabsAbsorbed;
  }, [onAllTabsAbsorbed]);

  const onTabProgressRef = useRef(onTabProgress);
  useEffect(() => {
    onTabProgressRef.current = onTabProgress;
  }, [onTabProgress]);

  // Handle individual tab close
  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    soundSynthesizer.playTabAbsorb(1);
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status: 'transferring' as const } : t));
      const remainingCount = updated.filter((t) => t.status === 'active').length;
      onTabProgressRef.current?.(remainingCount, INITIAL_TABS.length, remainingCount === 0);
      return updated;
    });

    setTimeout(() => {
      setTabs((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, status: 'absorbed' as const } : t));
        const remainingCount = updated.filter((t) => t.status !== 'absorbed').length;
        if (remainingCount === 0) {
          onAllTabsAbsorbedRef.current();
        }
        return updated;
      });
    }, 600);
  };

  // Fix 1: Only in ABSORB_TRANSFER (after orb has formed) do tabs begin moving towards it!
  useEffect(() => {
    const isAbsorbing = state === 'ABSORB_TRANSFER' || state === 'TAB_TRANSFER';

    if (isAbsorbing) {
      console.log('[WorkTabsLayer] Orb formed; starting staggered tab absorption into orb...');

      let currentIdx = 0;
      let isCompleted = false;
      const totalTabs = INITIAL_TABS.length;

      const finishAbsorption = (reason: string) => {
        if (isCompleted) return;
        isCompleted = true;
        console.log(`[WorkTabsLayer] All tabs absorbed into orb (${reason})`);
        onTabProgressRef.current?.(0, totalTabs, true);
        onAllTabsAbsorbedRef.current();
      };

      const interval = setInterval(() => {
        if (currentIdx < totalTabs) {
          const tabId = INITIAL_TABS[currentIdx].id;
          const idxToAbsorb = currentIdx;

          setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, status: 'transferring' } : t))
          );
          soundSynthesizer.playTabAbsorb(idxToAbsorb);

          const remaining = totalTabs - (currentIdx + 1);
          onTabProgressRef.current?.(remaining, totalTabs, false);

          setTimeout(() => {
            setTabs((prev) =>
              prev.map((t) => (t.id === tabId ? { ...t, status: 'absorbed' } : t))
            );
          }, 600);

          currentIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => finishAbsorption('All tabs moved into orb'), 650);
        }
      }, 300); // 300ms cadence

      const safetyTimeout = setTimeout(() => {
        finishAbsorption('Bounded safety timeout fallback');
      }, 3800);

      return () => {
        clearInterval(interval);
        clearTimeout(safetyTimeout);
      };
    } else if (
      state === 'WORK_TABS' ||
      state === 'INITIAL_WORK_TABS' ||
      state === 'SWIPES_TO_RELEASE' ||
      state === 'ORB_FORMATION' ||
      state === 'ORB_FORMING'
    ) {
      // In all pre-absorb states, tabs remain stationary in their scattered positions!
      setTabs(INITIAL_TABS.map((t) => ({ ...t, status: 'active' })));
      onTabProgressRef.current?.(INITIAL_TABS.length, INITIAL_TABS.length, false);
    }
  }, [state]);

  // If experience has moved to DISSOLUTION or beyond, work tabs are completely hidden
  const isVisibleState =
    state === 'WORK_TABS' ||
    state === 'INITIAL_WORK_TABS' ||
    state === 'SWIPES_TO_RELEASE' ||
    state === 'ORB_FORMATION' ||
    state === 'ORB_FORMING' ||
    state === 'ABSORB_TRANSFER' ||
    state === 'TAB_TRANSFER';

  if (!isVisibleState) {
    return null;
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'Boxes':
        return <Boxes className="w-4 h-4 text-amber-300" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-cyan-300" />;
      case 'Activity':
        return <Activity className="w-4 h-4 text-emerald-300" />;
      case 'CheckSquare':
        return <CheckSquare className="w-4 h-4 text-sky-300" />;
      case 'BarChart3':
        return <BarChart3 className="w-4 h-4 text-indigo-300" />;
      default:
        return <FileText className="w-4 h-4 text-slate-300" />;
    }
  };

  const isForming = state === 'ORB_FORMATION' || state === 'ORB_FORMING';

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center select-none z-15"
      style={{ perspective: '1100px' }}
    >
      {tabs.map((tab) => {
        const isTransferring = tab.status === 'transferring';
        const isAbsorbed = tab.status === 'absorbed';

        if (isAbsorbed) return null;

        return (
          <div
            key={tab.id}
            className={`absolute transition-all ${
              isTransferring
                ? 'duration-700 ease-in opacity-0 scale-25 pointer-events-none'
                : 'duration-1000 ease-out opacity-90 hover:opacity-100 pointer-events-auto'
            }`}
            style={{
              transform: isTransferring
                ? `translate3d(0px, -20px, -240px) rotateX(${tab.initialPos.rotX * 2}deg) rotateY(${tab.initialPos.rotY * 2}deg) scale(0.06)`
                : `translate3d(${tab.initialPos.x}px, ${tab.initialPos.y}px, ${tab.initialPos.z}px) rotateX(${tab.initialPos.rotX}deg) rotateY(${tab.initialPos.rotY}deg) rotateZ(${tab.initialPos.rotZ}deg)`,
              width: '260px',
            }}
          >
            {/* Holographic AR Work Window */}
            <div
              className={`glass-tab rounded-xl p-3.5 shadow-2xl relative overflow-hidden transition-all duration-700 border backdrop-blur-md ${
                isForming
                  ? 'border-amber-300/40 bg-slate-900/85 shadow-[0_0_25px_rgba(251,191,36,0.2)]'
                  : 'border-cyan-400/30 bg-slate-900/80 hover:border-cyan-300/60'
              }`}
            >
              {/* Top ambient glow line */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-700 ${
                  isForming
                    ? 'bg-gradient-to-r from-transparent via-amber-300/70 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent'
                }`}
              />

              {/* Tab Header with Close Button */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-800/80 border border-white/10">
                    {getIcon(tab.iconName)}
                  </div>
                  <span
                    className={`text-[10px] tracking-wider uppercase font-sans font-medium transition-colors duration-700 ${
                      isForming ? 'text-amber-200/90' : 'text-cyan-200/80'
                    }`}
                  >
                    {tab.category}
                  </span>
                </div>
                {/* Close Button */}
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  title="Close window"
                  className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tab Title */}
              <h3 className="text-xs font-medium text-slate-100/90 leading-tight mb-2 line-clamp-1">
                {tab.title}
              </h3>

              {/* Snippet */}
              <p className="text-[11px] text-slate-300/70 leading-relaxed font-sans line-clamp-2">
                {tab.snippet}
              </p>

              {/* Bottom footer status */}
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400/60 font-mono">
                <span className="flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${isForming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  {isForming ? 'Orb Forming...' : 'Synced'}
                </span>
                <span>{isForming ? 'AWAITING_ABSORB' : 'STATE_ACTIVE'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
