import React, { useEffect, useState, useRef } from 'react';
import { ExperienceState, WorkTabItem } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';
import {
  FileText,
  Activity,
  Layers,
  CheckSquare,
  BarChart3,
  Cpu,
} from 'lucide-react';

interface WorkTabsLayerProps {
  state: ExperienceState;
  orbCenter: { x: number; y: number }; // normalized 0..1 (e.g. 0.5, 0.44)
  onAllTabsAbsorbed: () => void;
  onTabProgress?: (remaining: number, total: number, isComplete: boolean) => void;
}

const INITIAL_TABS: WorkTabItem[] = [
  {
    id: 'tab-1',
    title: 'Architecture Blueprint: Spatial Neural Mesh v9',
    category: 'System Design Spec',
    iconName: 'Layers',
    initialPos: { x: -330, y: -160, z: -30, rotX: 6, rotY: 14, rotZ: -3 },
    snippet: 'Verified 14 sub-clusters. Latency bound at 1.2ms across local optic bus.',
    status: 'active',
  },
  {
    id: 'tab-2',
    title: 'Circadian Cognitive Telemetry (18:00)',
    category: 'Bio-Telemetry Monitor',
    iconName: 'Activity',
    initialPos: { x: 320, y: -180, z: -20, rotX: 8, rotY: -16, rotZ: 3 },
    snippet: 'Cognitive load peak at 15:40. Cortisol baseline stabilizing.',
    status: 'active',
  },
  {
    id: 'tab-3',
    title: 'Q4 Synthesis Deliverables & Sprint Closure',
    category: 'Task Execution Matrix',
    iconName: 'CheckSquare',
    initialPos: { x: -390, y: 70, z: 20, rotX: -4, rotY: 18, rotZ: -2 },
    snippet: '12 / 12 milestones deployed to edge nodes. 0 blocking anomalies.',
    status: 'active',
  },
  {
    id: 'tab-4',
    title: 'Photonic Waveguide Dispersion Model',
    category: 'Physics Simulation Node',
    iconName: 'Cpu',
    initialPos: { x: 370, y: 50, z: 10, rotX: -6, rotY: -18, rotZ: 2 },
    snippet: 'Refractive matrix convergence reached with epsilon < 10e-6.',
    status: 'active',
  },
  {
    id: 'tab-5',
    title: 'Cross-Disciplinary Research Dossier: Phase 3',
    category: 'Knowledge Graph',
    iconName: 'FileText',
    initialPos: { x: -20, y: -260, z: -60, rotX: 12, rotY: 0, rotZ: 0 },
    snippet: '37 cross-referenced citations validated. Synaptic summary cached.',
    status: 'active',
  },
  {
    id: 'tab-6',
    title: 'Resource Allocation & Energy Grid Balance',
    category: 'Telemetry Ledger',
    iconName: 'BarChart3',
    initialPos: { x: -40, y: 190, z: 40, rotX: -10, rotY: 4, rotZ: 1 },
    snippet: 'Daily compute expenditure: 4.8 kWh. Net positive solar recoup.',
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

  // Store callback refs so parent re-renders never tear down or restart the animation interval
  const onAllTabsAbsorbedRef = useRef(onAllTabsAbsorbed);
  useEffect(() => {
    onAllTabsAbsorbedRef.current = onAllTabsAbsorbed;
  }, [onAllTabsAbsorbed]);

  const onTabProgressRef = useRef(onTabProgress);
  useEffect(() => {
    onTabProgressRef.current = onTabProgress;
  }, [onTabProgress]);

  // Stage 3 Absorb Sequence: Tabs move inward and dissolve into the central orb
  useEffect(() => {
    if (state === 'TAB_TRANSFER') {
      console.log('[WorkTabsLayer] Starting tab absorption sequence into enclosing orb...');

      // Ensure tabs start active at their scattered positions
      setTabs(INITIAL_TABS.map((t) => ({ ...t, status: 'active' })));
      onTabProgressRef.current?.(INITIAL_TABS.length, INITIAL_TABS.length, false);

      let currentIdx = 0;
      let isCompleted = false;
      const totalTabs = INITIAL_TABS.length;

      const finishAbsorption = (reason: string) => {
        if (isCompleted) return;
        isCompleted = true;
        console.log(`[WorkTabsLayer] All tabs absorbed (${reason}), transitioning to TAB_DISSOLUTION`);
        onTabProgressRef.current?.(0, totalTabs, true);
        onAllTabsAbsorbedRef.current();
      };

      const interval = setInterval(() => {
        if (currentIdx < totalTabs) {
          const tabId = INITIAL_TABS[currentIdx].id;
          const idxToAbsorb = currentIdx;

          // Animate tab flowing inward into the orb
          setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, status: 'transferring' } : t))
          );
          soundSynthesizer.playTabAbsorb(idxToAbsorb);

          const remaining = totalTabs - (currentIdx + 1);
          onTabProgressRef.current?.(remaining, totalTabs, false);

          // After travel animation completes, mark as absorbed
          setTimeout(() => {
            setTabs((prev) =>
              prev.map((t) => (t.id === tabId ? { ...t, status: 'absorbed' } : t))
            );
          }, 650);

          currentIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => finishAbsorption('All tabs successfully animated into orb'), 800);
        }
      }, 400); // 400ms staggered inward flow

      // Bounded fallback timeout: guarantees progression after 4.2 seconds under any condition
      const safetyTimeout = setTimeout(() => {
        finishAbsorption('Bounded safety timeout fallback (4.2s)');
      }, 4200);

      return () => {
        clearInterval(interval);
        clearTimeout(safetyTimeout);
      };
    } else if (state === 'INITIAL_WORK_TABS' || state === 'ORB_FORMATION') {
      // In both INITIAL_WORK_TABS and ORB_FORMATION, tabs remain completely scattered
      setTabs(INITIAL_TABS.map((t) => ({ ...t, status: 'active' })));
      onTabProgressRef.current?.(INITIAL_TABS.length, INITIAL_TABS.length, false);
    }
  }, [state]);

  // If experience is beyond tab transfer & dissolution, hide external tabs entirely
  if (
    state !== 'INITIAL_WORK_TABS' &&
    state !== 'ORB_FORMATION' &&
    state !== 'TAB_TRANSFER'
  ) {
    return null;
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'Layers':
        return <Layers className="w-4 h-4 text-cyan-300" />;
      case 'Activity':
        return <Activity className="w-4 h-4 text-emerald-300" />;
      case 'CheckSquare':
        return <CheckSquare className="w-4 h-4 text-amber-300" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4 text-violet-300" />;
      case 'BarChart3':
        return <BarChart3 className="w-4 h-4 text-blue-300" />;
      default:
        return <FileText className="w-4 h-4 text-sky-300" />;
    }
  };

  const isEnclosing = state === 'ORB_FORMATION';

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center select-none z-15"
      style={{ perspective: '1100px' }}
    >
      {tabs.map((tab, idx) => {
        const isTransferring = tab.status === 'transferring';
        const isAbsorbed = tab.status === 'absorbed';

        if (isAbsorbed) return null;

        return (
          <div
            key={tab.id}
            className={`absolute transition-all ${
              isTransferring
                ? 'duration-700 ease-in opacity-0 scale-25'
                : 'duration-1000 ease-out opacity-90 hover:opacity-100'
            }`}
            style={{
              transform: isTransferring
                ? `translate3d(0px, 0px, -220px) rotateX(${tab.initialPos.rotX * 2}deg) rotateY(${tab.initialPos.rotY * 2}deg) scale(0.06)`
                : `translate3d(${tab.initialPos.x}px, ${tab.initialPos.y}px, ${tab.initialPos.z}px) rotateX(${tab.initialPos.rotX}deg) rotateY(${tab.initialPos.rotY}deg) rotateZ(${tab.initialPos.rotZ}deg)`,
              width: '260px',
            }}
          >
            {/* Glassmorphic Tab Container with Enclosing Aura */}
            <div
              className={`glass-tab rounded-xl p-3.5 shadow-2xl relative overflow-hidden transition-all duration-700 ${
                isEnclosing
                  ? 'border border-amber-300/45 bg-slate-900/85 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
                  : 'border border-cyan-400/25 bg-slate-900/75'
              }`}
            >
              {/* Top ambient glow bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-700 ${
                  isEnclosing
                    ? 'bg-gradient-to-r from-transparent via-amber-300/80 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent'
                }`}
              />

              {/* Tab Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-800/80 border border-white/10">
                    {getIcon(tab.iconName)}
                  </div>
                  <span
                    className={`text-[10px] tracking-wider uppercase font-sans font-medium transition-colors duration-700 ${
                      isEnclosing ? 'text-amber-200/80' : 'text-cyan-200/70'
                    }`}
                  >
                    {tab.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-700 ${
                      isEnclosing ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 font-mono">2040.10</span>
                </div>
              </div>

              {/* Tab Title */}
              <h3 className="text-xs font-medium text-slate-100/90 leading-tight mb-2 line-clamp-1">
                {tab.title}
              </h3>

              {/* Snippet / Metric data */}
              <p className="text-[11px] text-slate-300/70 leading-relaxed font-sans line-clamp-2">
                {tab.snippet}
              </p>

              {/* Futuristic Micro-details */}
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400/60 font-mono">
                <span className="flex items-center gap-1">
                  <span className={`w-1 h-1 rounded-full ${isEnclosing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  {isEnclosing ? 'ENCLOSED' : 'Synced'}
                </span>
                <span>{isEnclosing ? 'ENVELOPED_BY_ORB' : 'STATE_ACTIVE'}</span>
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
};
