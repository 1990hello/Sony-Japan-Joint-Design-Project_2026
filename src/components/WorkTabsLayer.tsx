import React, { useEffect, useState } from 'react';
import { ExperienceState, WorkTabItem } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';
import {
  FileText,
  Activity,
  Layers,
  CheckSquare,
  BarChart3,
  Globe,
  Sparkles,
  Database,
  Cpu,
} from 'lucide-react';

interface WorkTabsLayerProps {
  state: ExperienceState;
  orbCenter: { x: number; y: number }; // normalized 0..1 (e.g. 0.5, 0.45)
  onAllTabsAbsorbed: () => void;
}

const INITIAL_TABS: WorkTabItem[] = [
  {
    id: 'tab-1',
    title: 'Architecture Blueprint: Spatial Neural Mesh v9',
    category: 'System Design Spec',
    iconName: 'Layers',
    initialPos: { x: -260, y: -140, z: -40, rotX: 6, rotY: 14, rotZ: -2 },
    snippet: 'Verified 14 sub-clusters. Latency bound at 1.2ms across local optic bus.',
    status: 'active',
  },
  {
    id: 'tab-2',
    title: 'Circadian Cognitive Telemetry (18:00)',
    category: 'Bio-Telemetry Monitor',
    iconName: 'Activity',
    initialPos: { x: 260, y: -160, z: -20, rotX: 8, rotY: -16, rotZ: 3 },
    snippet: 'Cognitive load peak at 15:40. Cortisol baseline stabilizing.',
    status: 'active',
  },
  {
    id: 'tab-3',
    title: 'Q4 Synthesis Deliverables & Sprint Closure',
    category: 'Task Execution Matrix',
    iconName: 'CheckSquare',
    initialPos: { x: -340, y: 80, z: 20, rotX: -4, rotY: 18, rotZ: -3 },
    snippet: '12 / 12 milestones deployed to edge nodes. 0 blocking anomalies.',
    status: 'active',
  },
  {
    id: 'tab-4',
    title: 'Photonic Waveguide Dispersion Model',
    category: 'Physics Simulation Node',
    iconName: 'Cpu',
    initialPos: { x: 330, y: 60, z: 10, rotX: -6, rotY: -18, rotZ: 2 },
    snippet: 'Refractive matrix convergence reached with epsilon < 10e-6.',
    status: 'active',
  },
  {
    id: 'tab-5',
    title: 'Cross-Disciplinary Research Dossier: Phase 3',
    category: 'Knowledge Graph',
    iconName: 'FileText',
    initialPos: { x: 0, y: -220, z: -60, rotX: 12, rotY: 0, rotZ: 0 },
    snippet: '37 cross-referenced citations validated. Synaptic summary cached.',
    status: 'active',
  },
  {
    id: 'tab-6',
    title: 'Resource Allocation & Energy Grid Balance',
    category: 'Telemetry Ledger',
    iconName: 'BarChart3',
    initialPos: { x: -80, y: 170, z: 40, rotX: -10, rotY: 4, rotZ: 1 },
    snippet: 'Daily compute expenditure: 4.8 kWh. Net positive solar recoup.',
    status: 'active',
  },
];

export const WorkTabsLayer: React.FC<WorkTabsLayerProps> = ({
  state,
  orbCenter,
  onAllTabsAbsorbed,
}) => {
  const [tabs, setTabs] = useState<WorkTabItem[]>(INITIAL_TABS);
  const [absorbingTabIdx, setAbsorbingTabIdx] = useState<number>(-1);

  // Trigger sequential tab transfer when state moves to TAB_TRANSFER
  useEffect(() => {
    if (state === 'TAB_TRANSFER') {
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < tabs.length) {
          const tabId = tabs[currentIdx].id;
          const idxToAbsorb = currentIdx;
          setAbsorbingTabIdx(currentIdx);

          setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, status: 'transferring' } : t))
          );

          soundSynthesizer.playTabAbsorb(idxToAbsorb);

          // After individual animation travel, mark as absorbed
          setTimeout(() => {
            setTabs((prev) =>
              prev.map((t) => (t.id === tabId ? { ...t, status: 'absorbed' } : t))
            );
          }, 850);

          currentIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onAllTabsAbsorbed();
          }, 1000);
        }
      }, 500); // 500ms staggered overlap

      return () => clearInterval(interval);
    } else if (state === 'INITIAL_WORK_TABS') {
      setTabs(INITIAL_TABS.map((t) => ({ ...t, status: 'active' })));
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
                ? 'duration-800 ease-in opacity-0 scale-25'
                : 'duration-1000 ease-out opacity-90 hover:opacity-100'
            }`}
            style={{
              transform: isTransferring
                ? `translate3d(0px, 0px, -200px) rotateX(${tab.initialPos.rotX * 2}deg) rotateY(${tab.initialPos.rotY * 2}deg) scale(0.1)`
                : `translate3d(${tab.initialPos.x}px, ${tab.initialPos.y}px, ${tab.initialPos.z}px) rotateX(${tab.initialPos.rotX}deg) rotateY(${tab.initialPos.rotY}deg) rotateZ(${tab.initialPos.rotZ}deg)`,
              width: '260px',
              animation: isTransferring
                ? 'none'
                : `floatTab ${6 + idx * 0.7}s ease-in-out ${idx * 0.4}s infinite alternate`,
            }}
          >
            {/* Glassmorphic Tab Container */}
            <div className="glass-tab rounded-xl p-3.5 border border-cyan-400/25 bg-slate-900/75 shadow-2xl relative overflow-hidden group">
              {/* Top ambient glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

              {/* Tab Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-800/80 border border-white/10">
                    {getIcon(tab.iconName)}
                  </div>
                  <span className="text-[10px] tracking-wider text-cyan-200/70 uppercase font-sans font-medium">
                    {tab.category}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
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

              {/* Futuristic Micro-details (abstract grid / graph lines) */}
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400/60 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Synced
                </span>
                <span>STATE_CLOSED</span>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes floatTab {
          0% {
            transform: translate3d(var(--tx, 0), var(--ty, 0), var(--tz, 0)) translateY(0px) rotateZ(0deg);
          }
          100% {
            transform: translate3d(var(--tx, 0), var(--ty, 0), var(--tz, 0)) translateY(-10px) rotateZ(1deg);
          }
        }
      `}</style>
    </div>
  );
};
