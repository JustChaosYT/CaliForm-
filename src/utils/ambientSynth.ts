// Web Audio API Synthesizer for high-energy rhythmic workout pulses & lo-fi cadence

export type SynthRhythmPattern = 'electronic_pulse' | 'deep_kick' | 'lofi_chill' | 'hiit_drive';

class WorkoutSynthEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: any = null;
  private bpm = 124;
  private pattern: SynthRhythmPattern = 'electronic_pulse';
  private step = 0;
  private volume = 0.4;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(60, Math.min(180, newBpm));
    if (this.isPlaying) {
      this.stop();
      this.play(this.pattern, this.bpm);
    }
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public play(pattern: SynthRhythmPattern = 'electronic_pulse', bpm: number = 124) {
    this.stop();
    this.pattern = pattern;
    this.bpm = bpm;
    this.isPlaying = true;
    this.step = 0;

    const intervalMs = (60 / this.bpm / 2) * 1000; // 8th notes

    this.timerId = setInterval(() => {
      this.triggerStep();
      this.step = (this.step + 1) % 8;
    }, intervalMs);
  }

  public stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private triggerStep() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Kick Drum on beats 0 & 4 (quarter note downbeats)
      if (this.step === 0 || this.step === 4) {
        this.playKick(ctx, now);
      }

      // Snare / Clap on beat 4
      if (this.step === 4 && this.pattern !== 'lofi_chill') {
        this.playSnare(ctx, now);
      }

      // Hi-Hats on offbeats (2, 6) or 16th notes
      if (this.step % 2 === 1 || this.pattern === 'hiit_drive') {
        this.playHiHat(ctx, now, this.step % 2 === 1);
      }

      // Bassline note
      if (this.step === 0 || this.step === 3 || this.step === 6) {
        const bassFreq = this.step === 0 ? 55 : this.step === 3 ? 65.41 : 73.42; // A1, C2, D2
        this.playBassSynth(ctx, now, bassFreq);
      }
    } catch (e) {
      console.warn('Synth playback frame error:', e);
    }
  }

  private playKick(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    gain.gain.setValueAtTime(0.7 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playSnare(ctx: AudioContext, time: number) {
    // Noise buffer snare
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
  }

  private playHiHat(ctx: AudioContext, time: number, isAccent: boolean) {
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime((isAccent ? 0.22 : 0.1) * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(time);
  }

  private playBassSynth(ctx: AudioContext, time: number, freq: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.2);

    gain.gain.setValueAtTime(0.35 * this.volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.2);
  }
}

export const workoutSynth = new WorkoutSynthEngine();
