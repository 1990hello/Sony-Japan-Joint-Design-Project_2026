import React, { useEffect, useState } from 'react';
import { ExperienceState } from '../types';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface EncouragementDisplayProps {
  state: ExperienceState;
  text: string;
  onAdvanceFromAccomplishments?: () => void;
}

export const EncouragementDisplay: React.FC<EncouragementDisplayProps> = ({
  state,
  text,
  onAdvanceFromAccomplishments,
}) => {
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const [accomplishmentsVisible, setAccomplishmentsVisible] = useState<boolean>(false);

  // Check state categories
  const isAccomplishments = state === 'ACCOMPLISHMENTS' || state === 'ACCOMPLISHMENTS_REVEAL';
  const isAccomplishmentsDissolving = state === 'ACCOMPLISHMENTS_DISSOLVE';
  const isEncouragement =
    state === 'GOLDEN_ENCOURAGEMENT' || state === 'ENCOURAGEMENT' || state === 'GOLDEN_THREADS';
  const isCalmRelease = state === 'CALM_RELEASE';

  // Encouragement text handwriting animation
  useEffect(() => {
    if (isEncouragement) {
      setRevealedChars(0);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealedChars(count);
        if (count >= text.length) {
          clearInterval(interval);
        }
      }, 55); // smooth, organic handwriting cadence

      return () => clearInterval(interval);
    } else {
      setRevealedChars(0);
    }
  }, [isEncouragement, text]);

  // Accomplishments entrance
  useEffect(() => {
    if (isAccomplishments) {
      const timer = setTimeout(() => {
        setAccomplishmentsVisible(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setAccomplishmentsVisible(false);
    }
  }, [isAccomplishments]);

  if (
    !isAccomplishments &&
    !isAccomplishmentsDissolving &&
    !isEncouragement &&
    !isCalmRelease
  ) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center select-none">
      {/* 1. Stage 2.1: Personalised List of Accomplishments Coalescing Inside/Over the Holographic Orb */}
      {(isAccomplishments || isAccomplishmentsDissolving) && (
        <div
          className={`transition-all duration-1000 max-w-lg w-[92%] p-6 md:p-8 rounded-3xl bg-slate-950/75 border border-amber-300/40 backdrop-blur-xl shadow-[0_0_60px_rgba(251,191,36,0.2)] text-left ${
            isAccomplishmentsDissolving
              ? 'opacity-0 scale-90 blur-sm duration-700'
              : accomplishmentsVisible
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95'
          }`}
        >
          {/* Subtle orb radiance backdrop */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none opacity-40"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.25) 0%, transparent 70%)',
            }}
          />

          {/* Heading */}
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-amber-200/90 font-semibold">
              Today, you made progress on…
            </h2>
          </div>

          {/* List of 3 Accomplishments from specification & journey map */}
          <div className="space-y-4 mb-6">
            {/* Item 1: Earpience */}
            <div className="flex items-start gap-3.5 group">
              <div className="mt-0.5 p-1 rounded-full bg-amber-400/10 border border-amber-300/40 text-amber-300 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-amber-100 tracking-wide">
                  Earpience
                </div>
                <div className="text-xs text-slate-300/90 leading-relaxed font-sans">
                  Completed the 3D modelling.
                </div>
              </div>
            </div>

            {/* Item 2: Project 1 */}
            <div className="flex items-start gap-3.5 group">
              <div className="mt-0.5 p-1 rounded-full bg-amber-400/10 border border-amber-300/40 text-amber-300 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-amber-100 tracking-wide">
                  Project 1
                </div>
                <div className="text-xs text-slate-300/90 leading-relaxed font-sans">
                  Arranged a meeting with the clients.
                </div>
              </div>
            </div>

            {/* Item 3: Project 2 */}
            <div className="flex items-start gap-3.5 group">
              <div className="mt-0.5 p-1 rounded-full bg-amber-400/10 border border-amber-300/40 text-amber-300 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-amber-100 tracking-wide">
                  Project 2
                </div>
                <div className="text-xs text-slate-300/90 leading-relaxed font-sans">
                  Began sketching out ideas.
                </div>
              </div>
            </div>
          </div>

          {/* Closing note & interactive forward affordance */}
          <div className="pt-4 border-t border-amber-300/20 flex items-center justify-between">
            <p className="text-xs text-amber-200/80 italic font-serif leading-relaxed">
              “Every step counts, even the ones that are just beginning.”
            </p>
            {onAdvanceFromAccomplishments && (
              <button
                onClick={onAdvanceFromAccomplishments}
                className="pointer-events-auto ml-4 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 text-[11px] font-sans tracking-wide flex items-center gap-1.5 transition-all shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Stage 2.2: Golden Thread Encouragement Message */}
      {(isEncouragement || isCalmRelease) && (
        <div
          className={`transition-all duration-1000 max-w-2xl w-[90%] text-center ${
            isCalmRelease ? 'opacity-40 scale-95 duration-1000' : 'opacity-100 scale-100'
          }`}
        >
          <div className="relative inline-block px-8 py-6 rounded-3xl bg-slate-950/60 border border-amber-200/20 backdrop-blur-md shadow-2xl">
            {/* Luminous aura behind text */}
            <div
              className="absolute inset-0 rounded-3xl blur-2xl pointer-events-none opacity-40"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(246, 214, 159, 0.28) 0%, transparent 75%)',
              }}
            />

            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300/70 mb-3 font-sans">
              Voice of Reassurance
            </div>

            <div className="relative font-serif-luxury text-2xl md:text-4xl text-amber-100 tracking-wide font-light select-none leading-relaxed">
              {text.split('').map((char, index) => {
                const isShown = index < revealedChars;
                const isLatest = index === revealedChars - 1;

                return (
                  <span
                    key={index}
                    className={`transition-all duration-300 inline-block ${
                      isShown ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform translate-y-2 scale-90'
                    } ${isLatest ? 'text-amber-200 drop-shadow-[0_0_15px_rgba(255,230,160,1)]' : ''}`}
                    style={{
                      transitionDelay: `${(index % 3) * 15}ms`,
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </div>

            {/* Subtle decorative thread line */}
            <div className="mt-5 flex items-center justify-center gap-3">
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(246,214,159,0.9)]" />
              <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
