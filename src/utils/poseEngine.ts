import {
  BodyKeypoints,
  extractBodyKeypoints,
  dominantSideTracker,
  BodyPoseFilter,
  evaluateTrackingQuality,
  calculateJointAngle,
} from './poseGeometry';
import { ExerciseDefinition, RepPhase, RepDetail, FormViolationEvent } from '../types/workout';
import { audioCoach } from './audioFeedback';

export interface TrackingQualityInfo {
  qualityScore: number; // 0-100%
  lockedJointsCount: number;
  totalJointsCount: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  guidanceMessage: string | null;
}

export interface FormStateUpdate {
  keypoints: BodyKeypoints;
  currentPhase: RepPhase;
  currentRepCount: number;
  currentHoldSeconds: number;
  formScore: number;
  elbowAngle: number;
  hipAngle: number;
  kneeAngle: number;
  shoulderAngle: number;
  activeWarning: string | null;
  dominantSide: 'left' | 'right';
  depthPercentage: number; // 0 to 100%
  completedRep?: RepDetail;
  newViolation?: FormViolationEvent;
  trackingQuality: TrackingQualityInfo;
  angularVelocity: number; // deg/sec
  isCalibrated: boolean;
}

export class CalisthenicsPoseEngine {
  private poseDetector: any = null;
  private isDetectorReady = false;
  private isInitializingDetector = false;
  private currentExercise: ExerciseDefinition | null = null;
  private poseFilter = new BodyPoseFilter();

  // Calibration state
  private isCalibrated = false;
  private calibrationSamples: number[] = [];
  private calibratedLockoutAngle = 168; // Auto-learned extended starting baseline

  // Rep tracking state machine
  private phase: RepPhase = 'READY';
  private repCount = 0;
  private holdSeconds = 0;
  private lastHoldTimestamp = 0;
  private holdAccumulator = 0; // fractional seconds
  private lastAnnouncedHoldSec = 0;
  private repStartTime = 0;
  private minAngleInRep = 180;
  private maxAngleInRep = 0;
  private lastPrimaryAngle = 180;
  private lastAngleTimestamp = 0;
  private angularVelocity = 0; // degrees/sec
  private repFaults: string[] = [];
  private repCuesSpoken: string[] = [];
  private lastCompletedRepTime = 0;
  private lastViolationTime = 0;
  private activeWarning: string | null = null;
  private warningClearTimeout: any = null;

  // Smoothing
  private smoothedElbowAngle = 180;
  private smoothedHipAngle = 180;
  private smoothedKneeAngle = 180;

  constructor() {
    this.initMediaPipe();
  }

