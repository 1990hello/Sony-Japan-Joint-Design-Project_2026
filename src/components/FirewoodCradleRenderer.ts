/**
 * Firewood Cradle Procedural Canvas Renderer
 * 
 * Recreates the photorealistic, cozy burning firewood cradle docking station
 * matching the reference image:
 * - Natural dark charred logs arranged in a circular cradle
 * - Incandescent glowing embers and white-hot coal bed
 * - Realistic flickering procedural flame tongues (back & foreground)
 * - Rising floating sparks / embers
 * - Soft curling smoke wisps
 * - Translucent glass orb with intricate golden-white fairy-light filaments
 *   and rich warm campfire under-illumination.
 */

export interface CradleSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface CradleSmoke {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
}

export class FirewoodCradleManager {
  private sparks: CradleSpark[] = [];
  private smoke: CradleSmoke[] = [];
  private nextSparkTime: number = 0;
  private nextSmokeTime: number = 0;

  constructor() {
    this.initPool();
  }

  private initPool() {
    this.sparks = [];
    this.smoke = [];
  }

  public update(cx: number, cy: number, dt: number, isDocked: boolean, time: number) {
    const intensity = isDocked ? 1.0 : 0.65;

    // Spawn sparks / embers
    if (time > this.nextSparkTime) {
      if (this.sparks.length < 45) {
        const spreadX = (Math.random() - 0.5) * 80;
        const startY = cy + 30 + (Math.random() - 0.5) * 15;
        const colors = ['#ffffff', '#fff2b2', '#ffbe3b', '#ff781f', '#e63946'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];
        const maxLife = 1.2 + Math.random() * 1.6;

        this.sparks.push({
          x: cx + spreadX,
          y: startY,
          vx: (Math.random() - 0.5) * 22,
          vy: -(35 + Math.random() * 55 * intensity),
          size: 1.2 + Math.random() * 2.2,
          alpha: 1,
          maxAlpha: 0.75 + Math.random() * 0.25,
          life: 0,
          maxLife,
          color: chosenColor,
        });
      }
      this.nextSparkTime = time + (isDocked ? 0.05 : 0.09);
    }

    // Spawn smoke particles
    if (time > this.nextSmokeTime) {
      if (this.smoke.length < 24) {
        const spreadX = (Math.random() - 0.5) * 60;
        const startY = cy + 10;
        const maxLife = 2.4 + Math.random() * 1.8;

        this.smoke.push({
          x: cx + spreadX,
          y: startY,
          vx: (Math.random() - 0.5) * 15,
          vy: -(18 + Math.random() * 28),
          radius: 12 + Math.random() * 8,
          maxRadius: 40 + Math.random() * 25,
          alpha: 0,
          maxAlpha: (0.08 + Math.random() * 0.07) * intensity,
          life: 0,
          maxLife,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.4,
        });
      }
      this.nextSmokeTime = time + 0.16;
    }

    // Update sparks
    this.sparks.forEach((s) => {
      s.life += dt;
      const progress = s.life / s.maxLife;
      s.x += s.vx * dt + Math.sin(time * 5 + s.y * 0.05) * 0.6;
      s.y += s.vy * dt;
      s.alpha = s.maxAlpha * Math.sin(progress * Math.PI);
    });
    this.sparks = this.sparks.filter((s) => s.life < s.maxLife);

    // Update smoke
    this.smoke.forEach((sm) => {
      sm.life += dt;
      const progress = sm.life / sm.maxLife;
      sm.x += sm.vx * dt + Math.sin(time * 2 + sm.y * 0.03) * 0.4;
      sm.y += sm.vy * dt;
      sm.rotation += sm.rotSpeed * dt;
      sm.radius += ((sm.maxRadius - sm.radius) / sm.maxLife) * dt * 1.2;

      if (progress < 0.25) {
        sm.alpha = (progress / 0.25) * sm.maxAlpha;
      } else {
        sm.alpha = (1 - (progress - 0.25) / 0.75) * sm.maxAlpha;
      }
    });
    this.smoke = this.smoke.filter((sm) => sm.life < sm.maxLife);
  }

