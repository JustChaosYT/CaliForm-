import React, { useState } from 'react';
import { Sparkles, X, Loader2, Dumbbell, Zap, Target } from 'lucide-react';
import { Routine, RoutineExercise } from '../types/workout';
import { CALISTHENICS_EXERCISES } from '../data/calisthenicsLibrary';

interface AIRoutineGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineGenerated: (routine: Routine) => void;
}

export const AIRoutineGeneratorModal: React.FC<AIRoutineGeneratorModalProps> = ({
  isOpen,
  onClose,
  onRoutineGenerated,
}) => {
  const [goal, setGoal] = useState('Upper Body Hypertrophy & Muscle-Up Progression');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'>('Intermediate');
  const [equipment, setEquipment] = useState('Pull-up bar, Dip station, Floor');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [focusArea, setFocusArea] = useState('Upper Body Push & Pull');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          level,
          equipment,
          durationMinutes,
          focusArea,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate AI routine');
      }

      const generated = data.routine;

      // Map AI exercises to our calibrated calisthenics library IDs
      const mappedExercises: RoutineExercise[] = (generated.exercises || []).map((ex: any, idx: number) => {
        const found = CALISTHENICS_EXERCISES.find(
          (c) => c.name.toLowerCase() === ex.name.toLowerCase() || ex.name.toLowerCase().includes(c.name.toLowerCase())
        ) || CALISTHENICS_EXERCISES[idx % CALISTHENICS_EXERCISES.length];

        return {
          id: `ai-ex-${Date.now()}-${idx}`,
          exerciseId: found.id,
          name: ex.name || found.name,
          category: (ex.category || found.category) as any,
          targetSets: ex.targetSets || found.defaultSets,
          targetReps: ex.targetReps || (found.isHold ? 1 : found.defaultReps),
          isHold: ex.isHold ?? found.isHold,
          holdDurationSeconds: ex.holdDurationSeconds ?? (found.isHold ? 30 : 0),
          restSeconds: ex.restSeconds || found.defaultRestSecs,
          customCues: ex.primaryCue || found.keyFormCues[0],
          voiceCueOverride: ex.voiceCue,
        };
      });

      const newRoutine: Routine = {
        id: `routine-ai-${Date.now()}`,
        title: generated.title || 'AI Calisthenics Routine',
        description: generated.description || `${goal} routine for ${level} level.`,
        category: 'full_body',
        level: level,
        estimatedMinutes: generated.estimatedMinutes || durationMinutes,
        warmupCues: generated.warmupCues || [
          'Wrist circles & light push-up rocks (60s)',
          'Dead hangs & shoulder shrugs (60s)',
        ],
        exercises: mappedExercises.length > 0 ? mappedExercises : [
          {
            id: 'ex-1',
            exerciseId: 'pushup-standard',
            name: 'Standard Push-Up',
            category: 'push',
            targetSets: 3,
            targetReps: 10,
            isHold: false,
            holdDurationSeconds: 0,
            restSeconds: 60,
          },
        ],
        createdAt: Date.now(),
      };

      onRoutineGenerated(newRoutine);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Something went wrong generating routine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Routine Architect</h2>
              <p className="text-xs text-slate-400">Generate targeted calisthenics programs powered by Gemini</p>
            </div>
          </div>
          <button
            id="close-ai-routine-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          {/* Goal */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Primary Fitness & Skill Goal
            </label>
            <input
              id="ai-goal-input"
              type="text"
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Muscle-up mastery, Handstand pushup, Chest hypertrophy"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Experience Level
              </label>
              <select
                id="ai-level-select"
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="Beginner">Beginner (Foundations)</option>
                <option value="Intermediate">Intermediate (Consistent)</option>
                <option value="Advanced">Advanced (High Volume)</option>
                <option value="Elite">Elite (Skills & Levers)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Duration (mins)
              </label>
              <input
                id="ai-duration-input"
                type="number"
                min="10"
                max="90"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Available Calisthenics Equipment
            </label>
            <input
              id="ai-equipment-input"
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="e.g. Pull-up bar, Dip station, Gymnastic rings, Floor only"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Quick Prompt Ideas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Muscle-up explosive strength',
                'Pistol squat & mobility legs',
                'Strict L-sit & compression core',
                'Calisthenics chest & dip blast',
                'Pure bodyweight zero-equipment',
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGoal(p)}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              id="submit-ai-generate-routine-btn"
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Designing Periodized Program...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Routine</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
