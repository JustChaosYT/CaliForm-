import React, { useState } from 'react';
import { X, Plus, Trash2, Dumbbell, Clock, MoveUp, MoveDown, Check } from 'lucide-react';
import { Routine, RoutineExercise, ExerciseDifficulty } from '../types/workout';
import { CALISTHENICS_EXERCISES } from '../data/calisthenicsLibrary';

interface RoutineBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoutine: (routine: Routine) => void;
  initialRoutine?: Routine | null;
}

export const RoutineBuilderModal: React.FC<RoutineBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveRoutine,
  initialRoutine,
}) => {
  const [title, setTitle] = useState(initialRoutine?.title || 'Custom Calisthenics Routine');
  const [description, setDescription] = useState(
    initialRoutine?.description || 'Custom handcrafted workout with real-time AI form analysis.'
  );
  const [level, setLevel] = useState<ExerciseDifficulty>(initialRoutine?.level || 'Intermediate');
  const [exercises, setExercises] = useState<RoutineExercise[]>(
    initialRoutine?.exercises || [
      {
        id: `ex-${Date.now()}-1`,
        exerciseId: 'pushup-standard',
        name: 'Standard Push-Up',
        category: 'push',
        targetSets: 3,
        targetReps: 10,
        isHold: false,
        holdDurationSeconds: 0,
        restSeconds: 60,
        customCues: 'Break 90 deg at elbows, hollow core',
      },
      {
        id: `ex-${Date.now()}-2`,
        exerciseId: 'australian-rows',
        name: 'Australian Inverted Rows',
        category: 'pull',
        targetSets: 3,
        targetReps: 10,
        isHold: false,
        holdDurationSeconds: 0,
        restSeconds: 60,
        customCues: 'Touch chest to bar, squeeze shoulder blades',
      },
    ]
  );
  const [selectedAddExerciseId, setSelectedAddExerciseId] = useState(CALISTHENICS_EXERCISES[0].id);

  if (!isOpen) return null;

  const handleAddExercise = () => {
    const found = CALISTHENICS_EXERCISES.find((e) => e.id === selectedAddExerciseId);
    if (!found) return;

    const newEx: RoutineExercise = {
      id: `ex-${Date.now()}-${exercises.length + 1}`,
      exerciseId: found.id,
      name: found.name,
      category: found.category,
      targetSets: found.defaultSets,
      targetReps: found.isHold ? 1 : found.defaultReps,
      isHold: found.isHold,
      holdDurationSeconds: found.isHold ? found.defaultHoldDurationSecs : 0,
      restSeconds: found.defaultRestSecs,
      customCues: found.keyFormCues[0],
    };

    setExercises([...exercises, newEx]);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= exercises.length) return;
    const copy = [...exercises];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setExercises(copy);
  };

  const handleUpdateExercise = (index: number, field: keyof RoutineExercise, value: any) => {
    const copy = [...exercises];
    copy[index] = { ...copy[index], [field]: value };
    setExercises(copy);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (exercises.length === 0) return;

    const totalSeconds = exercises.reduce((acc, ex) => {
      const workTime = ex.isHold ? ex.holdDurationSeconds : ex.targetReps * 3.5;
      return acc + ex.targetSets * (workTime + ex.restSeconds);
    }, 0);

    const routine: Routine = {
      id: initialRoutine?.id || `custom-routine-${Date.now()}`,
      title,
      description,
      category: 'full_body',
      level,
      estimatedMinutes: Math.max(10, Math.round(totalSeconds / 60)),
      warmupCues: [
        'Joint rotations (wrists, shoulders, hips) - 60s',
        'Scapular push-ups & active hangs - 60s',
      ],
      exercises,
      createdAt: initialRoutine?.createdAt || Date.now(),
      isPreset: false,
    };

    onSaveRoutine(routine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {initialRoutine ? 'Edit Routine' : 'Build Custom Routine'}
              </h2>
              <p className="text-xs text-slate-400">Configure exercises, sets, reps, and form thresholds</p>
            </div>
          </div>
          <button
            id="close-routine-builder-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Title & Level */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Routine Title</label>
                <input
                  id="builder-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty Level</label>
                <select
                  id="builder-level-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Routine Description</label>
              <input
                id="builder-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Add Exercise Selector Bar */}
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-3">
              <label className="block text-xs font-medium text-slate-300 mb-2">Add Movement from Library</label>
              <div className="flex gap-2">
                <select
                  id="builder-add-ex-select"
                  value={selectedAddExerciseId}
                  onChange={(e) => setSelectedAddExerciseId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  {CALISTHENICS_EXERCISES.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.category.toUpperCase()} • {ex.difficulty})
                    </option>
                  ))}
                </select>
                <button
                  id="builder-add-ex-btn"
                  type="button"
                  onClick={handleAddExercise}
                  className="flex items-center space-x-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Exercise List */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Workout Sequence ({exercises.length} Exercises)
              </label>

              {exercises.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-6 text-center text-xs text-slate-500">
                  No exercises added. Add movements from the selector above.
                </div>
              ) : (
                exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 uppercase">
                          {ex.category}
                        </span>
                      </div>

                      {/* Move / Delete buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(idx, 'up')}
                          disabled={idx === 0}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                        >
                          <MoveUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(idx, 'down')}
                          disabled={idx === exercises.length - 1}
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                        >
                          <MoveDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(idx)}
                          className="rounded p-1 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Numeric parameters: Sets, Target Reps/Hold, Rest */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[10px] text-slate-400">Sets</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={ex.targetSets}
                          onChange={(e) => handleUpdateExercise(idx, 'targetSets', parseInt(e.target.value) || 1)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">
                          {ex.isHold ? 'Hold Secs' : 'Reps / Set'}
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={ex.isHold ? ex.holdDurationSeconds : ex.targetReps}
                          onChange={(e) =>
                            handleUpdateExercise(
                              idx,
                              ex.isHold ? 'holdDurationSeconds' : 'targetReps',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400">Rest (Secs)</span>
                        <input
                          type="number"
                          min="15"
                          max="300"
                          step="15"
                          value={ex.restSeconds}
                          onChange={(e) => handleUpdateExercise(idx, 'restSeconds', parseInt(e.target.value) || 30)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-800 p-4 bg-slate-950">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>
                Estimated Duration:{' '}
                <strong className="text-slate-200">
                  {Math.round(
                    exercises.reduce((acc, ex) => {
                      const work = ex.isHold ? ex.holdDurationSeconds : ex.targetReps * 3.5;
                      return acc + ex.targetSets * (work + ex.restSeconds);
                    }, 0) / 60
                  )}{' '}
                  mins
                </strong>
              </span>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
              <button
                id="save-routine-builder-btn"
                type="submit"
                disabled={exercises.length === 0}
                className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                <span>Save Routine</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