  /**
   * Renders the rear part of the Firewood Cradle:
   * Ground contact shadow, back charred logs, glowing coal bed, and rear flames.
   */
  public renderBack(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isDocked: boolean,
    isHovered: boolean,
    time: number
  ) {
    ctx.save();

    const heatPulse = 1.0 + Math.sin(time * 3.5) * 0.12;
    const intensity = (isDocked ? 1.0 : isHovered ? 0.9 : 0.7) * heatPulse;

    // 1. Broad Warm Ambient Table Glow & Hearth Shadows
    const tableGlow = ctx.createRadialGradient(cx, cy + 35, 10, cx, cy + 35, 220);
    tableGlow.addColorStop(0, `rgba(255, 140, 30, ${0.42 * intensity})`);
    tableGlow.addColorStop(0.35, `rgba(230, 80, 10, ${0.2 * intensity})`);
    tableGlow.addColorStop(0.7, `rgba(140, 40, 5, ${0.08 * intensity})`);
    tableGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = tableGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 42, 210, 65, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark contact shadow directly beneath logs
    const shadowGrad = ctx.createRadialGradient(cx, cy + 48, 20, cx, cy + 48, 140);
    shadowGrad.addColorStop(0, 'rgba(5, 3, 2, 0.95)');
    shadowGrad.addColorStop(0.65, 'rgba(15, 8, 4, 0.7)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 50, 140, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Back Firewood Logs (Angled behind the resting position)
    this.renderBackLogs(ctx, cx, cy, time, intensity);

    // 3. Glowing Coal Bed (The incandescent white-hot & ember core)
    this.renderCoalBed(ctx, cx, cy, time, intensity);

    // 4. Rear Flame Tongues (Rising behind the orb and around sides)
    this.renderFlames(ctx, cx, cy, time, intensity, false);

    // 5. Rising Smoke Wisps
    this.renderSmoke(ctx);

    ctx.restore();
  }

  /**
   * Renders the front part of the Firewood Cradle:
   * Front charred logs, foreground flame licks, sparks/embers, and front rim highlights.
   */
  public renderFront(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    isDocked: boolean,
    isHovered: boolean,
    time: number
  ) {
    ctx.save();

    const heatPulse = 1.0 + Math.sin(time * 3.5) * 0.12;
    const intensity = (isDocked ? 1.0 : isHovered ? 0.9 : 0.7) * heatPulse;

    // 1. Foreground flame tongues licking up between the front logs
    this.renderFlames(ctx, cx, cy, time, intensity, true);

    // 2. Front Charred Logs (Cradling the lower hemisphere of the orb)
    this.renderFrontLogs(ctx, cx, cy, time, intensity);

    // 3. Floating Embers & Sparks
    this.renderSparks(ctx);

    // 4. Subtle front fire reflection highlights on desk
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const deskHighlight = ctx.createRadialGradient(cx, cy + 62, 5, cx, cy + 62, 90);
    deskHighlight.addColorStop(0, `rgba(255, 180, 60, ${0.35 * intensity})`);
    deskHighlight.addColorStop(0.5, `rgba(255, 90, 15, ${0.15 * intensity})`);
    deskHighlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = deskHighlight;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 65, 100, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Helper: Renders realistic charred logs with wood bark texture,
   * growth rings on cut ends, and glowing orange crevices.
   */
  private drawCharredLog(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    thickness: number,
    cutEndOnRight: boolean = true,
    emberCracks: boolean = true,
    fireRimLight: boolean = true,
    intensity: number = 1.0
  ) {
    ctx.save();

    const dx = endX - startX;
    const dy = endY - startY;
    const len = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.translate(startX, startY);
    ctx.rotate(angle);

    const halfT = thickness * 0.5;

    // Main log body silhouette
    ctx.beginPath();
    ctx.moveTo(0, -halfT);
    ctx.lineTo(len, -halfT * 0.92);
    ctx.lineTo(len, halfT * 0.92);
    ctx.lineTo(0, halfT);
    ctx.closePath();

    // Dark charred bark gradient
    const logGrad = ctx.createLinearGradient(0, -halfT, 0, halfT);
    logGrad.addColorStop(0, '#2b1d14'); // charred umber
    logGrad.addColorStop(0.3, '#1a110c'); // charcoal dark
    logGrad.addColorStop(0.7, '#120c08'); // burnt black
    logGrad.addColorStop(1, '#0c0805'); // shadow black
    ctx.fillStyle = logGrad;
    ctx.fill();

    // Bark texture striations (longitudinal rugged lines)
    ctx.strokeStyle = 'rgba(70, 48, 32, 0.45)';
    ctx.lineWidth = 1.2;
    for (let i = -halfT + 4; i < halfT - 3; i += 4) {
      ctx.beginPath();
      ctx.moveTo(4, i + Math.sin(i) * 1.5);
      ctx.lineTo(len - 4, i + Math.cos(i) * 1.5);
      ctx.stroke();
    }

    // Glowing ember cracks running along the charred bark
    if (emberCracks) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 120, 20, ${0.75 * intensity})`;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#ff6b00';
      ctx.shadowBlur = 8 * intensity;

      ctx.beginPath();
      ctx.moveTo(len * 0.2, 0);
      ctx.lineTo(len * 0.38, -2);
      ctx.lineTo(len * 0.55, 3);
      ctx.lineTo(len * 0.72, -1);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 230, 150, ${0.9 * intensity})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    // Fire rim light along inner edge facing the fire
    if (fireRimLight) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 185, 70, ${0.65 * intensity})`;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10 * intensity;
      ctx.beginPath();
      ctx.moveTo(2, -halfT);
      ctx.lineTo(len - 2, -halfT * 0.92);
      ctx.stroke();
      ctx.restore();
    }

    // Cut End with Tree Growth Rings
    const cutX = cutEndOnRight ? len : 0;
    const endR = halfT * 0.95;

    ctx.save();
    ctx.translate(cutX, 0);
    ctx.scale(0.48, 1.0); // 3D perspective foreshortening

    // Cut face base (tan / amber exposed wood)
    const endFaceGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, endR);
    endFaceGrad.addColorStop(0, '#be9468'); // light inner heartwood
    endFaceGrad.addColorStop(0.6, '#825936'); // middle wood
    endFaceGrad.addColorStop(0.85, '#4e331e'); // outer wood
    endFaceGrad.addColorStop(1, '#1b120c'); // dark charred bark rim

