import React, { useState, useEffect, useRef } from 'react';
import { ExperienceState, HandData } from '../types';
import { soundSynthesizer } from '../services/soundSynthesizer';
import { Sparkles, Droplets, Utensils, RotateCcw, Heart, Move, Check } from 'lucide-react';

interface EdibleFilmTakeawayProps {
  state: ExperienceState;
  dockPosition: { x: number; y: number };
  hands?: HandData[];
  onChoiceSelected: (choice: 'water' | 'eat') => void;
  onRestart: () => void;
}

export const EdibleFilmTakeaway: React.FC<EdibleFilmTakeawayProps> = ({
  state,
  dockPosition,
  hands = [],
  onChoiceSelected,
  onRestart,
}) => {
  const [printProgress, setPrintProgress] = useState<number>(0);
  const [chosenOption, setChosenOption] = useState<'water' | 'eat' | null>(null);
  const [isDissolvingInGlass, setIsDissolvingInGlass] = useState<boolean>(false);
  const [isConsumed, setIsConsumed] = useState<boolean>(false);

  // Gesture state for Option A (Two Pinches) and Option B (Drag to Cup)
  const [pinchCount, setPinchCount] = useState<number>(0); // 0 = unselected, 1 = selected, 2 = confirmed eating
  const [isFilmSelected, setIsFilmSelected] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [gestureHint, setGestureHint] = useState<string>(
    'Pinch film once to select, or pinch & drag to the cup of water'
  );

  const prevHandPinchingRef = useRef<boolean>(false);
  const lastPinchTimeRef = useRef<number>(0);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDragStartRef = useRef<{ x: number; y: number } | null>(null);

  const isQuoteState = state === 'WISDOM_QUOTE' || state === 'QUOTE_PRESENTATION';
  const isPrintingState = state === 'PRINT_EDIBLE_FILM' || state === 'EDIBLE_FILM_PRINTING';
  const isChoiceState = state === 'TAKEAWAY_CHOICE';
  const isCompleteState = state === 'CLOSURE_COMPLETE';

  // Cup of water normalized coordinates on desk
  const CUP_POS = { x: 0.81, y: 0.59 };

  // Handle printing animation in PRINT_EDIBLE_FILM
  useEffect(() => {
    if (isPrintingState) {
      soundSynthesizer.playMechanicalPrint();
      setPrintProgress(0);
      let p = 0;
      const interval = setInterval(() => {
        p += 0.05;
        setPrintProgress(Math.min(1, p));
        if (p >= 1) {
          clearInterval(interval);
        }
      }, 70);

      return () => clearInterval(interval);
    } else if (isChoiceState || isCompleteState) {
      setPrintProgress(1);
    } else {
      setPrintProgress(0);
      setChosenOption(null);
      setIsDissolvingInGlass(false);
      setIsConsumed(false);
      setPinchCount(0);
      setIsFilmSelected(false);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [state, isPrintingState, isChoiceState, isCompleteState]);

  // Option A Confirmation: Eat the film
  const triggerEat = () => {
    if (chosenOption) return;
    setChosenOption('eat');
    setIsConsumed(true);
    soundSynthesizer.playEdibleConsume();
    setGestureHint('Edible film consumed. Resting mind...');
    setTimeout(() => {
      onChoiceSelected('eat');
    }, 1400);
  };

  // Option B Confirmation: Dissolve in cup of water
  const triggerWaterDissolve = () => {
    if (chosenOption) return;
    setChosenOption('water');
    setIsDissolvingInGlass(true);
    soundSynthesizer.playWaterDissolve();
    setGestureHint('Film dissolving into evening nutrient elixir...');
    setTimeout(() => {
      onChoiceSelected('water');
    }, 1800);
  };

  // Real Hand Tracking Gesture Recognizer (Fix 3: Two Pinches to Eat, or Drag to Cup)
  useEffect(() => {
    if (!isChoiceState || chosenOption) return;

    // Check if any hand is detected
    const activeHand = hands[0];
    if (!activeHand) {
      prevHandPinchingRef.current = false;
      return;
    }

    const isPinching = activeHand.isPinching;
    const handX = activeHand.indexTip.x;
    const handY = activeHand.indexTip.y;
    const now = Date.now();

    // Default film normalized position
    const filmDefaultX = dockPosition.x;
    const filmDefaultY = dockPosition.y + 0.08;

    // Current film position
    const currentFilmX = filmDefaultX + dragOffset.x / window.innerWidth;
    const currentFilmY = filmDefaultY + dragOffset.y / window.innerHeight;

    const distToFilm = Math.hypot(handX - currentFilmX, handY - currentFilmY);

    // Hand starts pinching near film
    if (isPinching && !prevHandPinchingRef.current) {
      if (distToFilm < 0.18) {
        dragStartPosRef.current = { x: handX, y: handY };

        // If not dragging yet, check if this is pinch #1 or pinch #2
        if (pinchCount === 0) {
          // Pinch 1: Pick up / Select film
          setPinchCount(1);
          setIsFilmSelected(true);
          lastPinchTimeRef.current = now;
          soundSynthesizer.playAccomplishmentsChime();
          setGestureHint('Pinch 1 recognized: Film selected! Pinch again to eat, or drag to water cup.');
        } else if (pinchCount === 1 && now - lastPinchTimeRef.current > 350) {
          // Pinch 2: Confirmed eating (only if not currently dragging away)
          if (!isDragging) {
            setPinchCount(2);
            triggerEat();
            return;
          }
        }
      }
    }

    // Hand is holding and moving (Pinch-and-drag towards cup)
    if (isPinching && dragStartPosRef.current) {
      const movedDist = Math.hypot(handX - dragStartPosRef.current.x, handY - dragStartPosRef.current.y);
      if (movedDist > 0.04) {
        setIsDragging(true);
        // Prioritise drag over eating
        setDragOffset({
          x: (handX - filmDefaultX) * window.innerWidth,
          y: (handY - filmDefaultY) * window.innerHeight,
        });

        const distToCup = Math.hypot(handX - CUP_POS.x, handY - CUP_POS.y);
        if (distToCup < 0.12) {
          setGestureHint('Hovering over cup! Release pinch to dissolve in water.');
        } else {
          setGestureHint('Dragging film towards cup of water on desk...');
        }
      }
    }

    // Hand releases pinch
    if (!isPinching && prevHandPinchingRef.current) {
      if (isDragging) {
        // Check if released inside the cup's interaction area
        const distToCup = Math.hypot(handX - CUP_POS.x, handY - CUP_POS.y);
        if (distToCup < 0.13) {
          triggerWaterDissolve();
        } else {
          // Dropped outside cup: keep film available and gently spring back
          setIsDragging(false);
          setDragOffset({ x: 0, y: 0 });
          setGestureHint('Released outside cup. Drag into cup of water, or pinch twice to eat.');
        }
        dragStartPosRef.current = null;
      }
    }

    prevHandPinchingRef.current = isPinching;
  }, [hands, isChoiceState, chosenOption, dockPosition, dragOffset, isDragging, pinchCount]);

  // Mouse / Touch Fallback Handlers (Allows testing on desktop or click-and-drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isChoiceState || chosenOption) return;
    mouseDragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseDragStartRef.current || !isChoiceState || chosenOption) return;
    const dx = e.clientX - mouseDragStartRef.current.x;
    const dy = e.clientY - mouseDragStartRef.current.y;
    if (Math.hypot(dx, dy) > 10) {
      setIsDragging(true);
      setDragOffset({ x: dx, y: dy });

      // Check distance to cup
      const cupScreenX = CUP_POS.x * window.innerWidth;
      const cupScreenY = CUP_POS.y * window.innerHeight;
      const dist = Math.hypot(e.clientX - cupScreenX, e.clientY - cupScreenY);
      if (dist < 80) {
        setGestureHint('Over water cup! Release to dissolve.');
      } else {
        setGestureHint('Dragging to water glass on the desk...');
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDragStartRef.current || !isChoiceState || chosenOption) return;
    const dx = e.clientX - mouseDragStartRef.current.x;
    const dy = e.clientY - mouseDragStartRef.current.y;
    const moved = Math.hypot(dx, dy);

    if (moved > 25) {
      // Drag attempt
      const cupScreenX = CUP_POS.x * window.innerWidth;
      const cupScreenY = CUP_POS.y * window.innerHeight;
      const dist = Math.hypot(e.clientX - cupScreenX, e.clientY - cupScreenY);

      if (dist < 90) {
        triggerWaterDissolve();
      } else {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setGestureHint('Released outside cup. Drag into cup, or pinch twice to eat.');
      }
    } else {
      // Click/Pinch attempt
      const now = Date.now();
      if (pinchCount === 0) {
        setPinchCount(1);
        setIsFilmSelected(true);
        lastPinchTimeRef.current = now;
        soundSynthesizer.playAccomplishmentsChime();
        setGestureHint('Pinch 1 recognized: Film selected! Pinch again to confirm eating, or drag to cup.');
      } else if (pinchCount === 1 && now - lastPinchTimeRef.current > 300) {
        setPinchCount(2);
        triggerEat();
      }
    }
    mouseDragStartRef.current = null;
  };

  if (!isQuoteState && !isPrintingState && !isChoiceState && !isCompleteState) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-6 select-none font-sans">
      {/* 1. Wisdom Quote Header (Spoken aloud and displayed near dock) */}
      <div
        className={`transition-all duration-1000 max-w-xl mx-auto mt-16 text-center ${
          isQuoteState || isPrintingState || isChoiceState
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="inline-block px-8 py-5 rounded-2xl bg-slate-900/85 border border-amber-300/30 backdrop-blur-md shadow-2xl">
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 mb-2 font-sans">
            Wisdom for the Evening
          </div>
          <p className="font-serif-luxury text-2xl md:text-3xl text-amber-100 tracking-wide leading-snug">
            “A calmer mind creates a brighter tomorrow.”
          </p>
          <div className="mt-2 text-xs text-slate-400 font-sans">
            {isPrintingState
              ? 'Printing onto nutrient edible film from dock slot...'
              : isChoiceState
              ? 'Edible film printed and ready on dock.'
              : 'Wisdom presented.'}
          </div>
        </div>
      </div>

      {/* 2. Interactive Edible Film Sheet (Pinchable & Draggable) */}
      {(isPrintingState || isChoiceState || (isCompleteState && chosenOption === null)) && (
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`absolute pointer-events-auto transition-transform ${
            isDissolvingInGlass
              ? 'translate-x-44 translate-y-6 scale-75 opacity-0 rotate-12 duration-1000'
              : isConsumed
              ? 'scale-50 opacity-0 -translate-y-24 duration-700'
              : isDragging
              ? 'cursor-grabbing duration-75 scale-105'
              : 'cursor-grab duration-500'
          }`}
          style={{
            left: `${dockPosition.x * 100}%`,
            top: `${(dockPosition.y + 0.08) * 100}%`,
            transform: `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px)) ${
              isFilmSelected && !isDragging ? 'scale(1.08) translateY(-12px)' : ''
            }`,
            width: '230px',
            height: '145px',
          }}
        >
          {/* Film sheet animation emerging from horizontal slot */}
          <div
            className={`w-full h-full rounded-xl shadow-2xl p-3.5 flex flex-col justify-between border backdrop-blur-md transition-all duration-300 overflow-hidden ${
              isFilmSelected
                ? 'border-amber-300 ring-2 ring-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.5)]'
                : 'border-amber-200/50'
            }`}
            style={{
              background:
                'linear-gradient(135deg, rgba(254, 243, 199, 0.92) 0%, rgba(253, 230, 138, 0.82) 60%, rgba(251, 191, 36, 0.7) 100%)',
              clipPath: `inset(0 0 ${(1 - printProgress) * 100}% 0)`,
              boxShadow: '0 10px 30px -5px rgba(245, 158, 11, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.6)',
            }}
          >
            {/* Watermark / Seal */}
            <div className="flex items-center justify-between text-[8px] text-amber-900/70 font-mono">
              <span className="tracking-widest uppercase font-semibold">EDIBLE MICRO-FILM</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-200/60 font-sans text-[7.5px]">
                {isFilmSelected ? 'SELECTED · PINCH AGAIN TO EAT' : 'L-THEANINE & MAGNESIUM'}
              </span>
            </div>

            {/* Imprinted Wisdom Quote */}
            <div className="my-auto text-center px-1">
              <p className="font-serif text-[13px] md:text-[14px] text-amber-950 font-medium leading-tight italic">
                “A calmer mind creates a brighter tomorrow.”
              </p>
            </div>

            {/* Bottom film metadata */}
            <div className="flex items-center justify-between text-[7px] text-amber-900/70 font-sans border-t border-amber-800/20 pt-1">
              <span>Sanctuary Bio-Print · 100% Soluble</span>
              <Sparkles className="w-2.5 h-2.5 text-amber-800/80" />
            </div>
          </div>

          {/* Interactive Affordance Pill floating above film */}
          {isChoiceState && !chosenOption && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900/90 border border-amber-400/40 text-[9px] text-amber-200 shadow-lg flex items-center gap-1.5">
              <Move className="w-2.5 h-2.5 text-cyan-300" />
              <span>{isFilmSelected ? 'Pinch again to Eat, or Drag to Cup' : 'Pinch or Drag Film'}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Stage 3 Takeaway Choice HUD & Direct Action Controls */}
      {isChoiceState && !chosenOption && (
        <div className="max-w-xl mx-auto mb-8 w-full pointer-events-auto transition-all duration-700 animate-in fade-in slide-in-from-bottom-6">
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-amber-300/30 backdrop-blur-xl shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h3 className="text-xs font-mono font-medium uppercase tracking-[0.2em] text-amber-200">
                A Closing Ritual For You
              </h3>
            </div>

            {/* Active Gesture Guidance Indicator */}
            <div className="my-2.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-300/20 text-xs text-amber-200/90 inline-block">
              {gestureHint}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
              {/* Option A: Eat using two pinches */}
              <button
                onClick={triggerEat}
                className={`group relative p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all shadow-lg cursor-pointer ${
                  pinchCount >= 1
                    ? 'border-amber-300 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                    : 'border-amber-400/30 bg-slate-800/80 hover:bg-slate-800 hover:border-amber-300'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-100 group-hover:text-amber-200 transition-colors flex items-center gap-1.5">
                    <span>Option A: Eat Edible Film</span>
                    {pinchCount >= 1 && <Check className="w-3 h-3 text-amber-300" />}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    {pinchCount === 0
                      ? 'Pinch once to select, pinch a second time to confirm eating.'
                      : 'Pinch #1 confirmed! Click or pinch again to eat directly.'}
                  </div>
                </div>
              </button>

              {/* Option B: Dissolve in water */}
              <button
                onClick={triggerWaterDissolve}
                className="group relative p-3.5 rounded-xl border border-cyan-400/30 bg-slate-800/80 hover:bg-slate-800 hover:border-cyan-300 transition-all text-left flex items-start gap-3 shadow-lg cursor-pointer"
              >
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 group-hover:scale-105 transition-transform shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-100 group-hover:text-cyan-200 transition-colors">
                    Option B: Dissolve in Water
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    Pinch and drag the film to the water glass on the desk to dissolve.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Stage 3 Final Completion State: "You've done enough. Now it's your time." */}
      {isCompleteState && (
        <div className="max-w-lg mx-auto my-auto pointer-events-auto transition-all duration-1000 animate-in fade-in zoom-in-95">
          <div className="p-8 rounded-3xl bg-slate-900/85 border border-amber-400/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(251,191,36,0.15)] text-center">
            <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-300/30 mx-auto flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
              <Heart className="w-6 h-6 animate-pulse" />
            </div>

            <h2 className="font-serif-luxury text-3xl md:text-4xl text-amber-100 font-light tracking-wide leading-tight mb-3">
              “You’ve done enough. Now it’s your time.”
            </h2>

            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mb-6 font-sans">
              {chosenOption === 'water'
                ? 'Your evening elixir is ready on the desk. All responsibilities are gently put away for tomorrow.'
                : 'Your work is released. Take this quiet moment to rest and reclaim your evening.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onRestart}
                className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium tracking-wide flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Experience Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
