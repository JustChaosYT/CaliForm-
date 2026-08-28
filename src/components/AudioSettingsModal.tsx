import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Play, Check, Sparkles } from 'lucide-react';
import { audioCoach } from '../utils/audioFeedback';
import { AudioFeedbackSettings } from '../types/workout';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioFeedbackSettings>(audioCoach.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(audioCoach.getSettings());
      setVoices(audioCoach.getAvailableVoices());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (updated: Partial<AudioFeedbackSettings>) => {
    const next = { ...settings, ...updated };
    setSettings(next);
    audioCoach.updateSettings(next);
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    audioCoach.playRepDing(1);
    audioCoach.speak('Rep 1 counted! Great depth. Lock elbows at the top for maximum tension.', {
      category: 'rep',
      priority: true,
    });
    setTimeout(() => setIsTestingVoice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Audio Coach Settings</h2>
              <p className="text-xs text-slate-400">Real-time voice cues & audio chime feedback</p>
            </div>
          </div>
          <button
            id="close-audio-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Master Voice Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-200">Live Voice Coaching</p>
              <p className="text-xs text-slate-400">Speaks form corrections, count & lockout cues</p>
            </div>
            <button
              id="toggle-voice-enabled-btn"
              onClick={() => handleUpdate({ voiceEnabled: !settings.voiceEnabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.voiceEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3.5 border border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-200">Synthesizer Sound Effects</p>
              <p className="text-xs text-slate-400">Rep chime dings, countdown beeps & warnings</p>
            </div>
            <button
              id="toggle-soundfx-btn"
              onClick={() => handleUpdate({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.soundEffectsEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEffectsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Coaching Frequency */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Coaching Feedback Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'high', label: 'High (All Cues)', desc: 'Depth + Form + Reps' },
                { id: 'normal', label: 'Balanced', desc: 'Faults + Reps' },
                { id: 'minimal', label: 'Minimal', desc: 'Rep Counts Only' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  id={`feedback-freq-${lvl.id}`}
                  onClick={() => handleUpdate({ feedbackFrequency: lvl.id as any })}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    settings.feedbackFrequency === lvl.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold">{lvl.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{lvl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector (if available) */}
          {voices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                AI Voice Persona
              </label>
              <select
                id="voice-select-dropdown"
                value={settings.selectedVoiceName || ''}
                onChange={(e) => handleUpdate({ selectedVoiceName: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Default Enhanced System Voice</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Speech Rate Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Speech Coaching Tempo</span>
              <span className="text-emerald-400 font-mono">{settings.speechRate}x</span>
            </div>
            <input
              id="speech-rate-slider"
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => handleUpdate({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Test Audio Button */}
          <div className="pt-2">
            <button
              id="test-audio-coach-btn"
              onClick={handleTestVoice}
              disabled={isTestingVoice}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
              <span>{isTestingVoice ? 'Playing Sample Voice Cue...' : 'Test Audio Coach Voice'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            id="done-audio-settings-btn"
            onClick={onClose}
            className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400"
          >
            <Check className="h-4 w-4" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
