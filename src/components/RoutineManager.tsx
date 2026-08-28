import React, { useState } from 'react';
import { Play, Plus, Sparkles, Clock, Target, Dumbbell, Trash2, Edit3, ChevronRight, Flame } from 'lucide-react';
import { Routine } from '../types/workout';

interface RoutineManagerProps {
  routines: Routine[];
  onStartWorkout: (routine: Routine) => void;
  onOpenAIArchitect: () => void;
  onOpenCustomBuilder: (routineToEdit?: Routine) => void;
  onDeleteRoutine: (routineId: string) => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({
  routines,
  onStartWorkout,
  onOpenAIArchitect,
  onOpenCustomBuilder,
  onDeleteRoutine,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'push' | 'pull' | 'core' | 'legs' | 'full_body'>('all');

  const filteredRoutines = routines.filter((r) => {
    if (selectedFilter === 'all') return true;
    return r.category === selectedFilter;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Real-Time Computer Vision & Biomechanical Coaching</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Calisthenics Form Engine & Video Review
            </h1>
            <p className="text-sm text-slate-300 sm:text-base leading-relaxed">
              Select or build a routine. When you press <span className="font-semibold text-emerald-400">Start Workout</span>,
              the camera records your sets, overlays live 3D joint angle telemetry, provides instant voice coaching feedback, and compiles synchronized video playback with deep AI biomechanical critique.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <button
              id="hero-ai-routine-btn"
              onClick={onOpenAIArchitect}
              className="flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:opacity-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Routine Architect</span>
            </button>
            <button
              id="hero-custom-builder-btn"
              onClick={() => onOpenCustomBuilder()}
              className="flex items-center justify-center space-x-2 rounded-2xl border border-slate-700 bg-slate-800/80 px-5 py-3.5 text-xs font-semibold text-white transition-all hover:bg-slate-800 hover:border-slate-600"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Create Custom Routine</span>
            </button>
          </div>
        </div>

        {/* Ambient lighting effect */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All Programs' },
            { id: 'full_body', label: 'Full Body' },
            { id: 'push', label: 'Push & Chest' },
            { id: 'pull', label: 'Pull & Back' },
            { id: 'core', label: 'Core & Compression' },
            { id: 'legs', label: 'Legs & Mobility' },
          ].map((cat) => (
            <button
              key={cat.id}
              id={`filter-tab-${cat.id}`}
              onClick={() => setSelectedFilter(cat.id as any)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedFilter === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-slate-400">
          Showing {filteredRoutines.length} {filteredRoutines.length === 1 ? 'Routine' : 'Routines'}
        </span>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRoutines.map((routine) => (
          <div
            key={routine.id}
            id={`routine-card-${routine.id}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900"
          >
            {/* Top header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    routine.level === 'Beginner'
                      ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30'
                      : routine.level === 'Intermediate'
                      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                      : routine.level === 'Advanced'
                      ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                      : 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30'
                  }`}
                >
                  {routine.level}
                </span>

                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>~{routine.estimatedMinutes} mins</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {routine.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {routine.description}
                </p>
              </div>

              {/* Exercise Items Preview */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>EXERCISES ({routine.exercises.length})</span>
                  <span>TARGETS</span>
                </div>
                <div className="divide-y divide-slate-800/60 rounded-xl bg-slate-950/60 p-2 border border-slate-800/50">
                  {routine.exercises.slice(0, 4).map((ex, idx) => (
                    <div key={ex.id || idx} className="flex items-center justify-between py-1.5 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="font-medium text-slate-200 truncate max-w-[150px]">
                          {ex.name}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-400/90 font-semibold">
                        {ex.targetSets} × {ex.isHold ? `${ex.holdDurationSeconds}s` : `${ex.targetReps}`}
                      </span>
                    </div>
                  ))}
                  {routine.exercises.length > 4 && (
                    <p className="pt-1 text-center text-[10px] font-medium text-slate-500">
                      +{routine.exercises.length - 4} more exercises in circuit
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
              {!routine.isPreset ? (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onOpenCustomBuilder(routine)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    title="Edit Routine"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteRoutine(routine.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Delete Routine"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                  Preset Master Program
                </span>
              )}

              <button
                id={`start-workout-${routine.id}-btn`}
                onClick={() => onStartWorkout(routine)}
                className="flex items-center space-x-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/10 transition-all hover:bg-emerald-400 hover:scale-[1.03]"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Start Workout</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