    ctx.fillStyle = endFaceGrad;
    ctx.beginPath();
    ctx.arc(0, 0, endR, 0, Math.PI * 2);
    ctx.fill();

    // Concentric growth rings
    ctx.strokeStyle = 'rgba(60, 40, 24, 0.65)';
    ctx.lineWidth = 1.0;
    for (let r = endR * 0.28; r < endR; r += endR * 0.24) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tiny radial heartwood checks / fissures
    ctx.strokeStyle = 'rgba(25, 16, 9, 0.8)';
    ctx.lineWidth = 1.1;
    for (let a = 0; a < Math.PI * 2; a += Math.PI * 0.65) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (endR * 0.75), Math.sin(a) * (endR * 0.75));
      ctx.stroke();
    }

    // Cut end rim highlight catching firelight
    ctx.strokeStyle = `rgba(255, 215, 140, ${0.6 * intensity})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, endR, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }

  private renderBackLogs(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number,
    intensity: number
  ) {
    // Log 1: Back-left deep diagonal log
    this.drawCharredLog(ctx, cx - 118, cy + 6, cx - 18, cy + 26, 26, false, true, true, intensity);

    // Log 2: Back-right deep diagonal log
    this.drawCharredLog(ctx, cx + 16, cy + 28, cx + 124, cy + 2, 24, true, true, true, intensity);

    // Log 3: Back-center horizontal cross brace
    this.drawCharredLog(ctx, cx - 82, cy + 18, cx + 80, cy + 16, 22, true, false, true, intensity);

    // Log 4: Rear-left upright support branch
    this.drawCharredLog(ctx, cx - 105, cy + 28, cx - 48, cy + 42, 18, false, true, true, intensity);
  }

  private renderFrontLogs(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number,
    intensity: number
  ) {
    // Log 5: Far-right angled log
    this.drawCharredLog(ctx, cx + 38, cy + 40, cx + 115, cy + 24, 20, true, true, true, intensity);

    // Log 6: Front main left-to-center log (crosses under front of orb)
    this.drawCharredLog(ctx, cx - 110, cy + 42, cx + 15, cy + 56, 28, false, true, true, intensity);

    // Log 7: Front main right-to-center log (crosses overlapping Log 6)
    this.drawCharredLog(ctx, cx - 22, cy + 58, cx + 98, cy + 46, 26, true, true, true, intensity);

    // Log 8: Front bottom small charred twig at base
    this.drawCharredLog(ctx, cx - 55, cy + 66, cx + 45, cy + 68, 14, true, false, false, intensity);
  }

  /**
   * Renders the incandescent glowing ember bed nestled in the center of the cradle.
   */
  private renderCoalBed(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number,
    intensity: number
  ) {
    ctx.save();

    const bedX = cx;
    const bedY = cy + 28;

    // Deep fiery ember core
    const coreGrad = ctx.createRadialGradient(bedX, bedY, 4, bedX, bedY, 68);
    coreGrad.addColorStop(0, 'rgba(255, 255, 250, 0.98)'); // pure white heat
    coreGrad.addColorStop(0.2, 'rgba(255, 230, 130, 0.95)'); // bright gold
    coreGrad.addColorStop(0.5, 'rgba(255, 110, 20, 0.85)'); // fiery orange
    coreGrad.addColorStop(0.8, 'rgba(195, 30, 10, 0.55)'); // deep ruby ember
    coreGrad.addColorStop(1, 'rgba(40, 10, 5, 0)');

    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.ellipse(bedX, bedY, 68, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scattered glowing charcoal lumps
    const coalLumps = [
      { x: -32, y: -6, r: 9, heat: 0.85 },
      { x: -14, y: 6, r: 12, heat: 0.98 },
      { x: 10, y: -4, r: 11, heat: 0.95 },
      { x: 28, y: 4, r: 8, heat: 0.78 },
      { x: -2, y: 12, r: 10, heat: 0.9 },
      { x: -44, y: 4, r: 7, heat: 0.65 },
      { x: 38, y: -6, r: 8, heat: 0.72 },
    ];

    coalLumps.forEach((cl) => {
      const lumpX = bedX + cl.x;
      const lumpY = bedY + cl.y;
      const pulse = Math.sin(time * 4 + cl.x) * 0.15;
      const lumpIntensity = Math.min(1, cl.heat * intensity * (1 + pulse));

      const lumpGrad = ctx.createRadialGradient(lumpX, lumpY, 1, lumpX, lumpY, cl.r);
      lumpGrad.addColorStop(0, `rgba(255, 250, 220, ${0.95 * lumpIntensity})`);
      lumpGrad.addColorStop(0.4, `rgba(255, 140, 30, ${0.85 * lumpIntensity})`);
      lumpGrad.addColorStop(0.8, `rgba(160, 25, 8, ${0.65 * lumpIntensity})`);
      lumpGrad.addColorStop(1, 'rgba(20, 5, 2, 0.8)');

      ctx.fillStyle = lumpGrad;
      ctx.beginPath();
      ctx.ellipse(lumpX, lumpY, cl.r, cl.r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Renders living, organic procedural flame tongues.
   * isForeground: true draws smaller tongues in front of logs,
   * false draws full rising flames behind the orb.
   */
  private renderFlames(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number,
    intensity: number,
    isForeground: boolean
  ) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Flame tongue specifications
    const flameTongues = isForeground
      ? [
          { offsetX: -28, baseW: 16, height: 42, speed: 7.2, seed: 1.2 },
          { offsetX: -8,  baseW: 20, height: 55, speed: 8.5, seed: 2.8 },
          { offsetX: 12,  baseW: 18, height: 48, speed: 7.8, seed: 4.1 },
          { offsetX: 32,  baseW: 14, height: 36, speed: 6.9, seed: 5.6 },
        ]
      : [
          // Background flames rising behind and around the orb
          { offsetX: -55, baseW: 24, height: 95,  speed: 6.5, seed: 0.7 },
          { offsetX: -35, baseW: 30, height: 125, speed: 7.8, seed: 1.9 },
          { offsetX: -16, baseW: 34, height: 145, speed: 8.6, seed: 3.2 },
          { offsetX: 4,   baseW: 36, height: 155, speed: 9.1, seed: 4.4 },
          { offsetX: 24,  baseW: 32, height: 135, speed: 8.1, seed: 5.8 },
          { offsetX: 48,  baseW: 26, height: 105, speed: 7.1, seed: 6.5 },
          { offsetX: 68,  baseW: 20, height: 78,  speed: 6.2, seed: 7.9 },
        ];

    const baseY = cy + (isForeground ? 44 : 28);

    flameTongues.forEach((flame) => {
      const baseX = cx + flame.offsetX;
      const tHarmonic = time * flame.speed + flame.seed;

      // Sine harmonic sway for organic flame waving
      const swayMid = Math.sin(tHarmonic) * 8 + Math.cos(tHarmonic * 1.5) * 4;
      const swayTip = Math.sin(tHarmonic * 1.2) * 16 + Math.cos(tHarmonic * 2.2) * 8;

      const currentH = flame.height * (0.82 + Math.sin(tHarmonic * 1.8) * 0.18) * intensity;
      const tipX = baseX + swayTip;
      const tipY = baseY - currentH;

      const halfW = flame.baseW * 0.5 * (0.9 + Math.cos(tHarmonic) * 0.1);

      // Flame body path
      ctx.beginPath();
      ctx.moveTo(baseX - halfW, baseY);
      ctx.bezierCurveTo(
        baseX - halfW * 0.8 + swayMid * 0.4,
        baseY - currentH * 0.45,
        tipX - halfW * 0.3,
        baseY - currentH * 0.8,
        tipX,
        tipY
      );
      ctx.bezierCurveTo(
        tipX + halfW * 0.3,
        baseY - currentH * 0.8,
        baseX + halfW * 0.8 + swayMid * 0.4,
        baseY - currentH * 0.45,
        baseX + halfW,
        baseY
      );
      ctx.closePath();

      // Radiant flame gradient: white-yellow core -> vibrant fiery orange -> amber dissipation
      const flameGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
      flameGrad.addColorStop(0, `rgba(255, 255, 240, ${0.9 * intensity})`);
      flameGrad.addColorStop(0.25, `rgba(255, 210, 80, ${0.85 * intensity})`);
      flameGrad.addColorStop(0.65, `rgba(255, 110, 15, ${0.65 * intensity})`);
      flameGrad.addColorStop(0.92, `rgba(235, 45, 5, ${0.3 * intensity})`);
      flameGrad.addColorStop(1, 'rgba(120, 10, 0, 0)');

      ctx.fillStyle = flameGrad;
      ctx.fill();

      // Luminous inner core for depth
      ctx.beginPath();
      ctx.moveTo(baseX - halfW * 0.45, baseY);
      ctx.bezierCurveTo(
        baseX - halfW * 0.35 + swayMid * 0.25,
        baseY - currentH * 0.3,
        tipX - halfW * 0.15,
        baseY - currentH * 0.6,
        tipX * 0.8 + baseX * 0.2,
        baseY - currentH * 0.65
      );
      ctx.bezierCurveTo(
        tipX + halfW * 0.15,
        baseY - currentH * 0.6,
        baseX + halfW * 0.35 + swayMid * 0.25,
        baseY - currentH * 0.3,
        baseX + halfW * 0.45,
        baseY
      );
      ctx.closePath();

      const innerGrad = ctx.createLinearGradient(baseX, baseY, tipX, baseY - currentH * 0.65);
      innerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * intensity})`);
      innerGrad.addColorStop(0.4, `rgba(255, 240, 150, ${0.8 * intensity})`);
      innerGrad.addColorStop(1, 'rgba(255, 160, 40, 0)');

      ctx.fillStyle = innerGrad;
      ctx.fill();
    });

    ctx.restore();
  }

  private renderSparks(ctx: CanvasRenderingContext2D) {
    if (this.sparks.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.sparks.forEach((s) => {
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  private renderSmoke(ctx: CanvasRenderingContext2D) {
    if (this.smoke.length === 0) return;

    ctx.save();

    this.smoke.forEach((sm) => {
      ctx.save();
      ctx.translate(sm.x, sm.y);
      ctx.rotate(sm.rotation);

      const smokeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sm.radius);
      // Soft warm grey smoke illuminated from below by the fire
      smokeGrad.addColorStop(0, `rgba(185, 165, 155, ${sm.alpha * 1.2})`);
      smokeGrad.addColorStop(0.45, `rgba(130, 120, 115, ${sm.alpha * 0.7})`);
      smokeGrad.addColorStop(1, 'rgba(80, 75, 70, 0)');

      ctx.fillStyle = smokeGrad;
      ctx.beginPath();
      ctx.arc(0, 0, sm.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }
}

/**
 * Renders the Translucent Glass Orb with intricate golden-white energy lines
 * and warm campfire under-illumination matching the reference image!
 */
export function renderFirewoodGlassOrb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  isDocked: boolean,
  filaments: Array<{ angleOffset: number; speed: number; radiusRatio: number; phase: number }>,
  particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    alpha: number;
    baseRadius: number;
    angle: number;
    speed: number;
  }>
) {
  ctx.save();

  // 1. Broad outer atmospheric firelight glow around the glass orb
  const fireAura = ctx.createRadialGradient(cx, cy + radius * 0.4, radius * 0.4, cx, cy, radius * 2.1);
  fireAura.addColorStop(0, isDocked ? 'rgba(255, 175, 60, 0.42)' : 'rgba(246, 214, 159, 0.25)');
  fireAura.addColorStop(0.45, isDocked ? 'rgba(255, 100, 20, 0.18)' : 'rgba(180, 200, 255, 0.1)');
  fireAura.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = fireAura;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Translucent Glass Shell Clipping
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // 2a. Glass interior gradient (clear upper glass with refractive depth)
  const glassGrad = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.25, 0, cx, cy, radius);
  glassGrad.addColorStop(0, 'rgba(255, 252, 245, 0.45)');
  glassGrad.addColorStop(0.35, 'rgba(215, 230, 255, 0.16)');
  glassGrad.addColorStop(0.75, 'rgba(120, 160, 230, 0.12)');
  glassGrad.addColorStop(1, 'rgba(20, 25, 45, 0.55)');

  ctx.fillStyle = glassGrad;
  ctx.fill();

  // 2b. Campfire under-illumination: Flames illuminate lower hemisphere of orb
  const underFireGrad = ctx.createRadialGradient(
    cx,
    cy + radius * 0.85,
    0,
    cx,
    cy + radius * 0.2,
    radius * 1.15
  );
  underFireGrad.addColorStop(0, isDocked ? 'rgba(255, 255, 220, 0.95)' : 'rgba(255, 240, 180, 0.55)');
  underFireGrad.addColorStop(0.28, isDocked ? 'rgba(255, 170, 40, 0.78)' : 'rgba(255, 180, 60, 0.35)');
  underFireGrad.addColorStop(0.65, isDocked ? 'rgba(240, 80, 15, 0.45)' : 'rgba(240, 90, 20, 0.12)');
  underFireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = underFireGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2c. Intricate flowing golden-white energy lines (fairy-light filaments with luminous nodes)
  // Drawn using 3D spherical coordinates & organic wave deformations
  ctx.save();
  filaments.forEach((fil, idx) => {
    const filAngle = time * fil.speed * 50 + fil.angleOffset;
    const r = radius * (fil.radiusRatio * 0.95);

    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(255, 248, 225, 0.88)' : 'rgba(255, 215, 140, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const steps = 32;
    for (let step = 0; step < steps; step++) {
      const theta = filAngle + (step / steps) * Math.PI * 2;
      const wave = Math.sin(theta * 3.5 + fil.phase + time * 1.2) * (radius * 0.16);
      const fx = cx + Math.cos(theta) * (r + wave);
      const fy = cy + Math.sin(theta) * (r * 0.8 + wave * 0.7);

      if (step === 0) ctx.moveTo(fx, fy);
      else ctx.lineTo(fx, fy);

      // Fairy-light luminous nodes along the filaments
      if (step % 5 === 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // 2d. Internal sparkling stardust particles
  particles.slice(0, 90).forEach((p) => {
    p.angle += p.speed * 0.015;
    const currentR = p.baseRadius * (0.75 + Math.sin(time * 1.5 + p.angle) * 0.2);
    const px = cx + Math.cos(p.angle) * currentR;
    const py = cy + Math.sin(p.angle) * (currentR * 0.85);

    ctx.fillStyle = p.color;
    ctx.shadowColor = '#ffedd5';
    ctx.shadowBlur = 6;
    ctx.globalAlpha = p.alpha * 0.85;

    ctx.beginPath();
    ctx.arc(px, py, p.size * 0.85, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore(); // end clip

  // 3. Curved Glass Optics & Realistic Specular Rim Highlights
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);

  // Outer glass rim highlight
  const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius);
  rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  rimGrad.addColorStop(0.7, isDocked ? 'rgba(255, 190, 80, 0.45)' : 'rgba(255, 230, 180, 0.25)');
  rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0.75)');

  ctx.fillStyle = rimGrad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.4;
  ctx.shadowColor = isDocked ? 'rgba(255, 180, 50, 0.8)' : 'rgba(246, 214, 159, 0.6)';
  ctx.shadowBlur = 14;
  ctx.stroke();

  // Top-left curved specular glass glint
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.38, cy - radius * 0.38, radius * 0.32, radius * 0.16, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowBlur = 16;
  ctx.fill();

  // Lower rim firelight specular glint (reflects the campfire beneath)
  if (isDocked) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + radius * 0.82, radius * 0.38, radius * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 235, 170, 0.75)';
    ctx.shadowColor = '#ff6b00';
    ctx.shadowBlur = 18;
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}
