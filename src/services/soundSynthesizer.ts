/**
 * Web Audio API synthesizer for the 2040 Evening Transition Experience.
 * Synthesizes subtle ambient soundscapes, crystalline chimes, and calming tones.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private crackleTimeout: number | null = null;
  private crackleGain: GainNode | null = null;
  private isCrackling: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
      this.startAmbientDrone();
    } catch (e) {
      console.warn('AudioContext initialization failed or blocked:', e);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0 : 0.6;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    if (muted) {
      this.stopCampfireCrackle();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;

    // Very quiet, warm 432Hz harmonic room ambience
    const baseFreq = 108; // A2 / 432 harmonic
    const freqs = [baseFreq, baseFreq * 1.5, baseFreq * 2.01];

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    // Warm low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);
    this.ambientGain.connect(filter);
    filter.connect(this.masterGain);

    freqs.forEach((f) => {
      if (!this.ctx || !this.ambientGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      osc.connect(this.ambientGain);
      osc.start();
      this.ambientOscs.push(osc);
    });
  }

  // Soft crystalline chime on clap acknowledge
  public playClapAcknowledge() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C Major triad + octave

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.3);
    });
  }

  // Delicate ethereal rising tone during orb formation
  public playOrbFormation() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 1.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 1.8);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.3);
  }

  // Soft high-frequency glass chime when a work tab flows into the orb
  public playTabAbsorb(pitchOffset: number = 0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pentatonic scale notes
    const notes = [659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = notes[pitchOffset % notes.length];

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  // Delicate shimmering texture during tab dissolution
  public playDissolution() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [880, 1046.5, 1318.51, 1567.98];

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);

      gain.gain.setValueAtTime(0.001, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.15 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 1.5);
    });
  }

  // Subtle tonal tension for black threads
  public playBlackThreads() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(73.42, now); // D2

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.6);
  }

  // Harmonically pleasant warm golden chords
  public playGoldenThreads() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Warm F# major 9 / champagne chord: F#3, C#4, F4, G#4, C#5
    const chord = [185.0, 277.18, 349.23, 415.3, 554.37];

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 3.0);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 3.2);
    });
  }

  // Subtle confirmation chime when orb is grabbed
  public playGrabChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.2); // A5

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Soft tonal accent when orb is caught by other hand
  public playCatchChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [783.99, 1046.5]; // G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.03);

      gain.gain.setValueAtTime(0.08, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.03 + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.55);
    });
  }

  // Quiet, airy synthesized sound when orb bounces off a wall
  public playBounceSound(intensity: number = 1) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 * (0.8 + Math.random() * 0.4), now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    const amp = Math.min(0.09, 0.04 * intensity);
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Gentle ethereal sweep when return-to-dock swipe is detected
  public playSwipePulse() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Soft resolving singing bowl chime when docked
  public playDockSettled() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bowlTones = [261.63, 392.0, 523.25, 783.99]; // C4, G4, C5, G5

    bowlTones.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3.6);
    });

    // Start soothing campfire crackling
    this.startCampfireCrackle();
  }

  // Cozy procedural campfire crackle audio (gentle ember pops & warm ambient hum)
  public startCampfireCrackle() {
    if (!this.ctx || !this.masterGain || this.isMuted || this.isCrackling) return;
    this.isCrackling = true;

    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.setValueAtTime(0.045, this.ctx.currentTime);
    this.crackleGain.connect(this.masterGain);

    const triggerPop = () => {
      if (!this.ctx || !this.crackleGain || !this.isCrackling || this.isMuted) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 + Math.random() * 1800, now);
      filter.Q.setValueAtTime(3 + Math.random() * 4, now);

      osc.type = Math.random() > 0.5 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(240 + Math.random() * 280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.04);

      const amp = 0.025 + Math.random() * 0.04;
      popGain.gain.setValueAtTime(amp, now);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035 + Math.random() * 0.04);

      osc.connect(filter);
      filter.connect(popGain);
      popGain.connect(this.crackleGain);

      osc.start(now);
      osc.stop(now + 0.09);

      const nextDelay = 120 + Math.random() * 420;
      this.crackleTimeout = window.setTimeout(triggerPop, nextDelay);
    };

    triggerPop();
  }

  public stopCampfireCrackle() {
    this.isCrackling = false;
    if (this.crackleTimeout !== null) {
      clearTimeout(this.crackleTimeout);
      this.crackleTimeout = null;
    }
    if (this.crackleGain && this.ctx) {
      this.crackleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  // Spoken encouragement voice using Web Speech API
  public speakEncouragement(message: string, onEnd?: () => void) {
    if (this.isMuted || !('speechSynthesis' in window)) {
      if (onEnd) setTimeout(onEnd, 3000);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);

      // Select gentle, natural sounding voice
      const voices = window.speechSynthesis.getVoices();
      const gentleVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Serena') || v.name.includes('Google') || v.name.includes('Karen'))) ||
          v.lang.startsWith('en')
      );

      if (gentleVoice) {
        utterance.voice = gentleVoice;
      }

      utterance.pitch = 0.95; // slightly warm/lower pitch
      utterance.rate = 0.85;  // gentle, unhurried cadence
      utterance.volume = 0.85;

      let hasCompleted = false;
      const completeOnce = () => {
        if (hasCompleted) return;
        hasCompleted = true;
        if (onEnd) onEnd();
      };

      utterance.onend = completeOnce;
      utterance.onerror = completeOnce;

      // Safe timeout fallback: if speech synthesis is muted, blocked or fails to fire onend
      setTimeout(completeOnce, 5200);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      if (onEnd) setTimeout(onEnd, 3000);
    }
  }

  // Phase 1: Soft crystalline shimmer as golden particles drift from dock to floor
  public playFootstepAwaken() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.5]; // E5, G#5, B5, E6 (peaceful twilight chord)

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.5);
    });
  }

  // Phase 2: Very subtle harmonic tap as each footprint materializes
  public playFootstepStep(stepIndex: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Harmonic progression gently rising towards the door
    const baseFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];
    const freq = baseFreqs[stepIndex % baseFreqs.length] || 329.63;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  // Phase 3: Warm threshold resonance when footsteps reach the door
  public playDoorwayThreshold() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chord = [329.63, 493.88, 659.25, 987.77]; // E major calming spread

    chord.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3.0);
    });
  }
}

export const soundSynthesizer = new SoundSynthesizer();
