import React, { useState } from 'react';
import {
  History,
  Play,
  Trash2,
  Calendar,
  Clock,
  Award,
  Activity,
  Sparkles,
  ChevronRight,
  Download,
  Flame,
  Filter,
  BarChart2,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { WorkoutSession } from '../types/workout';

interface WorkoutHistoryViewProps {
  sessions: WorkoutSession[];
  onSelectSession: (session: WorkoutSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartNewWorkout: () => void;
}

export const WorkoutHistoryView: React.FC<WorkoutHistoryViewProps> = ({
  sessions,
  onSelectSession,
  onDeleteSession,
  onStartNewWorkout,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Aggregate stats
  const totalWorkouts = sessions.length;
  const totalRepsLogged = sessions.reduce((acc, s) => acc + (s.totalReps || 0), 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);
  const avgFormScore =
    totalWorkouts > 0
      ? Math.round(sessions.reduce((acc, s) => acc + (s.averageFormScore || 0), 0) / totalWorkouts)
      : 0;

  // Muscle Volume Counts
  let chestVolume = 0;
  let backVolume = 0;
  let shoulderVolume = 0;
  let armVolume = 0;
  let coreVolume = 0;
  let legVolume = 0;

  sessions.forEach((s) => {
    s.exerciseLogs.forEach((ex) => {
      const reps = ex.repsCompleted || (ex.holdDurationSeconds ? Math.round(ex.holdDurationSeconds / 3) : 0);
      const name = ex.exerciseName.toLowerCase();
      if (name.includes('pushup') || name.includes('dip')) {
        chestVolume += reps;
        shoulderVolume += Math.round(reps * 0.7);
        armVolume += Math.round(reps * 0.8);
      } else if (name.includes('pull') || name.includes('row') || name.includes('chin')) {
        backVolume += reps;
        armVolume += Math.round(reps * 0.8);
      } else if (name.includes('pike') || name.includes('handstand')) {
        shoulderVolume += reps;
        armVolume += Math.round(reps * 0.7);
      } else if (name.includes('plank') || name.includes('leg raise') || name.includes('l-sit')) {
        coreVolume += reps;
      } else if (name.includes('squat')) {
        legVolume += reps;
      }
    });
  });

  const maxMuscleVol = Math.max(1, chestVolume, backVolume, shoulderVolume, armVolume, coreVolume, legVolume);

  // Muscle activation level helper (0.1 to 1.0 opacity)
  const getMuscleOpacity = (vol: number) => {
    if (vol === 0) return 0.2;
    return Math.min(1.0, 0.35 + (vol / maxMuscleVol) * 0.65);
  };

  // Export handlers
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `caliform_workout_archive_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csv = 'Session ID,Date,Routine Title,Duration (s),Total Reps,Avg Form Score,Exercises\n';
    sessions.forEach((s) => {
      const exercises = s.exerciseLogs.map((e) => `${e.exerciseName} (${e.setsCompleted} sets)`).join('; ');
      csv += `"${s.id}","${new Date(s.startTime).toISOString()}","${s.routineTitle}",${s.durationSeconds},${s.totalReps},${s.averageFormScore},"${exercises}"\n`;
    });
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `caliform_workouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.routineTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.exerciseLogs.some((e) => e.exerciseName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            Recorded Workout & Analytics Archive
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track historical volume, anatomical muscle activation, and synchronized telemetry recordings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sessions.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                title="Export as CSV spreadsheet"
                className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                title="Export full JSON archive"
                className="flex items-center space-x-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>JSON</span>
              </button>
            </>
          )}

          <button
            onClick={onStartNewWorkout}
            className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
          >
            <Play className="h-3.5 w-3.5 fill-slate-950" />
            <span>New Workout</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Workouts</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-black text-white">{totalWorkouts}</span>
            <span className="text-xs text-emerald-400 font-semibold">Sessions</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Reps Logged</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-black text-emerald-400">{totalRepsLogged}</span>
            <span className="text-xs text-slate-400">Strict Reps</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-slate-400">Training Time</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-black text-white">{totalMinutes}</span>
            <span className="text-xs text-slate-400">Minutes</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-slate-400">Average Form Score</span>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="font-mono text-2xl font-black text-emerald-400">{avgFormScore}%</span>
            <span className="text-xs text-slate-400">Biomechanical Avg</span>
          </div>
        </div>
      </div>

      {/* Anatomical Muscle Activation Heatmap Section */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Flame className="h-4 w-4 text-emerald-400" />
              <span>Anatomical Muscle Activation Heatmap</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visual body map reflecting cumulative volume and muscle stimulus across logged sessions
            </p>
          </div>

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
            Full Body Tracking
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          {/* Anatomical Body Silhouette Vector */}
          <div className="lg:col-span-4 flex justify-center py-2">
            <svg
              className="h-64 w-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              viewBox="0 0 200 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head */}
              <circle cx="100" cy="30" r="16" fill="#334155" />
              {/* Neck */}
              <rect x="94" y="46" width="12" height="10" rx="3" fill="#334155" />

              {/* Chest (Pectorals) */}
              <path
                d="M72 62 C82 58, 95 62, 98 75 L98 88 C85 88, 70 82, 68 70 Z"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(chestVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <path
                d="M128 62 C118 58, 105 62, 102 75 L102 88 C115 88, 130 82, 132 70 Z"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(chestVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />

              {/* Shoulders (Deltoids) */}
              <ellipse
                cx="58"
                cy="68"
                rx="10"
                ry="14"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(shoulderVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <ellipse
                cx="142"
                cy="68"
                rx="10"
                ry="14"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(shoulderVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />

              {/* Arms (Biceps & Triceps) */}
              <rect
                x="46"
                y="84"
                width="12"
                height="35"
                rx="6"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(armVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <rect
                x="142"
                y="84"
                width="12"
                height="35"
                rx="6"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(armVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <rect
                x="42"
                y="124"
                width="10"
                height="35"
                rx="5"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(armVolume)}
                stroke="#10B981"
                strokeWidth="1"
              />
              <rect
                x="148"
                y="124"
                width="10"
                height="35"
                rx="5"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(armVolume)}
                stroke="#10B981"
                strokeWidth="1"
              />

              {/* Core / Abs (Rectus Abdominis) */}
              <g fill="#10B981" fillOpacity={getMuscleOpacity(coreVolume)} stroke="#10B981" strokeWidth="1.2">
                <rect x="86" y="94" width="12" height="11" rx="2" />
                <rect x="102" y="94" width="12" height="11" rx="2" />
                <rect x="86" y="108" width="12" height="11" rx="2" />
                <rect x="102" y="108" width="12" height="11" rx="2" />
                <rect x="87" y="122" width="11" height="11" rx="2" />
                <rect x="102" y="122" width="11" height="11" rx="2" />
              </g>

              {/* Lats (Upper/Mid Back wings) */}
              <path
                d="M66 88 C68 115, 75 125, 82 135 L80 95 Z"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(backVolume)}
                stroke="#10B981"
                strokeWidth="1.2"
              />
              <path
                d="M134 88 C132 115, 125 125, 118 135 L120 95 Z"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(backVolume)}
                stroke="#10B981"
                strokeWidth="1.2"
              />

              {/* Pelvis / Hips */}
              <path d="M80 138 L120 138 L114 165 L86 165 Z" fill="#334155" />

              {/* Quads / Legs */}
              <rect
                x="76"
                y="170"
                width="19"
                height="55"
                rx="8"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(legVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />
              <rect
                x="105"
                y="170"
                width="19"
                height="55"
                rx="8"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(legVolume)}
                stroke="#10B981"
                strokeWidth="1.5"
              />

              {/* Calves */}
              <rect
                x="78"
                y="235"
                width="15"
                height="50"
                rx="7"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(legVolume)}
                stroke="#10B981"
                strokeWidth="1.2"
              />
              <rect
                x="107"
                y="235"
                width="15"
                height="50"
                rx="7"
                fill="#10B981"
                fillOpacity={getMuscleOpacity(legVolume)}
                stroke="#10B981"
                strokeWidth="1.2"
              />
            </svg>
          </div>

          {/* Muscle Breakdown Bars */}
          <div className="lg:col-span-8 space-y-3">
            {[
              { name: 'Chest (Pectorals)', volume: chestVolume, color: 'from-emerald-500 to-teal-400' },
              { name: 'Back & Lats', volume: backVolume, color: 'from-teal-500 to-cyan-400' },
              { name: 'Shoulders (Deltoids)', volume: shoulderVolume, color: 'from-emerald-500 to-emerald-400' },
              { name: 'Arms (Triceps & Biceps)', volume: armVolume, color: 'from-teal-400 to-emerald-500' },
              { name: 'Core & Abdominals', volume: coreVolume, color: 'from-emerald-400 to-teal-300' },
              { name: 'Legs & Quads', volume: legVolume, color: 'from-emerald-600 to-teal-500' },
            ].map((muscle) => (
              <div key={muscle.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-300">{muscle.name}</span>
                  <span className="font-mono font-bold text-emerald-400">{muscle.volume} reps</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${muscle.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.round((muscle.volume / maxMuscleVol) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <input
          type="text"
          placeholder="Search by routine or exercise name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredSessions.length} recorded session{filteredSessions.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-3">
            <History className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Matching Recorded Workouts</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Choose a routine and hit Start Workout. Your recorded videos with form telemetry and Gemini feedback will be archived here.
          </p>
          <button
            onClick={onStartNewWorkout}
            className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Explore Routines
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              id={`history-card-${session.id}`}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl transition-all hover:border-emerald-500/40 hover:bg-slate-900"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      {new Date(session.startTime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>

                  {session.aiAnalysis?.overallGrade && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      Grade: {session.aiAnalysis.overallGrade}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{session.routineTitle}</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {session.exerciseLogs.map((l) => l.exerciseName).join(', ')}
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Duration</span>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {session.durationFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Total Reps</span>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {session.totalReps}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Form Avg</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {session.averageFormScore}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                  title="Delete Recording"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button
                  id={`open-review-${session.id}-btn`}
                  onClick={() => onSelectSession(session)}
                  className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400"
                >
                  <Play className="h-3.5 w-3.5 fill-slate-950" />
                  <span>Playback & Review</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
