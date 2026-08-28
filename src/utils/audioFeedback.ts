import { AudioFeedbackSettings } from '../types/workout';

class AudioCoachEngine {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audioCtx: AudioContext | null = null;
  private lastSpokenTime: Record<string, number> = {};
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: AudioFeedbackSettings = {
    voiceEnabled: true,
    soundEffectsEnabled: true,
    speechRate: 1.05,
    speechPitch: 1.0,
    volume: 0.9,
    feedbackFrequency: 'normal',
  };

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  public updateSettings(newSettings: Partial<AudioFeedbackSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): AudioFeedbackSettings {
    return { ...this.settings };
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // --- Voice Feedback ---
  public speak(
    text: string,
    options: {
      category?: 'rep' | 'fault' | 'cue' | 'info' | 'countdown';
      cooldownSecs?: number;
      priority?: boolean;
    } = {}
  ) {
    if (!this.settings.voiceEnabled || !this.synth) return;

    const { category = 'cue', cooldownSecs = 3.0, priority = false } = options;

    // Feedback frequency filters
    if (this.settings.feedbackFrequency === 'minimal' && category !== 'rep' && category !== 'info') {
      return;
    }

    const now = Date.now();
    const lastSpoken = this.lastSpokenTime[text] || 0;
    if (!priority && now - lastSpoken < cooldownSecs * 1000) {
      return;
    }
    this.lastSpokenTime[text] = now;

    if (priority) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.speechRate;
    utterance.pitch = this.settings.speechPitch;
    utterance.volume = this.settings.volume;

    // Pick best natural voice
    if (this.settings.selectedVoiceName) {
      const selected = this.voices.find(v => v.name === this.settings.selectedVoiceName);
      if (selected) utterance.voice = selected;
    } else {
      const preferred = this.voices.find(
        v =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Victoria'))
      );
      if (preferred) utterance.voice = preferred;
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  // --- Synthesized Sound Effects via Web Audio ---
  public playRepDing(repNumber: number) {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch rises slightly with rep count up to 10
      const baseFreq = 523.25; // C5
      const freqMultiplier = Math.min(1.4, 1 + (repNumber % 10) * 0.035);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * freqMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * freqMultiplier * 1.5, now + 0.12);

      gain.gain.setValueAtTime(0.3 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio playRepDing error:', e);
    }
  }

  public playWarningTone() {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(196, now + 0.1); // G3

      gain.gain.setValueAtTime(0.25 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio playWarningTone error:', e);
    }
  }

  public playCountdownBeep(isFinal: boolean = false) {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const freq = isFinal ? 880 : 440; // A5 vs A4
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.35 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.4 : 0.18));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + (isFinal ? 0.4 : 0.18));
    } catch (e) {
      console.warn('Audio playCountdownBeep error:', e);
    }
  }

  public playSetCompleteFanfare() {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.28 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('Audio playSetCompleteFanfare error:', e);
    }
  }

  // Metronome Click for Tempo Cadence
  public playMetronomeTick(isAccent: boolean = false) {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);
      osc.frequency.exponentialRampToValueAtTime(isAccent ? 600 : 400, now + 0.04);

      gain.gain.setValueAtTime((isAccent ? 0.25 : 0.15) * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('Audio playMetronomeTick error:', e);
    }
  }

  // Milestone Rep Streak Chime
  public playStreakChime() {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.22 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (e) {
      console.warn('Audio playStreakChime error:', e);
    }
  }

  // Relaxation Gong for Rest Period Breathing
  public playRelaxationGong() {
    if (!this.settings.soundEffectsEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(261.63, now); // C4 warm resonance
      osc.frequency.exponentialRampToValueAtTime(220, now + 1.2);

      gain.gain.setValueAtTime(0.2 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio playRelaxationGong error:', e);
    }
  }
}

export const audioCoach = new AudioCoachEngine();
