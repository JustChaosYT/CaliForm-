import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { RoutineManager } from './components/RoutineManager';
import { LiveWorkoutTracker } from './components/LiveWorkoutTracker';
import { PlaybackStudio } from './components/PlaybackStudio';
import { ExerciseLibraryModal } from './components/ExerciseLibraryModal';
import { WorkoutHistoryView } from './components/WorkoutHistoryView';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { AIRoutineGeneratorModal } from './components/AIRoutineGeneratorModal';
import { RoutineBuilderModal } from './components/RoutineBuilderModal';
import { SkillTreeMatrix } from './components/SkillTreeMatrix';
import { AICoachModal } from './components/AICoachModal';
import { StrengthStandardsModal } from './components/StrengthStandardsModal';
import { Routine, WorkoutSession } from './types/workout';
import {
  getSavedRoutines,
  saveCustomRoutine,
  deleteCustomRoutine,
  getAllWorkoutSessions,
  saveWorkoutSession,
  deleteWorkoutSession,
} from './utils/workoutStorage';
import { PRESET_ROUTINES } from './data/calisthenicsLibrary';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('routines');
  const [routines, setRoutines] = useState<Routine[]>(PRESET_ROUTINES);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);

  // Active workout & playback state
  const [activeWorkoutRoutine, setActiveWorkoutRoutine] = useState<Routine | null>(null);
  const [activePlaybackSession, setActivePlaybackSession] = useState<WorkoutSession | null>(null);

  // Modals
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isAICoachOpen, setIsAICoachOpen] = useState(false);
  const [isStrengthStandardsOpen, setIsStrengthStandardsOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  // Load routines and workout sessions from IndexedDB on start
  useEffect(() => {
    async function loadData() {
      const loadedRoutines = await getSavedRoutines();
      setRoutines(loadedRoutines);

      const loadedSessions = await getAllWorkoutSessions();
      setWorkoutSessions(loadedSessions);

      // If we have past sessions, default the playback studio to the most recent one
      if (loadedSessions.length > 0) {
        setActivePlaybackSession(loadedSessions[0]);
      }
    }
    loadData();
  }, []);

  // --- Handlers ---
  const handleStartWorkout = (routine: Routine) => {
    setActiveWorkoutRoutine(routine);
    setActiveTab('live');
  };

  const handleFinishWorkout = async (session: WorkoutSession) => {
    await saveWorkoutSession(session);
    setActivePlaybackSession(session);
    setWorkoutSessions((prev) => [session, ...prev]);
    setActiveWorkoutRoutine(null);
    setActiveTab('playback');
  };

  const handleCancelWorkout = () => {
    setActiveWorkoutRoutine(null);
    setActiveTab('routines');
  };

  const handleSaveRoutine = async (routine: Routine) => {
    await saveCustomRoutine(routine);
    const updated = await getSavedRoutines();
    setRoutines(updated);
    setRoutineToEdit(null);
  };

  const handleDeleteRoutine = async (routineId: string) => {
    await deleteCustomRoutine(routineId);
    const updated = await getSavedRoutines();
    setRoutines(updated);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteWorkoutSession(sessionId);
    setWorkoutSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activePlaybackSession?.id === sessionId) {
      const remaining = workoutSessions.filter((s) => s.id !== sessionId);
      setActivePlaybackSession(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleOpenBuilder = (toEdit?: Routine) => {
    setRoutineToEdit(toEdit || null);
    setIsBuilderModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      {/* Top Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWorkoutActive={!!activeWorkoutRoutine && activeTab === 'live'}
        hasRecordedSession={!!activePlaybackSession}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        onOpenAICoach={() => setIsAICoachOpen(true)}
        onOpenStrengthStandards={() => setIsStrengthStandardsOpen(true)}
        isCameraActive={!!activeWorkoutRoutine && activeTab === 'live'}
      />

      {/* Main Tab Views */}
      <main className="pb-12">
        {activeTab === 'routines' && (
          <RoutineManager
            routines={routines}
            onStartWorkout={handleStartWorkout}
            onOpenAIArchitect={() => setIsAIModalOpen(true)}
            onOpenCustomBuilder={handleOpenBuilder}
            onDeleteRoutine={handleDeleteRoutine}
          />
        )}

        {activeTab === 'skills' && (
          <SkillTreeMatrix
            onPracticeSkill={(exerciseId) => {
              // Build an instant 3-set practice routine for this skill
              const practiceRoutine: Routine = {
                id: `practice-${exerciseId}-${Date.now()}`,
                title: `Skill Mastery Drill`,
                description: `Live camera form calibration and telemetry drill`,
                category: 'skill',
                level: 'Intermediate',
                estimatedMinutes: 10,
                warmupCues: ['Wrist circles and rolls', 'Shoulder blade protraction/retraction', 'Core hollow hold'],
                createdAt: Date.now(),
                exercises: [
                  {
                    id: `ex-1-${Date.now()}`,
                    exerciseId,
                    name: 'Skill Mastery Practice',
                    category: 'skill',
                    targetSets: 3,
                    targetReps: 8,
                    isHold: false,
                    holdDurationSeconds: 20,
                    restSeconds: 45,
                  },
                ],
              };
              handleStartWorkout(practiceRoutine);
            }}
            onOpenAICoach={() => setIsAICoachOpen(true)}
            onOpenStrengthStandards={() => setIsStrengthStandardsOpen(true)}
          />
        )}

        {activeTab === 'live' && (
          activeWorkoutRoutine ? (
            <LiveWorkoutTracker
              routine={activeWorkoutRoutine}
              onFinishWorkout={handleFinishWorkout}
              onCancelWorkout={handleCancelWorkout}
            />
          ) : (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400">
                <span className="text-xl font-bold">⚡</span>
              </div>
              <h2 className="text-xl font-bold text-white">No Workout Currently In Progress</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select a routine from the catalog, explore the Skill Tree, or generate one with AI to launch the live video coach!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  id="live-tab-select-routine-btn"
                  onClick={() => setActiveTab('routines')}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                >
                  Choose a Routine
                </button>
                <button
                  onClick={() => setActiveTab('skills')}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-800"
                >
                  Explore Skill Tree
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'playback' && (
          <PlaybackStudio
            session={activePlaybackSession}
            onSaveToHistory={async (s) => {
              await saveWorkoutSession(s);
            }}
            onStartNewWorkout={() => setActiveTab('routines')}
          />
        )}

        {activeTab === 'library' && <ExerciseLibraryModal />}

        {activeTab === 'history' && (
          <WorkoutHistoryView
            sessions={workoutSessions}
            onSelectSession={(s) => {
              setActivePlaybackSession(s);
              setActiveTab('playback');
            }}
            onDeleteSession={handleDeleteSession}
            onStartNewWorkout={() => setActiveTab('routines')}
          />
        )}
      </main>

      {/* Global Modals */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />

      <AIRoutineGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onRoutineGenerated={async (newRoutine) => {
          await handleSaveRoutine(newRoutine);
          handleStartWorkout(newRoutine);
        }}
      />

      <RoutineBuilderModal
        isOpen={isBuilderModalOpen}
        onClose={() => {
          setIsBuilderModalOpen(false);
          setRoutineToEdit(null);
        }}
        onSaveRoutine={handleSaveRoutine}
        initialRoutine={routineToEdit}
      />

      <AICoachModal
        isOpen={isAICoachOpen}
        onClose={() => setIsAICoachOpen(false)}
        onLaunchRoadmapRoutine={(routine) => {
          handleSaveRoutine(routine);
          handleStartWorkout(routine);
        }}
      />

      <StrengthStandardsModal
        isOpen={isStrengthStandardsOpen}
        onClose={() => setIsStrengthStandardsOpen(false)}
      />
    </div>
  );
}
