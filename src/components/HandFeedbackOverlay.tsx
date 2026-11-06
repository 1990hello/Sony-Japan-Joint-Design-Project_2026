import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HandData } from '../types';

interface HandFeedbackOverlayProps {
  hands: HandData[];
}

/**
 * Renders webcam hand landmarks above the floating UI.
 * This stays separate from OrbCanvas so 3D work tabs cannot cover the markers.
 */
export const HandFeedbackOverlay: React.FC<HandFeedbackOverlayProps> = ({ hands }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (hands.length === 0) return;

      ctx.save();
      hands.forEach((hand) => {
        const px = hand.palmCenter.x * w;
        const py = hand.palmCenter.y * h;

        const aura = ctx.createRadialGradient(px, py, 2, px, py, 35);
        aura.addColorStop(0, hand.isGrabbing ? 'rgba(255, 200, 100, 0.45)' : 'rgba(160, 200, 255, 0.25)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(px, py, 35, 0, Math.PI * 2);
        ctx.fill();

        const ix = hand.indexTip.x * w;
        const iy = hand.indexTip.y * h;
        const tx = hand.thumbTip.x * w;
        const ty = hand.thumbTip.y * h;

        ctx.fillStyle = hand.isPinching ? 'rgba(255, 220, 130, 0.9)' : 'rgba(200, 230, 255, 0.6)';
        ctx.shadowColor = 'rgba(246, 214, 159, 0.8)';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(ix, iy, 4, 0, Math.PI * 2);
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();

        if (hand.pinchDistance < 0.12) {
          ctx.strokeStyle = 'rgba(255, 220, 130, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ix, iy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
        }
      });

      // Inter-hand proximity feedback when two hands approach each other.
      if (hands.length >= 2) {
        const hA = hands[0];
        const hB = hands[1];
        const ax = hA.palmCenter.x * w;
        const ay = hA.palmCenter.y * h;
        const bx = hB.palmCenter.x * w;
        const by = hB.palmCenter.y * h;
        const dist = Math.hypot(hA.palmCenter.x - hB.palmCenter.x, hA.palmCenter.y - hB.palmCenter.y);

        if (dist < 0.38) {
          const closeness = Math.max(0, 1 - dist / 0.38);
          ctx.save();
          ctx.strokeStyle = `rgba(246, 214, 159, ${closeness * 0.8})`;
          ctx.lineWidth = 1.5 + closeness * 2;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10 + closeness * 12;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          const midX = (ax + bx) * 0.5;
          const midY = (ay + by) * 0.5;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(midX, midY, 3 + closeness * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [hands]);

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483647,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />,
    document.body
  );
};
