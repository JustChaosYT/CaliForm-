import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Award,
  CheckCircle,
  AlertTriangle,
  Clock,
  Dumbbell,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Flame,
  Volume2,
} from 'lucide-react';
import { WorkoutSession, RepDetail, FormViolationEvent, AIAnalysisResult } from '../types/workout';

interface PlaybackStudioProps {
  session: WorkoutSession | null;
  onSaveToHistory?: (session: WorkoutSession) => void;
  onStartNewWorkout?: () => void;
}

export const PlaybackStudio: React.FC<PlaybackStudioProps> = ({
  session,
  onSaveToHistory,
  onStartNewWorkout,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session?.durationSeconds || 30);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [selectedRep, setSelectedRep] = useState<RepDetail | null>(null);

  // AI Biomechanical Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(session?.aiAnalysis || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (session && !aiAnalysis && !isAnalyzing) {
      handleRequestAIAnalysis();
    }
  }, [session]);

  const handleRequestAIAnalysis = async () => {
    if (!session) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/ai/analyze-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutSummary: {
            title: session.routineTitle,
            durationFormatted: session.durationFormatted,
            totalReps: session.totalReps,
            averageFormScore: session.averageFormScore,
          },
          exerciseStats: session.exerciseLogs.map((l) => ({
            name: l.exerciseName,
            sets: l.completedSets,
            reps: l.totalRepsCompleted,
            holdTime: l.totalHoldTimeSeconds,
            avgScore: l.avgScore,
          })),
          repBreakdown: session.exerciseLogs.flatMap((l) =>
            l.reps.map((r) => ({
              exercise: l.exerciseName,
              rep: r.repNumber,
              score: r.formScore,
              depthAngle: r.maxDepthAngle,
              duration: r.durationSeconds,
              faults: r.faultsDetected,
            }))
          ),
          formViolations: session.formViolations,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to run Gemini analysis');
      }

      setAiAnalysis(data.analysis);
      session.aiAnalysis = data.analysis;
      if (onSaveToHistory) {
        onSaveToHistory(session);
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Unable to retrieve AI analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-4">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Recorded Workout Active</h2>
        <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto">
          Start a routine from the Routines tab. When you complete your workout, your recorded video and synchronized biomechanical telemetry review will appear here!
        </p>
        {onStartNewWorkout && (
          <button
            onClick={onStartNewWorkout}
            className="mt-6 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Go to Routine Library
          </button>
        )}
      </div>
    );
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || session.durationSeconds);
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (timeSecs: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSecs;
      setCurrentTime(timeSecs);
    }
  };

  const handleSetSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownloadVideo = () => {
    if (!session.recordedVideoBlob) return;
    const a = document.createElement('a');
    a.href = session.recordedVideoBlobUrl || URL.createObjectURL(session.recordedVideoBlob);
    a.download = `calisthenics-workout-${new Date(session.startTime).toISOString().slice(0, 10)}.webm`;
    a.click();
  };

  const handleDownloadReportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `calisthenics-telemetry-${new Date(session.startTime).toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Find nearest telemetry sample to currentTime
  const currentSample = session.telemetryData.reduce((prev, curr) => {
    return Math.abs(curr.timestamp - currentTime) < Math.abs(prev.timestamp - currentTime) ? curr : prev;
  }, session.telemetryData[0] || { elbowAngleLeft: 180, hipAngle: 180, kneeAngle: 180, formQualityScore: 95 });

  const allReps = session.exerciseLogs.flatMap((l) =>
    l.reps.map((r) => ({ ...r, exerciseName: l.exerciseName }))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
      {/* Session Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/30 uppercase">
              POST-WORKOUT DEBRIEF
            </span>
            <span className="text-xs text-slate-400">
              {new Date(session.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            {session.routineTitle}
          </h1>
        </div>

        {/* Global Summary Stats */}
        <div className="flex items-center space-x-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-center">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Duration</span>
            <span className="font-mono text-sm font-extrabold text-white">{session.durationFormatted}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-center">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Reps</span>
            <span className="font-mono text-sm font-extrabold text-white">{session.totalReps}</span>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-center">
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Form Avg</span>
            <span className="font-mono text-sm font-extrabold text-emerald-400">
              {session.averageFormScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Video Playback & Synchronized Biomechanics Scrubber */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player Box */}
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl">
            {session.recordedVideoBlobUrl ? (
              <video
                ref={videoRef}
                src={session.recordedVideoBlobUrl}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400">
                <p className="text-sm">Video recording was saved without video stream track.</p>
              </div>
            )}

            {/* Live Telemetry Overlay Box on Video */}
            <div className="absolute top-4 left-4 flex items-center space-x-2 rounded-2xl bg-slate-950/80 px-3 py-1.5 backdrop-blur-md border border-slate-800 text-xs font-mono text-white">
              <span className="text-slate-400">Elbow:</span>
              <span className="font-bold text-emerald-400">{Math.round(currentSample.elbowAngleLeft || 180)}°</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Hip:</span>
              <span className="font-bold text-emerald-400">{Math.round(currentSample.hipAngle || 180)}°</span>
            </div>

            {/* Slow Mo Badge */}
            {playbackRate !== 1.0 && (
              <div className="absolute top-4 right-4 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">
                {playbackRate}x Slow-Motion
              </div>
            )}
          </div>

          {/* Custom Video Scrubber & Playback Controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
            {/* Timeline Progress Bar with Rep Markers */}
            <div className="relative w-full">
              <input
                id="video-playback-scrubber"
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              {/* Rep Marker Pins along the timeline */}
              <div className="relative h-2 w-full mt-1">
                {allReps.map((r, i) => {
                  const percent = duration > 0 ? (r.timestampStart / duration) * 100 : 0;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSeek(r.timestampStart)}
                      title={`${r.exerciseName} - Rep ${r.repNumber} (${r.formScore}%)`}
                      style={{ left: `${Math.min(98, Math.max(0, percent))}%` }}
                      className={`absolute -top-1 h-3 w-1 rounded-full transition-transform hover:scale-150 ${
                        r.formScore >= 85 ? 'bg-emerald-400' : r.formScore >= 70 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Transport Buttons & Speed Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  id="toggle-playback-btn"
                  onClick={handleTogglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-slate-950" /> : <Play className="h-4 w-4 fill-slate-950" />}
                </button>

                <button
                  onClick={() => handleSeek(0)}
                  title="Restart Video"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <span className="font-mono text-xs text-slate-300 ml-2">
                  {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')} /{' '}
                  {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Speed Rate Selectors */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1.5">Speed:</span>
                {[0.25, 0.5, 1.0, 1.5].map((rate) => (
                  <button
                    key={rate}
                    id={`speed-btn-${rate}`}
                    onClick={() => handleSetSpeed(rate)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      playbackRate === rate
                        ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rep-by-Rep Breakdown Scrubber Panel */}
        <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Rep Breakdown & Timestamps</h3>
              <p className="text-xs text-slate-400">Click any rep to jump the video to that moment</p>
            </div>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300">
              {allReps.length} Reps
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[380px] pr-1">
            {allReps.map((rep, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedRep(rep);
                  handleSeek(rep.timestampStart);
                }}
                className={`cursor-pointer rounded-xl border p-3 transition-all ${
                  currentTime >= rep.timestampStart && currentTime <= rep.timestampEnd + 0.5
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {rep.exerciseName} • Rep {rep.repNumber}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      rep.formScore >= 85 ? 'text-emerald-400' : rep.formScore >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {rep.formScore}% Score
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Depth Angle: <strong className="text-slate-200">{rep.maxDepthAngle}°</strong></span>
                  <span>Duration: <strong className="text-slate-200">{rep.durationSeconds}s</strong></span>
                  <span className="text-emerald-400 font-medium">@{Math.round(rep.timestampStart)}s</span>
                </div>

                {rep.faultsDetected.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {rep.faultsDetected.map((f, fi) => (
                      <span key={fi} className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Download & Export Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              id="download-video-btn"
              onClick={handleDownloadVideo}
              disabled={!session.recordedVideoBlob}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save Video</span>
            </button>
            <button
              id="export-report-btn"
              onClick={handleDownloadReportJSON}
              className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Export Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Post-Workout Biomechanical Analysis (Powered by Gemini) */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">
                AI Coach Biomechanical Report
              </h2>
              <p className="text-xs text-slate-400">
                Detailed Olympic gymnastics & calisthenics movement analysis by Gemini
              </p>
            </div>
          </div>

          <button
            id="re-analyze-ai-btn"
            onClick={handleRequestAIAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-800 hover:border-emerald-500/40 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isAnalyzing ? 'Analyzing Biomechanics...' : 'Refresh AI Analysis'}</span>
          </button>
        </div>

        {isAnalyzing && (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-200">
              Gemini is analyzing joint angles, range of motion, and rep tempo...
            </p>
          </div>
        )}

        {analysisError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
            {analysisError}
          </div>
        )}

        {aiAnalysis && !isAnalyzing && (
          <div className="mt-6 space-y-6">
            {/* Grade & Executive Summary */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Overall Form Grade
                </span>
                <span className="font-mono text-5xl font-black text-white mt-2">
                  {aiAnalysis.overallGrade}
                </span>
                <span className="mt-2 text-xs text-emerald-300">
                  Avg Quality: {session.averageFormScore}%
                </span>
              </div>

              <div className="md:col-span-3 flex flex-col justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Coach Assessment
                </span>
                <p className="mt-2 text-sm text-slate-200 leading-relaxed">
                  "{aiAnalysis.summaryStatement}"
                </p>
                {aiAnalysis.progressionRecommendation && (
                  <p className="mt-3 text-xs text-emerald-300/90 font-medium">
                    🎯 Next Target: {aiAnalysis.progressionRecommendation}
                  </p>
                )}
              </div>
            </div>

            {/* Strengths & Energy Leaks / Faults Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Biomechanical Strengths */}
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-5 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Key Strengths Observed
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  {aiAnalysis.strengths.map((str, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Energy Leaks & Faults */}
              <div className="rounded-2xl border border-amber-500/20 bg-slate-950/60 p-5 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Energy Leaks & Technical Flaws
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {aiAnalysis.energyLeaksAndFaults.map((flaw, i) => (
                    <div key={i} className="rounded-xl bg-slate-900 p-3 border border-slate-800 text-xs">
                      <p className="font-bold text-white">{flaw.flaw}</p>
                      <p className="text-slate-400 mt-0.5">{flaw.impact}</p>
                      <p className="text-emerald-400 mt-1 font-medium">
                        Fix: {flaw.correction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Prescribed Corrective Drills */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
              <div className="flex items-center space-x-2 text-teal-400">
                <TrendingUp className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Targeted Corrective Drills (Before Next Session)
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {aiAnalysis.correctiveDrills.map((drill, i) => (
                  <div key={i} className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-1">
                    <p className="text-xs font-bold text-white">{drill.drillName}</p>
                    <span className="inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {drill.setsReps}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{drill.focusCue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
