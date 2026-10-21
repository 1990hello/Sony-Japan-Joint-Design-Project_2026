import React, { useEffect, useState } from 'react';
import { ExperienceState } from '../types';

interface EncouragementDisplayProps {
  state: ExperienceState;
  text: string;
}

export const EncouragementDisplay: React.FC<EncouragementDisplayProps> = ({ state, text }) => {
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const isVisible = state === 'GOLDEN_THREADS' || state === 'BLACK_THREADS';

  useEffect(() => {
    if (state === 'GOLDEN_THREADS') {
      setRevealedChars(0);
      let count = 0;
      const interval = setInterval(() => {
        count++;
        setRevealedChars(count);
        if (count >= text.length) {
          clearInterval(interval);
        }
      }, 70); // 70ms per character for graceful handwriting cadence

      return () => clearInterval(interval);
    } else {
      setRevealedChars(0);
    }
  }, [state, text]);

  if (!isVisible && state !== 'ORB_RELEASED') {
    return null;
  }

  // Fade out gently when moving beyond golden threads
  const opacity = state === 'GOLDEN_THREADS' ? 'opacity-100' : state === 'ORB_RELEASED' ? 'opacity-0' : 'opacity-30';

  return (
    <div
      className={`absolute top-[24%] left-1/2 -translate-x-1/2 pointer-events-none z-25 text-center transition-all duration-1000 ${opacity}`}
      style={{ maxWidth: '780px', width: '90%' }}
    >
      {/* Golden woven thread encouragement letters */}
      <div className="relative inline-block px-8 py-5">
        {/* Luminous aura behind text */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl pointer-events-none transition-opacity duration-1000"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(246, 214, 159, 0.22) 0%, transparent 75%)',
          }}
        />

        <div className="relative font-serif-luxury text-3xl md:text-5xl lg:text-6xl text-amber-100 tracking-wide font-light select-none leading-tight glow-champagne">
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
                  transitionDelay: `${(index % 3) * 20}ms`,
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        {/* Delicate golden thread filament accent line */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-300/70 shadow-[0_0_8px_rgba(246,214,159,0.9)]" />
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
        </div>
      </div>
    </div>
  );
};
