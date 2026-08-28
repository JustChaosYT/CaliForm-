export type ExerciseCategory = 'push' | 'pull' | 'core' | 'legs' | 'skill';

export type ExerciseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';

export interface JointAngleTargets {
  bottomDepthAngle?: number; // e.g., < 90 for pushups
  topLockoutAngle?: number;  // e.g., > 165 for pushups
  saggingHipThreshold?: number; // e.g., < 160 deg is sagging
  pikingHipThreshold?: number;  // e.g., > 200 deg is piking
  primaryJoint: 'elbow' | 'knee' | 'hip' | 'shoulder';
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  muscleGroups: string[];
  description: string;
  isHold: boolean;
  defaultSets: number;
  defaultReps: number;
  defaultHoldDurationSecs: number;
  defaultRestSecs: number;
  angleTargets: JointAngleTargets;
  keyFormCues: string[];
  instantVoiceCues: {
    lowDepth: string;
    lockout: string;
    alignmentFault: string;
    repComplete: string;
    holdEncouragement: string;
  };
  regressions: string[];
  progressions: string[];
  tempoSuggestion: string; // e.g., "3-1-1-1 (3s down, 1s hold, 1s up, 1s top)"
}

export interface RoutineExercise {
  id: string; // unique instance id in routine
  exerciseId: string;
  name: string;
  category: ExerciseCategory;
  targetSets: number;
  targetReps: number;
  isHold: boolean;
  holdDurationSeconds: number;
  restSeconds: number;
  customCues?: string;
  angleTargetText?: string;
  voiceCueOverride?: string;
}

export interface Routine {
  id: string;
  title: string;
  description: string;
  category: ExerciseCategory | 'full_body';
  level: ExerciseDifficulty;
  estimatedMinutes: number;
  warmupCues: string[];
  exercises: RoutineExercise[];
  isPreset?: boolean;
  createdAt: number;
}

export type RepPhase = 'READY' | 'ECCENTRIC' | 'INFLECTION' | 'CONCENTRIC' | 'LOCKOUT';

export interface RepDetail {
  repNumber: number;
  timestampStart: number; // in seconds relative to video start
  timestampEnd: number;
  durationSeconds: number;
  maxDepthAngle: number;
  lockoutAngle: number;
  formScore: number; // 0-100
  faultsDetected: string[];
  voiceFeedbackGiven: string[];
}

export interface ExerciseSessionLog {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  isHold: boolean;
  targetSets: number;
  completedSets: number;
  targetReps: number;
  totalRepsCompleted: number;
  totalHoldTimeSeconds: number;
  avgScore: number;
  reps: RepDetail[];
}

export interface FormViolationEvent {
  id: string;
  timestamp: number; // video seconds
  timeFormatted: string;
  exerciseName: string;
  repNumber?: number;
  type: 'depth' | 'lockout' | 'alignment' | 'tempo' | 'asymmetry';
  description: string;
  severity: 'minor' | 'warning' | 'critical';
}

export interface AngleTelemetrySample {
  timestamp: number; // in seconds from workout start
  exerciseIndex: number;
  elbowAngleLeft: number;
  elbowAngleRight: number;
  hipAngle: number;
  kneeAngle: number;
  shoulderAngle: number;
  formQualityScore: number;
  currentPhase: RepPhase;
}

export interface AIAnalysisResult {
  overallGrade: string;
  summaryStatement: string;
  formScoreAssessment?: string;
  strengths: string[];
  energyLeaksAndFaults: Array<{
    flaw: string;
    impact: string;
    correction: string;
  }>;
  correctiveDrills: Array<{
    drillName: string;
    setsReps: string;
    focusCue: string;
  }>;
  progressionRecommendation: string;
  recoveryAdvice?: string;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineTitle: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  durationFormatted: string;
  totalReps: number;
  averageFormScore: number;
  exerciseLogs: ExerciseSessionLog[];
  formViolations: FormViolationEvent[];
  telemetryData: AngleTelemetrySample[];
  recordedVideoBlobUrl?: string;
  recordedVideoBlob?: Blob;
  recordedVideoMimeType?: string;
  aiAnalysis?: AIAnalysisResult;
}

export interface AudioFeedbackSettings {
  voiceEnabled: boolean;
  soundEffectsEnabled: boolean;
  speechRate: number; // 0.8 to 1.4
  speechPitch: number; // 0.8 to 1.2
  volume: number; // 0 to 1
  feedbackFrequency: 'high' | 'normal' | 'minimal'; // minimal = only rep counts
  selectedVoiceName?: string;
}
