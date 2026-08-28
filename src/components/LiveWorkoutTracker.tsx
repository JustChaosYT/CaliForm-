import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Play,
  Pause,
  Square,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Maximize2,
  RefreshCw,
  Plus,
  Minus,
  Timer,
  Wind,
  FlipHorizontal,
  Eye,
  Mic,
  MicOff,
  Music,
  Radio,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Routine,
  ExerciseDefinition,
  WorkoutSession,
  ExerciseSessionLog,
  RepDetail,
  FormViolationEvent,
  AngleTelemetrySample,
  RepPhase,
} from '../types/workout';
import { CALISTHENICS_EXERCISES } from '../data/calisthenicsLibrary';
import { calisthenicsPoseEngine, FormStateUpdate } from '../utils/poseEngine';
import { renderSkeletonOverlay, SkeletonVisualStyle } from '../utils/skeletonRenderer';
import { workoutVideoRecorder } from '../utils/videoRecorder';
import { audioCoach } from '../utils/audioFeedback';
import { workoutSynth, SynthRhythmPattern } from '../utils/ambientSynth';

interface LiveWorkoutTrackerProps {
  routine: Routine;
  onFinishWorkout: (session: WorkoutSession) => void;
  onCancelWorkout: () => void;
}

export const LiveWorkoutTracker: React.FC<LiveWorkoutTrackerProps> = ({
  routine,
  onFinishWorkout,
  onCancelWorkout,
}) => {
  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Workout Sequence State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(1); // 1-indexed for display
  const [isResting, setIsResting] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutDuration, setWorkoutDuration] = useState(0);

  // Live Biomechanical Telemetry
  const [currentPhase, setCurrentPhase] = useState<RepPhase>('READY');
  const [currentRepCount, setCurrentRepCount] = useState(0);
  const [currentHoldSeconds, setCurrentHoldSeconds] = useState(0);
  const [formScore, setFormScore] = useState(95);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [primaryAngle, setPrimaryAngle] = useState(180);
  const [hipAngle, setHipAngle] = useState(180);
  const [kneeAngle, setKneeAngle] = useState(180);
  const [depthPercentage, setDepthPercentage] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [visualStyle, setVisualStyle] = useState<SkeletonVisualStyle>('cyberpunk');
  const [isMirrored, setIsMirrored] = useState(true);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [tempoSecond, setTempoSecond] = useState(1); // 1-4 for 3-0-1-0 tempo cadence
  const [isMuted, setIsMuted] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState<{
    qualityScore: number;
    lockedJointsCount: number;
    totalJointsCount: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    guidanceMessage: string | null;
  }>({
    qualityScore: 95,
    lockedJointsCount: 13,
    totalJointsCount: 13,
    status: 'EXCELLENT',
    guidanceMessage: null,
  });
  const [dominantSide, setDominantSide] = useState<'left' | 'right'>('left');
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const isProcessingFrameRef = useRef(false);

  // Ambient Beats Synthesizer State
  const [isSynthPlaying, setIsSynthPlaying] = useState(false);
  const [synthBpm, setSynthBpm] = useState(124);
  const [synthPattern, setSynthPattern] = useState<SynthRhythmPattern>('electronic_pulse');

  // Hands-Free Voice Commands State
  const [isVoiceCommandsActive, setIsVoiceCommandsActive] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Toggle Synthesizer
  const handleToggleSynth = () => {
    if (isSynthPlaying) {
      workoutSynth.stop();
      setIsSynthPlaying(false);
    } else {
      workoutSynth.play(synthPattern, synthBpm);
      setIsSynthPlaying(true);
    }
  };

  // Metronome & Cadence Ticker (3s down, 0s pause, 1s up, 0s pause = 4s loop)
  useEffect(() => {
    if (!isMetronomeActive || isPaused || isResting || !isCameraReady) return;

    const interval = setInterval(() => {
      setTempoSecond((prev) => {
        const next = (prev % 4) + 1;
        // next === 1 -> Start descent (accent tick), 2, 3 -> down, 4 -> explode up (high pitch)
        audioCoach.playMetronomeTick(next === 1 || next === 4);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMetronomeActive, isPaused, isResting, isCameraReady]);

  // Voice Command Listener using Web Speech API
  useEffect(() => {
    if (!isVoiceCommandsActive) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Speech Recognition not supported in this browser environment');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult && lastResult[0]) {
          const phrase = lastResult[0].transcript.trim().toLowerCase();
          setLastHeardCommand(phrase);

          if (phrase.includes('pause') || phrase.includes('stop')) {
            setIsPaused(true);
            audioCoach.speak('Workout paused');
          } else if (phrase.includes('resume') || phrase.includes('continue') || phrase.includes('play')) {
            setIsPaused(false);
            audioCoach.speak('Resuming workout');
          } else if (phrase.includes('skip') || phrase.includes('start set') || phrase.includes('begin')) {
            setRestSecondsRemaining(0);
          } else if (phrase.includes('add rep') || phrase.includes('plus one') || phrase.includes('count')) {
            calisthenicsPoseEngine.adjustReps(1);
            setCurrentRepCount((r) => r + 1);
            audioCoach.playRepDing(1);
          } else if (phrase.includes('next')) {
            if (currentExerciseIndex < routine.exercises.length - 1) {
              setCurrentExerciseIndex((i) => i + 1);
              setCurrentSetIndex(1);
              calisthenicsPoseEngine.resetExerciseSession();
              setCurrentRepCount(0);
              setCurrentHoldSeconds(0);
              audioCoach.speak('Next exercise');
            }
          }
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (isVoiceCommandsActive) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('Voice command init error:', e);
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isVoiceCommandsActive, currentExerciseIndex, routine.exercises.length]);

  // Clean up synth on unmount
  useEffect(() => {
    return () => {
      workoutSynth.stop();
    };
  }, []);

  // Session Logging Data
  const workoutStartTimeRef = useRef(Date.now());
  const exerciseLogsRef = useRef<ExerciseSessionLog[]>([]);
  const currentSetRepsRef = useRef<RepDetail[]>([]);
  const formViolationsRef = useRef<FormViolationEvent[]>([]);
  const telemetryDataRef = useRef<AngleTelemetrySample[]>([]);

  const currentRoutineExercise = routine.exercises[currentExerciseIndex] || routine.exercises[0];
  const currentDef: ExerciseDefinition =
    CALISTHENICS_EXERCISES.find((e) => e.id === currentRoutineExercise.exerciseId) ||
    CALISTHENICS_EXERCISES[0];

  // Initialize Camera & Recording on Mount
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });

        if (!isMounted) return;
        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);

            // Start video recorder
            workoutVideoRecorder.startRecording(stream);

            // Announce workout start
            audioCoach.speak(`Starting workout: ${routine.title}. First exercise: ${currentDef.name}. Prepare for set 1!`, {
              category: 'info',
              priority: true,
            });
          };
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        setCameraError(
          'Unable to access camera or microphone. Please ensure camera permissions are granted.'
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (workoutVideoRecorder.getIsRecording()) {
        workoutVideoRecorder.stopRecording().catch(() => {});
      }
    };
  }, [routine.title]);

  // Set Current Exercise in Pose Engine
  useEffect(() => {
    calisthenicsPoseEngine.setExercise(currentDef);
    setCurrentRepCount(0);
    setCurrentHoldSeconds(0);
    setCurrentPhase('READY');
    currentSetRepsRef.current = [];
  }, [currentExerciseIndex, currentDef]);

  // Elapsed Workout Timer
  useEffect(() => {
    if (isPaused || !isCameraReady) return;
    const interval = setInterval(() => {
      setWorkoutDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCameraReady]);

  // Rest Timer Interval
  useEffect(() => {
    if (!isResting || isPaused) return;

    if (restSecondsRemaining <= 0) {
      // Rest complete
      setIsResting(false);
      audioCoach.playCountdownBeep(true);
      audioCoach.speak(`Rest complete. Begin set ${currentSetIndex}!`, {
        category: 'info',
        priority: true,
      });
      return;
    }

    // Spoken countdown at 3, 2, 1
    if (restSecondsRemaining <= 3 && restSecondsRemaining > 0) {
      audioCoach.playCountdownBeep(false);
      audioCoach.speak(`${restSecondsRemaining}`, { category: 'countdown', cooldownSecs: 0.8 });
    }

    const timer = setTimeout(() => {
      setRestSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isResting, restSecondsRemaining, isPaused, currentSetIndex]);

  // Real-Time Frame Processing & Skeleton Overlay Loop
  const processFrameLoop = useCallback(async () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      videoRef.current.readyState >= 2 &&
      !isPaused &&
      !isResting
    ) {
      if (isProcessingFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrameLoop);
        return;
      }

      isProcessingFrameRef.current = true;

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          const currentTimeSecs = (Date.now() - workoutStartTimeRef.current) / 1000;

          // Process Frame in Calisthenics Pose Engine
          const update: FormStateUpdate = await calisthenicsPoseEngine.processFrame(
            video,
            currentTimeSecs
          );

          // Update UI State
          setCurrentPhase(update.currentPhase);
          setCurrentRepCount(update.currentRepCount);
          setCurrentHoldSeconds(update.currentHoldSeconds);
          setFormScore(update.formScore);
          setActiveWarning(update.activeWarning);
          setTrackingQuality(update.trackingQuality);
          setDominantSide(update.dominantSide);
          setAngularVelocity(update.angularVelocity);
          setIsCalibrated(update.isCalibrated);

          setPrimaryAngle(
            currentDef.angleTargets.primaryJoint === 'knee'
              ? update.kneeAngle
              : currentDef.angleTargets.primaryJoint === 'hip'
              ? update.hipAngle
              : update.elbowAngle
          );
          setHipAngle(update.hipAngle);
          setKneeAngle(update.kneeAngle);
          setDepthPercentage(update.depthPercentage);

          // Record Rep Detail when completed
          if (update.completedRep) {
            currentSetRepsRef.current.push(update.completedRep);

            // Check if target reps reached for set
            if (
              !currentDef.isHold &&
              update.currentRepCount >= currentRoutineExercise.targetReps
            ) {
              handleCompleteSet();
            }
          }

          // Check if hold duration reached or in final countdown
          if (currentDef.isHold && currentRoutineExercise.holdDurationSeconds > 0) {
            const remainingSecs = currentRoutineExercise.holdDurationSeconds - update.currentHoldSeconds;
            
            if (remainingSecs <= 3 && remainingSecs > 0 && update.currentHoldSeconds > 0) {
              audioCoach.playCountdownBeep(false);
            }

            if (update.currentHoldSeconds >= currentRoutineExercise.holdDurationSeconds && update.currentHoldSeconds > 0) {
              handleCompleteSet();
            }
          }

          // Record Violation
          if (update.newViolation) {
            formViolationsRef.current.push(update.newViolation);
          }

          // Sample Telemetry every ~200ms
          if (Math.random() < 0.25) {
            telemetryDataRef.current.push({
              timestamp: Math.round(currentTimeSecs * 10) / 10,
              exerciseIndex: currentExerciseIndex,
              elbowAngleLeft: update.elbowAngle,
              elbowAngleRight: update.elbowAngle,
              hipAngle: update.hipAngle,
              kneeAngle: update.kneeAngle,
              shoulderAngle: update.shoulderAngle,
              formQualityScore: update.formScore,
              currentPhase: update.currentPhase,
            });
          }

          // Render Skeleton Overlay on Canvas
          if (showSkeleton) {
            renderSkeletonOverlay({
              canvas,
              ctx,
              keypoints: update.keypoints,
              width: canvas.width,
              height: canvas.height,
              currentPhase: update.currentPhase,
              formScore: update.formScore,
              activeWarning: update.activeWarning,
              dominantSide: update.dominantSide,
              targetDepthAngle: currentDef.angleTargets.bottomDepthAngle,
              primaryJoint: currentDef.angleTargets.primaryJoint,
              visualStyle,
              depthPercentage: update.depthPercentage,
              trackingQualityScore: update.trackingQuality.qualityScore,
              isCalibrated: update.isCalibrated,
            });
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      } catch (err) {
        console.warn('Frame loop processing warning:', err);
      } finally {
        isProcessingFrameRef.current = false;
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrameLoop);
  }, [isPaused, isResting, currentDef, currentRoutineExercise, showSkeleton, visualStyle, currentExerciseIndex]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(processFrameLoop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processFrameLoop]);

  // Complete Current Set Handler
  const handleCompleteSet = () => {
    audioCoach.playSetCompleteFanfare();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });

    // Store set log
    const completedSetReps = [...currentSetRepsRef.current];
    const avgScore =
      completedSetReps.length > 0
        ? Math.round(completedSetReps.reduce((a, b) => a + b.formScore, 0) / completedSetReps.length)
        : formScore;

    // Look for existing exercise log
    const existingLogIdx = exerciseLogsRef.current.findIndex(
      (l) => l.exerciseId === currentDef.id
    );

    if (existingLogIdx >= 0) {
      const existing = exerciseLogsRef.current[existingLogIdx];
      existing.completedSets += 1;
      existing.totalRepsCompleted += currentRepCount;
      existing.totalHoldTimeSeconds += currentHoldSeconds;
      existing.reps.push(...completedSetReps);
      existing.avgScore = Math.round((existing.avgScore + avgScore) / 2);
    } else {
      exerciseLogsRef.current.push({
        exerciseId: currentDef.id,
        exerciseName: currentDef.name,
        category: currentDef.category,
        isHold: currentDef.isHold,
        targetSets: currentRoutineExercise.targetSets,
        completedSets: 1,
        targetReps: currentRoutineExercise.targetReps,
        totalRepsCompleted: currentRepCount,
        totalHoldTimeSeconds: currentHoldSeconds,
        avgScore,
        reps: [...completedSetReps],
      });
    }

    // Check if more sets remain in this exercise
    if (currentSetIndex < currentRoutineExercise.targetSets) {
      setCurrentSetIndex((prev) => prev + 1);
      setIsResting(true);
      setRestSecondsRemaining(currentRoutineExercise.restSeconds || 45);
      calisthenicsPoseEngine.resetExerciseSession();
      setCurrentRepCount(0);
      setCurrentHoldSeconds(0);
      currentSetRepsRef.current = [];

      audioCoach.speak(
        `Set complete! Rest for ${currentRoutineExercise.restSeconds || 45} seconds. Great job.`,
        { category: 'info', priority: true }
      );
    } else {
      // Exercise finished! Advance to next exercise or finish workout
      if (currentExerciseIndex < routine.exercises.length - 1) {
        const nextIdx = currentExerciseIndex + 1;
        const nextEx = routine.exercises[nextIdx];
        setCurrentExerciseIndex(nextIdx);
        setCurrentSetIndex(1);
        setIsResting(true);
        setRestSecondsRemaining(currentRoutineExercise.restSeconds || 60);
        calisthenicsPoseEngine.resetExerciseSession();
        setCurrentRepCount(0);
        setCurrentHoldSeconds(0);
        currentSetRepsRef.current = [];

        audioCoach.speak(
          `All sets complete for ${currentDef.name}! Next up: ${nextEx.name}. Take a rest.`,
          { category: 'info', priority: true }
        );
      } else {
        // Workout Finished completely!
        handleFinishWorkoutSession();
      }
    }
  };

  // Complete Entire Workout Session & Package Data
  const handleFinishWorkoutSession = async () => {
    audioCoach.playSetCompleteFanfare();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });

    // Stop recording and retrieve video
    let recordedVideoBlob: Blob | undefined;
    let recordedVideoBlobUrl: string | undefined;
    let recordedVideoMimeType = 'video/webm';

    if (workoutVideoRecorder.getIsRecording()) {
      try {
        const result = await workoutVideoRecorder.stopRecording();
        recordedVideoBlob = result.blob;
        recordedVideoBlobUrl = result.url;
        recordedVideoMimeType = result.mimeType;
      } catch (err) {
        console.warn('Video recorder stop warning:', err);
      }
    }

    const durationSecs = Math.max(1, workoutDuration);
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const durationFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const totalReps = exerciseLogsRef.current.reduce((a, b) => a + b.totalRepsCompleted, 0);
    const avgScore =
      exerciseLogsRef.current.length > 0
        ? Math.round(
            exerciseLogsRef.current.reduce((a, b) => a + b.avgScore, 0) /
              exerciseLogsRef.current.length
          )
        : formScore;

    const completedSession: WorkoutSession = {
      id: `session-${Date.now()}`,
      routineId: routine.id,
      routineTitle: routine.title,
      startTime: workoutStartTimeRef.current,
      endTime: Date.now(),
      durationSeconds: durationSecs,
      durationFormatted,
      totalReps,
      averageFormScore: avgScore,
      exerciseLogs: exerciseLogsRef.current,
      formViolations: formViolationsRef.current,
      telemetryData: telemetryDataRef.current,
      recordedVideoBlob,
      recordedVideoBlobUrl,
      recordedVideoMimeType,
    };

    onFinishWorkout(completedSession);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const targetGoal = currentDef.isHold
    ? `${currentRoutineExercise.holdDurationSeconds}s Hold`
    : `${currentRoutineExercise.targetReps} Reps`;

  return (
    <div className="relative mx-auto max-w-7xl px-3 py-4 sm:px-6">
      {/* Top Header Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {routine.title}
            </span>
            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
              <span>
                Exercise {currentExerciseIndex + 1} of {routine.exercises.length}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{currentDef.name}</span>
            </div>
          </div>
        </div>

        {/* Global Timer & Controls */}
        <div className="flex items-center space-x-2">
          {/* Exercise navigation */}
          <div className="flex items-center space-x-1 border-r border-slate-800 pr-2">
            <button
              id="prev-exercise-btn"
              disabled={currentExerciseIndex === 0}
              onClick={() => {
                if (currentExerciseIndex > 0) {
                  setCurrentExerciseIndex((i) => i - 1);
                  setCurrentSetIndex(1);
                  calisthenicsPoseEngine.resetExerciseSession();
                  setCurrentRepCount(0);
                  setCurrentHoldSeconds(0);
                }
              }}
              title="Previous Exercise"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              id="next-exercise-btn"
              disabled={currentExerciseIndex === routine.exercises.length - 1}
              onClick={() => {
                if (currentExerciseIndex < routine.exercises.length - 1) {
                  setCurrentExerciseIndex((i) => i + 1);
                  setCurrentSetIndex(1);
                  calisthenicsPoseEngine.resetExerciseSession();
                  setCurrentRepCount(0);
                  setCurrentHoldSeconds(0);
                }
              }}
              title="Next Exercise"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5 rounded-xl bg-slate-900 px-3 py-1.5 border border-slate-800 text-xs font-mono text-slate-200">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span>{formatTimer(workoutDuration)}</span>
          </div>

          {/* Skeleton Style Selector */}
          <select
            id="select-skeleton-style"
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value as SkeletonVisualStyle)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-300 focus:border-emerald-500 focus:outline-none"
            title="Skeleton Overlay Visual Style"
          >
            <option value="cyberpunk">Neon Cyberpunk</option>
            <option value="biomechanical">Heatmap & Arcs</option>
            <option value="minimal">Minimal Laser</option>
            <option value="ghost_depth">Ghost Depth Guide</option>
          </select>

          {/* Metronome Cadence Toggle */}
          <button
            id="toggle-metronome-btn"
            onClick={() => setIsMetronomeActive(!isMetronomeActive)}
            title={isMetronomeActive ? 'Turn Off Tempo Cadence Metronome' : 'Turn On 3-0-1-0 Tempo Metronome'}
            className={`flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isMetronomeActive
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isMetronomeActive ? `Tempo ${tempoSecond}/4` : 'Tempo'}</span>
          </button>

          {/* Ambient Synth Workout Beats Toggle */}
          <button
            id="toggle-workout-synth-btn"
            onClick={handleToggleSynth}
            title={isSynthPlaying ? 'Stop Ambient Workout Beats' : 'Play Synthesized Workout Beats'}
            className={`flex items-center space-x-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
              isSynthPlaying
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50 animate-pulse'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isSynthPlaying ? `${synthBpm} BPM` : 'Beats'}</span>
          </button>

          {/* Hands-Free Voice Commands Toggle */}
          <button
            id="toggle-voice-commands-btn"
            onClick={() => setIsVoiceCommandsActive(!isVoiceCommandsActive)}
            title={
              isVoiceCommandsActive
                ? 'Voice Commands Active ("pause", "resume", "skip", "next", "add rep")'
                : 'Enable Hands-Free Voice Commands'
            }
            className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-colors ${
              isVoiceCommandsActive
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {isVoiceCommandsActive ? <Mic className="h-4 w-4 text-emerald-400 animate-pulse" /> : <MicOff className="h-4 w-4" />}
          </button>

          {/* Mirror Camera Toggle */}
          <button
            id="toggle-camera-mirror-btn"
            onClick={() => setIsMirrored(!isMirrored)}
            title={isMirrored ? 'Disable Mirror' : 'Enable Mirror'}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-colors ${
              isMirrored
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            <FlipHorizontal className="h-4 w-4" />
          </button>

          <button
            id="toggle-skeleton-btn"
            onClick={() => setShowSkeleton(!showSkeleton)}
            title="Toggle Skeleton Overlay"
            className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs transition-colors ${
              showSkeleton
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            <Layers className="h-4 w-4" />
          </button>

          <button
            id="toggle-audio-mute-btn"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              audioCoach.updateSettings({ voiceEnabled: !nextMuted, soundEffectsEnabled: !nextMuted });
            }}
            title={isMuted ? 'Unmute Audio Coach' : 'Mute Audio Coach'}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            id="finish-early-workout-btn"
            onClick={handleFinishWorkoutSession}
            className="flex items-center space-x-1.5 rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/25"
          >
            <Square className="h-3.5 w-3.5 fill-red-400" />
            <span>End & Review</span>
          </button>
        </div>
      </div>

      {/* Main Video Screen & Biomechanical HUD */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Live Camera + Overlay Canvas Box */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl lg:col-span-3 sm:aspect-video">
          {cameraError ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
              <p className="text-sm font-semibold text-white">{cameraError}</p>
              <p className="mt-1 text-xs text-slate-400">
                Live computer vision and form analysis require camera permissions.
              </p>
            </div>
          ) : (
            <>
              {/* Raw Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover transform ${isMirrored ? 'scale-x-[-1]' : ''}`}
              />

              {/* Glowing Skeleton & Telemetry Overlay Canvas */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 h-full w-full object-cover pointer-events-none transform ${
                  isMirrored ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Recording Badge */}
              <div className="absolute top-4 left-4 flex items-center space-x-2 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-slate-800 shadow-lg">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span>AI VISION REC</span>
              </div>

              {/* Tracking Quality & Calibration HUD Pill */}
              <div className="absolute top-4 left-36 hidden sm:flex items-center space-x-2 rounded-full bg-slate-950/85 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-md border border-slate-800 shadow-lg">
                <span
                  className={`h-2 w-2 rounded-full ${
                    trackingQuality.status === 'EXCELLENT'
                      ? 'bg-emerald-400 animate-pulse'
                      : trackingQuality.status === 'GOOD'
                      ? 'bg-teal-400'
                      : trackingQuality.status === 'FAIR'
                      ? 'bg-amber-400'
                      : 'bg-red-400 animate-ping'
                  }`}
                />
                <span>
                  Tracking: <strong className="text-white font-mono">{trackingQuality.qualityScore}%</strong> ({trackingQuality.lockedJointsCount}/{trackingQuality.totalJointsCount} Joints)
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono text-[10px] uppercase">1-Euro Filter</span>
              </div>

              {/* Set & Target Reps Pill */}
              <div className="absolute top-4 right-4 flex items-center space-x-2 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-bold text-slate-200 backdrop-blur-md border border-slate-800 shadow-lg">
                <span>
                  Set {currentSetIndex} / {currentRoutineExercise.targetSets}
                </span>
                <span>•</span>
                <span className="text-emerald-400">{targetGoal}</span>
              </div>

              {/* Guidance Message Banner (When camera angle or distance needs adjustment) */}
              {trackingQuality.guidanceMessage && !isResting && !activeWarning && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 rounded-2xl bg-amber-500/90 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-xl backdrop-blur-md">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{trackingQuality.guidanceMessage}</span>
                </div>
              )}

              {/* Form Warning Banner (Floating Top Alert) */}
              {activeWarning && !isResting && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center space-x-2 rounded-2xl bg-red-600/90 px-4 py-2 text-xs font-bold text-white shadow-xl shadow-red-500/30 backdrop-blur-md animate-bounce">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{activeWarning}</span>
                </div>
              )}

              {/* Rest Interval Overlay with 4-7-8 Breathing Guide */}
              {isResting && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/90 p-6 backdrop-blur-md text-center">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-2">
                    SET COMPLETED
                  </span>
                  <h3 className="text-xl font-extrabold text-white sm:text-2xl">Rest & Recovery</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Next: {currentDef.name} (Set {currentSetIndex}/{currentRoutineExercise.targetSets})
                  </p>

                  {/* 4-7-8 Breathing Pacer Bubble */}
                  <div className="relative my-5 flex h-32 w-32 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 animate-ping opacity-30" />
                    <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-emerald-500 bg-slate-900 font-mono text-3xl font-extrabold text-white shadow-xl shadow-emerald-500/20">
                      <span>{restSecondsRemaining}s</span>
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                        {restSecondsRemaining % 8 <= 3 ? 'Inhale' : restSecondsRemaining % 8 <= 5 ? 'Hold' : 'Exhale'}
                      </span>
                    </div>
                  </div>

                  {/* Rest Adjusters & Skip */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      id="minus-15-rest-btn"
                      onClick={() => setRestSecondsRemaining((s) => Math.max(0, s - 15))}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      -15s
                    </button>
                    <button
                      id="plus-15-rest-btn"
                      onClick={() => setRestSecondsRemaining((s) => s + 15)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      +15s
                    </button>
                    <button
                      id="skip-rest-btn"
                      onClick={() => setRestSecondsRemaining(0)}
                      className="flex items-center space-x-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-emerald-400"
                    >
                      <Play className="h-3.5 w-3.5 fill-slate-950" />
                      <span>Begin Set Now</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom HUD Overlay Overlaying Video */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 pointer-events-none">
                {/* Rep Progress / Hold Ring Badge */}
                <div className="flex items-center space-x-3 rounded-2xl bg-slate-950/85 p-3 backdrop-blur-md border border-slate-800 shadow-xl pointer-events-auto">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 border-2 border-emerald-500">
                    <span className="font-mono text-2xl font-black text-white">
                      {currentDef.isHold ? currentHoldSeconds : currentRepCount}
                    </span>
                    <span className="absolute -bottom-1 text-[9px] font-bold text-emerald-400 uppercase">
                      {currentDef.isHold ? 'SECS' : 'REPS'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">{currentDef.name}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          currentPhase === 'LOCKOUT'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : currentPhase === 'INFLECTION'
                            ? 'bg-teal-500/20 text-teal-300'
                            : currentPhase === 'ECCENTRIC'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {currentPhase}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p className="text-[11px] text-slate-400">
                        Target: <span className="text-slate-200 font-semibold">{targetGoal}</span>
                      </p>
                      {/* Manual Quick +/- Nudge */}
                      <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
                        <button
                          id="decrease-rep-btn"
                          onClick={() => {
                            if (currentDef.isHold) {
                              calisthenicsPoseEngine.adjustHoldSeconds(-5);
                              setCurrentHoldSeconds((s) => Math.max(0, s - 5));
                            } else {
                              calisthenicsPoseEngine.adjustReps(-1);
                              setCurrentRepCount((r) => Math.max(0, r - 1));
                            }
                          }}
                          title={currentDef.isHold ? 'Minus 5 seconds' : 'Minus 1 rep'}
                          className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <button
                          id="increase-rep-btn"
                          onClick={() => {
                            if (currentDef.isHold) {
                              calisthenicsPoseEngine.adjustHoldSeconds(5);
                              setCurrentHoldSeconds((s) => s + 5);
                            } else {
                              calisthenicsPoseEngine.adjustReps(1);
                              setCurrentRepCount((r) => r + 1);
                            }
                          }}
                          title={currentDef.isHold ? 'Plus 5 seconds' : 'Plus 1 rep'}
                          className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Depth & Form Score Pill */}
                <div className="flex items-center space-x-2 rounded-2xl bg-slate-950/85 p-3 backdrop-blur-md border border-slate-800 shadow-xl pointer-events-auto">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                      <span>DEPTH</span>
                      <span className="text-emerald-400 font-mono">{depthPercentage}%</span>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-150"
                        style={{ width: `${depthPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="border-l border-slate-800 pl-3">
                    <span className="block text-[10px] font-semibold text-slate-400">SCORE</span>
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        formScore >= 85
                          ? 'text-emerald-400'
                          : formScore >= 70
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {formScore}%
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Side Panel: Biomechanical Gauges & Coaching Cues */}
        <div className="flex flex-col justify-between space-y-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 backdrop-blur-md">
          {/* Key Form Guidance */}
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                ACTIVE EXERCISE
              </span>
              <h3 className="text-base font-bold text-white">{currentDef.name}</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {currentDef.description}
              </p>
            </div>

            {/* Live Angle Sensors & Biomechanical Telemetry */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Live Joint Telemetry
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {dominantSide.toUpperCase()} SIDE
                </span>
              </div>

              {/* Primary Joint (Elbow / Knee) */}
              <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-xs text-slate-300 capitalize">
                  {currentDef.angleTargets.primaryJoint} Angle
                </span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-extrabold text-emerald-400">
                    {primaryAngle}°
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    ({Math.round(angularVelocity)}°/s)
                  </span>
                </div>
              </div>

              {/* Hip / Collinearity Angle */}
              <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                <span className="text-xs text-slate-300">Torso / Hip Line</span>
                <span
                  className={`font-mono text-sm font-extrabold ${
                    hipAngle < (currentDef.angleTargets.saggingHipThreshold || 160)
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {hipAngle}°
                </span>
              </div>

              {/* Zero-Calibration Action Button */}
              <button
                id="calibrate-pose-btn"
                onClick={() => {
                  calisthenicsPoseEngine.calibrateUserLockout(primaryAngle);
                  setIsCalibrated(true);
                  audioCoach.speak('Pose geometry baseline calibrated.', { category: 'info', priority: true });
                }}
                className={`flex w-full items-center justify-center space-x-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                  isCalibrated
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-emerald-500 hover:text-white'
                }`}
                title="Lock current angle as your personal top lockout baseline"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isCalibrated ? '✓ Baseline Calibrated' : 'Calibrate Lockout Pose'}</span>
              </button>
            </div>

            {/* Essential Form Check Cues */}
            <div className="rounded-xl bg-slate-900/50 p-3 border border-slate-800/60">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Biomechanical Cues
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {currentDef.keyFormCues.slice(0, 3).map((cue, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Workout Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              id="manual-complete-set-btn"
              onClick={handleCompleteSet}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Set ({currentSetIndex}/{currentRoutineExercise.targetSets})</span>
            </button>

            <button
              id="cancel-workout-btn"
              onClick={onCancelWorkout}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-1"
            >
              Discard & Exit Workout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