  private async initMediaPipe() {
    if (this.isDetectorReady || this.isInitializingDetector) return;
    this.isInitializingDetector = true;

    try {
      if (typeof window === 'undefined') return;

      // Dynamically load MediaPipe Pose script if not already present
      if (!(window as any).Pose) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
      }

      if ((window as any).Pose) {
        const PoseClass = (window as any).Pose;
        this.poseDetector = new PoseClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        this.poseDetector.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        this.isDetectorReady = true;
      }
    } catch (e) {
      console.warn('MediaPipe CDN initialization note:', e);
    } finally {
      this.isInitializingDetector = false;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  public setExercise(exercise: ExerciseDefinition) {
    this.currentExercise = exercise;
    this.resetExerciseSession();
  }

  public resetExerciseSession() {
    this.phase = 'READY';
    this.repCount = 0;
    this.holdSeconds = 0;
    this.lastHoldTimestamp = 0;
    this.holdAccumulator = 0;
    this.lastAnnouncedHoldSec = 0;
    this.minAngleInRep = 180;
    this.maxAngleInRep = 0;
    this.repFaults = [];
    this.repCuesSpoken = [];
    this.activeWarning = null;
    this.isCalibrated = false;
    this.calibrationSamples = [];
    this.calibratedLockoutAngle = this.currentExercise?.angleTargets?.topLockoutAngle || 168;
    this.poseFilter.reset();
    dominantSideTracker.reset();
  }

  public adjustReps(delta: number) {
    this.repCount = Math.max(0, this.repCount + delta);
    if (delta > 0) {
      audioCoach.playRepDing(this.repCount);
      audioCoach.speak(`${this.repCount}`, { category: 'rep', priority: true });
    }
  }

  public adjustHoldSeconds(delta: number) {
    this.holdSeconds = Math.max(0, this.holdSeconds + delta);
    this.holdAccumulator = this.holdSeconds;
  }

  public calibrateBaseline(customLockoutAngle?: number) {
    if (customLockoutAngle) {
      this.calibratedLockoutAngle = customLockoutAngle;
      this.isCalibrated = true;
    } else if (this.calibrationSamples.length > 5) {
      const avg = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
      this.calibratedLockoutAngle = Math.round(Math.max(145, Math.min(180, avg)));
      this.isCalibrated = true;
    }
    audioCoach.speak('Pose calibrated and locked', { category: 'info', priority: true });
  }

  public async processFrame(
    videoElement: HTMLVideoElement,
    currentVideoTime: number
  ): Promise<FormStateUpdate> {
    let rawLandmarks: any[] = [];

    if (this.isDetectorReady && this.poseDetector) {
      try {
        await new Promise<void>((resolve) => {
          this.poseDetector.onResults((results: any) => {
            if (results && results.poseLandmarks) {
              rawLandmarks = results.poseLandmarks;
            }
            resolve();
          });
          this.poseDetector.send({ image: videoElement }).catch(() => resolve());
        });
      } catch (err) {
        // Continue with extracted or synthetic landmarks
      }
    }

    // 1. Extract raw body keypoints with anatomical limb imputation
    const extractedKeypoints = extractBodyKeypoints(rawLandmarks);

    // 2. Apply One-Euro adaptive low-pass filter (dynamically adjusts to speed)
    const filteredKeypoints = this.poseFilter.filterKeypoints(extractedKeypoints, currentVideoTime);

    // 3. Compute 3D & 2D angles with hysteresis-backed dominant side
    const angles = dominantSideTracker.getDominantSideAngles(filteredKeypoints);

    // 4. Calculate angular velocity (degrees/second)
    const primaryCurrentAngle =
      this.currentExercise?.angleTargets.primaryJoint === 'knee'
        ? angles.kneeAngle
        : this.currentExercise?.angleTargets.primaryJoint === 'hip'
        ? angles.hipAngle
        : angles.elbowAngle;

    if (this.lastAngleTimestamp > 0 && currentVideoTime > this.lastAngleTimestamp) {
      const dt = currentVideoTime - this.lastAngleTimestamp;
      if (dt > 0.01 && dt < 0.5) {
        const instantVelocity = (primaryCurrentAngle - this.lastPrimaryAngle) / dt;
        this.angularVelocity = this.angularVelocity * 0.7 + instantVelocity * 0.3;
      }
    }
    this.lastPrimaryAngle = primaryCurrentAngle;
    this.lastAngleTimestamp = currentVideoTime;

    // 5. Evaluate form, biometric alignment, and rep state machine
    return this.evaluateForm(
      filteredKeypoints,
      {
        elbowAngle: angles.elbowAngle,
        hipAngle: angles.hipAngle,
        kneeAngle: angles.kneeAngle,
        shoulderAngle: angles.shoulderAngle,
        dominantSide: angles.dominantSide,
        leftElbow: angles.leftElbow,
        rightElbow: angles.rightElbow,
        leftHip: angles.leftHip,
        rightHip: angles.rightHip,
        trackingQuality: angles.trackingQuality,
      },
      currentVideoTime
    );
  }

  private evaluateForm(
    keypoints: BodyKeypoints,
    angles: {
      elbowAngle: number;
      hipAngle: number;
      kneeAngle: number;
      shoulderAngle: number;
      dominantSide: 'left' | 'right';
      leftElbow: number;
      rightElbow: number;
      leftHip: number;
      rightHip: number;
      trackingQuality: TrackingQualityInfo;
    },
    currentVideoTime: number
  ): FormStateUpdate {
    if (!this.currentExercise) {
      return {
        keypoints,
        currentPhase: 'READY',
        currentRepCount: this.repCount,
        currentHoldSeconds: this.holdSeconds,
        formScore: 100,
        elbowAngle: angles.elbowAngle,
        hipAngle: angles.hipAngle,
        kneeAngle: angles.kneeAngle,
        shoulderAngle: angles.shoulderAngle,
        activeWarning: null,
        dominantSide: angles.dominantSide,
        depthPercentage: 0,
        trackingQuality: angles.trackingQuality,
        angularVelocity: Math.round(this.angularVelocity),
        isCalibrated: this.isCalibrated,
      };
    }

    const ex = this.currentExercise;
    let newCompletedRep: RepDetail | undefined;
    let newViolation: FormViolationEvent | undefined;
    let formScore = 95;
    let depthPercentage = 0;

    // ----------------------------------------------------
    // 1. STATIC HOLDS (Plank, Hollow Body, L-Sit, Levers)
    // ----------------------------------------------------
    if (ex.isHold) {
      const isHipAligned =
        !ex.angleTargets.saggingHipThreshold ||
        angles.hipAngle >= ex.angleTargets.saggingHipThreshold;

      // Track wall-clock time delta
      if (this.lastHoldTimestamp === 0) {
        this.lastHoldTimestamp = currentVideoTime;
      }
      const dt = Math.max(0, Math.min(0.5, currentVideoTime - this.lastHoldTimestamp));
      this.lastHoldTimestamp = currentVideoTime;

      if (!isHipAligned) {
        formScore = 55;
        this.triggerWarning(ex.instantVoiceCues.alignmentFault, currentVideoTime, 'alignment');
      } else {
        formScore = 98;
        this.holdAccumulator += dt;
        const newWholeSec = Math.floor(this.holdAccumulator);

        if (newWholeSec > this.holdSeconds) {
          this.holdSeconds = newWholeSec;

          // Announce milestones at 5s, 10s, 15s, 20s, 30s, 45s, 60s
          if (
            (this.holdSeconds % 10 === 0 || (this.holdSeconds === 5 && this.lastAnnouncedHoldSec < 5)) &&
            this.holdSeconds !== this.lastAnnouncedHoldSec
          ) {
            this.lastAnnouncedHoldSec = this.holdSeconds;
            audioCoach.speak(`${this.holdSeconds} seconds. ${ex.instantVoiceCues.holdEncouragement}`, {
              category: 'rep',
              cooldownSecs: 2.0,
            });
          }
        }
      }

      return {
        keypoints,
        currentPhase: isHipAligned ? 'INFLECTION' : 'READY',
        currentRepCount: this.repCount,
        currentHoldSeconds: this.holdSeconds,
        formScore,
        elbowAngle: angles.elbowAngle,
        hipAngle: angles.hipAngle,
        kneeAngle: angles.kneeAngle,
        shoulderAngle: angles.shoulderAngle,
        activeWarning: this.activeWarning,
        dominantSide: angles.dominantSide,
        depthPercentage: 100,
        trackingQuality: angles.trackingQuality,
        angularVelocity: Math.round(this.angularVelocity),
        isCalibrated: true,
      };
    }

    // ----------------------------------------------------
    // 2. DYNAMIC REP MOVEMENTS (Pushups, Dips, Pullups, Rows, Squats, Pike, Leg Raises)
    // ----------------------------------------------------
    const targetBottomDepth = ex.angleTargets.bottomDepthAngle || 90;
    const targetTopLockout = this.isCalibrated
      ? this.calibratedLockoutAngle
      : ex.angleTargets.topLockoutAngle || 165;

    const extendedAngle = Math.max(targetBottomDepth, targetTopLockout); // ~160-175° (straight limb/hang)
    const flexedAngle = Math.min(targetBottomDepth, targetTopLockout);   // ~70-90° (deep flexion/peak)

    const primaryAngle =
      ex.angleTargets.primaryJoint === 'knee'
        ? angles.kneeAngle
        : ex.angleTargets.primaryJoint === 'hip'
        ? angles.hipAngle
        : angles.elbowAngle;

    // Auto-calibrate user baseline in READY phase if steady
    if (!this.isCalibrated && (this.phase === 'READY' || this.phase === 'LOCKOUT')) {
      if (Math.abs(this.angularVelocity) < 8 && primaryAngle > 140) {
        this.calibrationSamples.push(primaryAngle);
        if (this.calibrationSamples.length >= 25) {
          const avg = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
          this.calibratedLockoutAngle = Math.round(avg);
          this.isCalibrated = true;
        }
      }
    }

    // Calculate depth percentage (0% at full extension/hang, 100% at target depth)
    const fullRange = Math.max(20, extendedAngle - flexedAngle);
    depthPercentage = Math.min(100, Math.max(0, ((extendedAngle - primaryAngle) / fullRange) * 100));

    // Check for Hip Sagging / Piking in Pushups / Rows / Planks
    if (ex.angleTargets.saggingHipThreshold && angles.hipAngle < ex.angleTargets.saggingHipThreshold) {
      formScore -= 30;
      this.triggerWarning(ex.instantVoiceCues.alignmentFault, currentVideoTime, 'alignment');
    }

    // Check Bilateral Asymmetry between left and right limbs
    const armAsymmetry = Math.abs(angles.leftElbow - angles.rightElbow);
    if (armAsymmetry > 30 && (angles.trackingQuality.qualityScore > 70)) {
      formScore -= 15;
    }

    const isPullMovement = ex.category === 'pull';
    const timeSinceLastRep = currentVideoTime - this.lastCompletedRepTime;

    // ----------------------------------------------------
    // Robust Rep State Machine with Hysteresis & Debouncing
    // ----------------------------------------------------
    if (this.phase === 'READY' || this.phase === 'LOCKOUT') {
      // User is at extended starting position (lockout or dead hang)
      if (primaryAngle >= extendedAngle - 20) {
        // Check if movement commenced into eccentric/concentric phase
        if (depthPercentage >= 15 && Math.abs(this.angularVelocity) > 8) {
          this.phase = isPullMovement ? 'CONCENTRIC' : 'ECCENTRIC';
          this.repStartTime = currentVideoTime;
          this.minAngleInRep = primaryAngle;
          this.maxAngleInRep = primaryAngle;
          this.repFaults = [];
          this.repCuesSpoken = [];
        }
      }
    } else if (this.phase === 'ECCENTRIC' || (isPullMovement && this.phase === 'CONCENTRIC')) {
      if (primaryAngle < this.minAngleInRep) {
        this.minAngleInRep = primaryAngle;
      }

      // Detect inflection point (reached target depth or velocity reversed from negative to positive)
      const reachedDepthThreshold = primaryAngle <= flexedAngle + 14 || depthPercentage >= 80;
      const velocityReversed = isPullMovement ? this.angularVelocity < -15 : this.angularVelocity > 15;

      if (reachedDepthThreshold || (depthPercentage >= 65 && velocityReversed)) {
        this.phase = 'INFLECTION';
      } else if (
        primaryAngle > extendedAngle - 10 &&
        currentVideoTime - this.repStartTime > 0.7 &&
        depthPercentage < 50
      ) {
        // Aborted rep / returned early without hitting depth
        this.phase = 'LOCKOUT';
        this.triggerWarning(ex.instantVoiceCues.lowDepth, currentVideoTime, 'depth');
      }
    } else if (this.phase === 'INFLECTION') {
      if (primaryAngle < this.minAngleInRep) {
        this.minAngleInRep = primaryAngle;
      }

      // Transition into return phase (pushing up or lowering down from pull)
      if (primaryAngle > flexedAngle + 12 || (isPullMovement ? this.angularVelocity < -10 : this.angularVelocity > 10)) {
        this.phase = isPullMovement ? 'ECCENTRIC' : 'CONCENTRIC';
      }
    } else if (this.phase === 'CONCENTRIC' || (isPullMovement && this.phase === 'ECCENTRIC')) {
      if (primaryAngle > this.maxAngleInRep) {
        this.maxAngleInRep = primaryAngle;
      }

      // Reached full extension / lockout / hang (debounced minimum 0.35s duration)
      const repDuration = Math.max(0.4, currentVideoTime - this.repStartTime);
      const isExtended = primaryAngle >= extendedAngle - 16 || depthPercentage <= 15;

      if (isExtended && repDuration >= 0.35 && timeSinceLastRep >= 0.4) {
        this.repCount += 1;
        this.phase = 'LOCKOUT';
        this.lastCompletedRepTime = currentVideoTime;

        let repScore = 100;

        // Form deduction scoring
        if (this.minAngleInRep > flexedAngle + 12 && depthPercentage < 80) {
          repScore -= 25;
          this.repFaults.push('Partial range of motion (incomplete depth)');
        }
        if (ex.angleTargets.saggingHipThreshold && angles.hipAngle < ex.angleTargets.saggingHipThreshold) {
          repScore -= 20;
          this.repFaults.push('Sagging hips / loss of core tension');
        }
        if (armAsymmetry > 28) {
          repScore -= 15;
          this.repFaults.push('Uneven bilateral push/pull');
        }

        // Voice Feedback & Ding
        audioCoach.playRepDing(this.repCount);
        const praise = repScore >= 85 ? ex.instantVoiceCues.repComplete : ex.instantVoiceCues.lockout;
        audioCoach.speak(`Rep ${this.repCount}. ${praise}`, {
          category: 'rep',
          cooldownSecs: 1.2,
          priority: true,
        });

        newCompletedRep = {
          repNumber: this.repCount,
          timestampStart: Math.round(this.repStartTime * 10) / 10,
          timestampEnd: Math.round(currentVideoTime * 10) / 10,
          durationSeconds: Math.round(repDuration * 10) / 10,
          maxDepthAngle: Math.round(this.minAngleInRep),
          lockoutAngle: Math.round(primaryAngle),
          formScore: Math.max(40, repScore),
          faultsDetected: [...this.repFaults],
          voiceFeedbackGiven: [...this.repCuesSpoken],
        };
      }
    }

    return {
      keypoints,
      currentPhase: this.phase,
      currentRepCount: this.repCount,
      currentHoldSeconds: this.holdSeconds,
      formScore: Math.max(30, Math.min(100, formScore)),
      elbowAngle: Math.round(angles.elbowAngle),
      hipAngle: Math.round(angles.hipAngle),
      kneeAngle: Math.round(angles.kneeAngle),
      shoulderAngle: Math.round(angles.shoulderAngle),
      activeWarning: this.activeWarning,
      dominantSide: angles.dominantSide,
      depthPercentage: Math.round(depthPercentage),
      completedRep: newCompletedRep,
      newViolation,
      trackingQuality: angles.trackingQuality,
      angularVelocity: Math.round(this.angularVelocity),
      isCalibrated: this.isCalibrated,
    };
  }

  public calibrateUserLockout(currentAngle: number) {
    if (currentAngle > 100 && currentAngle < 195) {
      this.calibratedLockoutAngle = currentAngle;
      this.isCalibrated = true;
    }
  }

  private triggerWarning(
    message: string,
    time: number,
    type: 'depth' | 'lockout' | 'alignment' | 'tempo' = 'alignment'
  ) {
    this.activeWarning = message;
    if (this.currentExercise) {
      this.repFaults.push(message);
    }

    if (time - this.lastViolationTime > 3.0) {
      this.lastViolationTime = time;
      audioCoach.playWarningTone();
      audioCoach.speak(message, { category: 'fault', cooldownSecs: 3.5 });
    }

    if (this.warningClearTimeout) clearTimeout(this.warningClearTimeout);
    this.warningClearTimeout = setTimeout(() => {
      this.activeWarning = null;
    }, 2800);
  }
}

export const calisthenicsPoseEngine = new CalisthenicsPoseEngine();
