import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, ChevronRight, Activity, X, Loader2, ShieldAlert } from 'lucide-react';
import { ExerciseDefinition, ExerciseCategory } from '../types/workout';
import { CALISTHENICS_EXERCISES } from '../data/calisthenicsLibrary';

export const ExerciseLibraryModal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);

  // AI Technique Drill Coach
  const [aiTips, setAiTips] = useState<any | null>(null);
  const [isLoadingAiTips, setIsLoadingAiTips] = useState(false);

  const filtered = CALISTHENICS_EXERCISES.filter((ex) => {
    const matchesCat = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroups.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleFetchAiTips = async (ex: ExerciseDefinition) => {
    setSelectedExercise(ex);
    setIsLoadingAiTips(true);
    setAiTips(null);

    try {
      const res = await fetch('/api/ai/exercise-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseName: ex.name }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiTips(data.tips);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAiTips(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            Calisthenics Movement Library
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Biomechanical standards, joint angle criteria, and auditory coaching cues
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="exercise-library-search-input"
            type="text"
            placeholder="Search exercises or muscles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Movements' },
          { id: 'push', label: 'Push (Chest/Triceps/Delts)' },
          { id: 'pull', label: 'Pull (Lats/Biceps/Back)' },
          { id: 'core', label: 'Core & Compression' },
          { id: 'legs', label: 'Legs & Mobility' },
          { id: 'skill', label: 'Skills & Levers' },
        ].map((cat) => (
          <button
            key={cat.id}
            id={`lib-cat-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Exercise Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            id={`ex-lib-card-${ex.id}`}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl transition-all duration-200 hover:border-emerald-500/40 hover:bg-slate-900"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {ex.category}
                </span>
                <span className="text-xs font-medium text-slate-400">{ex.difficulty}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{ex.name}</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {ex.description}
                </p>
              </div>

              {/* Muscle Group Badges */}
              <div className="flex flex-wrap gap-1">
                {ex.muscleGroups.map((m, i) => (
                  <span
                    key={i}
                    className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-800"
                  >
                    {m}
                  </span>
                ))}
              </div>

              {/* Biomechanical Target Angles */}
              <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/60 space-y-1.5 text-xs">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Angle Criteria
                </span>
                <div className="flex justify-between text-slate-300">
                  <span>Depth Threshold:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    &le; {ex.angleTargets.bottomDepthAngle || 90}&deg;
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Lockout Angle:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    &ge; {ex.angleTargets.topLockoutAngle || 165}&deg;
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleFetchAiTips(ex)}
                className="flex w-full items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-semibold text-emerald-300 hover:bg-slate-800 hover:border-emerald-500/40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Technique Breakdown</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Technique Coach Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{selectedExercise.name}</h2>
                  <p className="text-xs text-slate-400">Deep Technique Mastery & Audio Coaching Cues</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoadingAiTips ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-400" />
                  <p className="text-xs text-slate-400">Consulting Gemini Calisthenics Biomechanics Coach...</p>
                </div>
              ) : aiTips ? (
                <div className="space-y-4 text-xs text-slate-200">
                  {/* Setup */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
                    <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] mb-2">
                      Optimal Setup & Grip
                    </h4>
                    <ul className="space-y-1 text-slate-300">
                      {aiTips.setupCues.map((c: string, i: number) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Execution Phases */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                      Phase-By-Phase Execution
                    </h4>
                    <p><strong>Eccentric (Lowering):</strong> {aiTips.executionPhases.eccentric}</p>
                    <p><strong>Inflection (Depth):</strong> {aiTips.executionPhases.inflectionPoint}</p>
                    <p><strong>Concentric (Push/Pull):</strong> {aiTips.executionPhases.concentric}</p>
                    <p><strong>Lockout (Top):</strong> {aiTips.executionPhases.lockout}</p>
                  </div>

                  {/* Common Faults */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
                    <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-2">
                      Common Faults to Avoid
                    </h4>
                    <ul className="space-y-1 text-slate-300">
                      {aiTips.commonFaults.map((f: string, i: number) => (
                        <li key={i}>⚠️ {f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Voice Cues */}
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
                    <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] mb-2">
                      Live Voice Coaching Cues
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiTips.instantVoiceCues.map((v: string, i: number) => (
                        <span key={i} className="rounded-lg bg-teal-500/10 px-2.5 py-1 text-[11px] text-teal-300 border border-teal-500/20">
                          "{v}"
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Unable to load AI technique breakdown.</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedExercise(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
