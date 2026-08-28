export interface Point2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface BodyKeypoints {
  nose?: Point2D;
  leftShoulder?: Point2D;
  rightShoulder?: Point2D;
  leftElbow?: Point2D;
  rightElbow?: Point2D;
  leftWrist?: Point2D;
  rightWrist?: Point2D;
  leftHip?: Point2D;
  rightHip?: Point2D;
  leftKnee?: Point2D;
  rightKnee?: Point2D;
  leftAnkle?: Point2D;
  rightAnkle?: Point2D;
}

// MediaPipe 33 landmark index constants
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * Low-pass filter helper
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  constructor(private alpha: number = 0.5) {}

  public filter(value: number, alpha?: number): number {
    if (alpha !== undefined) this.alpha = alpha;
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.y = this.alpha * value + (1.0 - this.alpha) * this.s!;
    this.s = this.y;
    return this.y;
  }

  public last(): number {
    return this.y !== null ? this.y : 0;
  }

  public reset() {
    this.y = null;
    this.s = null;
  }
}

/**
 * One-Euro Filter for jitter-free real-time keypoint position tracking.
 * Dynamically adjusts cutoff frequency based on movement speed:
 * - Slow movements / static holds -> high smoothing (zero jitter)
 * - Rapid dynamic reps -> low smoothing (zero lag, crisp inflection points)
 */
export class OneEuroFilter {
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(
    private minCutoff: number = 1.0, // Minimum cutoff frequency in Hz
    private beta: number = 0.007,    // Speed coefficient
    private dCutoff: number = 1.0    // Derivative cutoff frequency
  ) {
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(value: number, timestampSecs: number): number {
    if (this.lastTime === null || timestampSecs <= this.lastTime) {
      this.lastTime = timestampSecs;
      return this.xFilter.filter(value);
    }

    const dt = Math.max(1e-4, Math.min(0.2, timestampSecs - this.lastTime));
    this.lastTime = timestampSecs;

    // Estimate derivative
    const prevValue = this.xFilter.last();
    const dValue = (value - prevValue) / dt;
    const edValue = this.dxFilter.filter(dValue, this.alpha(this.dCutoff, dt));

    // Dynamic cutoff frequency based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edValue);
    return this.xFilter.filter(value, this.alpha(cutoff, dt));
  }

  public reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Filter 3D Point using independent 1-Euro filters for X, Y, Z
 */
export class Point3DFilter {
  private xFilter = new OneEuroFilter(1.2, 0.008, 1.0);
  private yFilter = new OneEuroFilter(1.2, 0.008, 1.0);
  private zFilter = new OneEuroFilter(1.2, 0.008, 1.0);
  private visFilter = new LowPassFilter(0.4);

  public filter(pt?: Point2D, timestampSecs: number = Date.now() / 1000): Point2D | undefined {
    if (!pt) return undefined;

    const x = this.xFilter.filter(pt.x, timestampSecs);
    const y = this.yFilter.filter(pt.y, timestampSecs);
    const z = pt.z !== undefined ? this.zFilter.filter(pt.z, timestampSecs) : undefined;
    const visibility = pt.visibility !== undefined ? this.visFilter.filter(pt.visibility) : 1.0;

    return { x, y, z, visibility };
  }

  public reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
    this.visFilter.reset();
  }
}

/**
 * Body Keypoints One-Euro Filter Multi-Joint Manager
 */
export class BodyPoseFilter {
  private filters: Record<keyof BodyKeypoints, Point3DFilter> = {
    nose: new Point3DFilter(),
    leftShoulder: new Point3DFilter(),
    rightShoulder: new Point3DFilter(),
    leftElbow: new Point3DFilter(),
    rightElbow: new Point3DFilter(),
    leftWrist: new Point3DFilter(),
    rightWrist: new Point3DFilter(),
    leftHip: new Point3DFilter(),
    rightHip: new Point3DFilter(),
    leftKnee: new Point3DFilter(),
    rightKnee: new Point3DFilter(),
    leftAnkle: new Point3DFilter(),
    rightAnkle: new Point3DFilter(),
  };

  public filterKeypoints(kp: BodyKeypoints, timestampSecs: number): BodyKeypoints {
    const result: BodyKeypoints = {};
    (Object.keys(this.filters) as (keyof BodyKeypoints)[]).forEach((key) => {
      const filtered = this.filters[key].filter(kp[key], timestampSecs);
      if (filtered) {
        result[key] = filtered;
      }
    });
    return result;
  }

  public reset() {
    Object.values(this.filters).forEach((f) => f.reset());
  }
}

/**
 * Calculates 3D + 2D blended interior angle (in degrees 0-180) between three points: A -> B (vertex) -> C.
 * Uses true 3D spatial vector dot product when depth Z coordinates are available to eliminate perspective foreshortening.
 */
export function calculateJointAngle(a?: Point2D, b?: Point2D, c?: Point2D): number {
  if (!a || !b || !c) return 180;

  const aVis = a.visibility ?? 1.0;
  const bVis = b.visibility ?? 1.0;
  const cVis = c.visibility ?? 1.0;

  if (aVis < 0.25 || bVis < 0.25 || cVis < 0.25) {
    return 180;
  }

  // 3D vector calculations if Z is available and confident
  const hasZ = a.z !== undefined && b.z !== undefined && c.z !== undefined;
  if (hasZ && Math.min(aVis, bVis, cVis) > 0.4) {
    // Vector BA (from vertex B to A)
    const baX = a.x - b.x;
    const baY = a.y - b.y;
    const baZ = (a.z! - b.z!) * 1.2; // Scale Z aspect ratio

    // Vector BC (from vertex B to C)
    const bcX = c.x - b.x;
    const bcY = c.y - b.y;
    const bcZ = (c.z! - b.z!) * 1.2;

    const dot = baX * bcX + baY * bcY + baZ * bcZ;
    const magBA = Math.sqrt(baX * baX + baY * baY + baZ * baZ);
    const magBC = Math.sqrt(bcX * bcX + bcY * bcY + bcZ * bcZ);

    if (magBA > 1e-5 && magBC > 1e-5) {
      const cosAngle = Math.max(-1.0, Math.min(1.0, dot / (magBA * magBC)));
      const angle3D = (Math.acos(cosAngle) * 180.0) / Math.PI;

      // 2D projection angle
      const rad2D = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle2D = Math.abs((rad2D * 180.0) / Math.PI);
      if (angle2D > 180.0) angle2D = 360.0 - angle2D;

      // Blend 3D angle (80%) with 2D angle (20%) for robust stability
      const blended = angle3D * 0.8 + angle2D * 0.2;
      return Math.round(blended * 10) / 10;
    }
  }

  // 2D fallback
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * Calculates torso-hip-leg alignment angle (180 deg is straight line).
 */
export function calculateTorsoAlignmentAngle(shoulder?: Point2D, hip?: Point2D, ankle?: Point2D): number {
  if (!shoulder || !hip || !ankle) return 180;
  return calculateJointAngle(shoulder, hip, ankle);
}

/**
 * Extracts normalized body keypoints with anatomical kinematic imputation.
 * When hands/feet are partially occluded on the floor or off-screen,
 * estimates missing distal joints to maintain uninterrupted rep tracking!
 */
export function extractBodyKeypoints(rawLandmarks: any[]): BodyKeypoints {
  if (!rawLandmarks || rawLandmarks.length < 29) return {};

  const kp: BodyKeypoints = {
    nose: rawLandmarks[POSE_LANDMARKS.NOSE],
    leftShoulder: rawLandmarks[POSE_LANDMARKS.LEFT_SHOULDER],
    rightShoulder: rawLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
    leftElbow: rawLandmarks[POSE_LANDMARKS.LEFT_ELBOW],
    rightElbow: rawLandmarks[POSE_LANDMARKS.RIGHT_ELBOW],
    leftWrist: rawLandmarks[POSE_LANDMARKS.LEFT_WRIST],
    rightWrist: rawLandmarks[POSE_LANDMARKS.RIGHT_WRIST],
    leftHip: rawLandmarks[POSE_LANDMARKS.LEFT_HIP],
    rightHip: rawLandmarks[POSE_LANDMARKS.RIGHT_HIP],
    leftKnee: rawLandmarks[POSE_LANDMARKS.LEFT_KNEE],
    rightKnee: rawLandmarks[POSE_LANDMARKS.RIGHT_KNEE],
    leftAnkle: rawLandmarks[POSE_LANDMARKS.LEFT_ANKLE],
    rightAnkle: rawLandmarks[POSE_LANDMARKS.RIGHT_ANKLE],
  };

  // Anatomical Imputation for Occluded Wrists (e.g. hands planted flat on floor during pushups)
  if (kp.leftShoulder && kp.leftElbow && (!kp.leftWrist || (kp.leftWrist.visibility ?? 1) < 0.25)) {
    const dx = kp.leftElbow.x - kp.leftShoulder.x;
    const dy = kp.leftElbow.y - kp.leftShoulder.y;
    kp.leftWrist = {
      x: kp.leftElbow.x + dx * 0.9,
      y: kp.leftElbow.y + dy * 0.9,
      z: kp.leftElbow.z,
      visibility: 0.45,
    };
  }

  if (kp.rightShoulder && kp.rightElbow && (!kp.rightWrist || (kp.rightWrist.visibility ?? 1) < 0.25)) {
    const dx = kp.rightElbow.x - kp.rightShoulder.x;
    const dy = kp.rightElbow.y - kp.rightShoulder.y;
    kp.rightWrist = {
      x: kp.rightElbow.x + dx * 0.9,
      y: kp.rightElbow.y + dy * 0.9,
      z: kp.rightElbow.z,
      visibility: 0.45,
    };
  }

  // Anatomical Imputation for Occluded Ankles (e.g. feet off screen during floor pushups or pullups)
  if (kp.leftHip && kp.leftKnee && (!kp.leftAnkle || (kp.leftAnkle.visibility ?? 1) < 0.25)) {
    const dx = kp.leftKnee.x - kp.leftHip.x;
    const dy = kp.leftKnee.y - kp.leftHip.y;
    kp.leftAnkle = {
      x: kp.leftKnee.x + dx * 0.95,
      y: kp.leftKnee.y + dy * 0.95,
      z: kp.leftKnee.z,
      visibility: 0.45,
    };
  }

  if (kp.rightHip && kp.rightKnee && (!kp.rightAnkle || (kp.rightAnkle.visibility ?? 1) < 0.25)) {
    const dx = kp.rightKnee.x - kp.rightHip.x;
    const dy = kp.rightKnee.y - kp.rightHip.y;
    kp.rightAnkle = {
      x: kp.rightKnee.x + dx * 0.95,
      y: kp.rightKnee.y + dy * 0.95,
      z: kp.rightKnee.z,
      visibility: 0.45,
    };
  }

  return kp;
}

/**
 * Computes overall tracking quality score (0 - 100%) and count of fully locked joints
 */
export function evaluateTrackingQuality(kp: BodyKeypoints): {
  qualityScore: number;
  lockedJointsCount: number;
  totalJointsCount: number;
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  guidanceMessage: string | null;
} {
  const joints: (Point2D | undefined)[] = [
    kp.nose,
    kp.leftShoulder,
    kp.rightShoulder,
    kp.leftElbow,
    kp.rightElbow,
    kp.leftWrist,
    kp.rightWrist,
    kp.leftHip,
    kp.rightHip,
    kp.leftKnee,
    kp.rightKnee,
    kp.leftAnkle,
    kp.rightAnkle,
  ];

  let totalVis = 0;
  let lockedCount = 0;

  joints.forEach((j) => {
    if (j) {
      const v = j.visibility ?? 0.8;
      totalVis += v;
      if (v > 0.4) lockedCount++;
    }
  });

  const qualityScore = Math.round((totalVis / joints.length) * 100);

  let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'POOR';
  let guidanceMessage: string | null = null;

  if (qualityScore >= 80) {
    status = 'EXCELLENT';
  } else if (qualityScore >= 60) {
    status = 'GOOD';
  } else if (qualityScore >= 35) {
    status = 'FAIR';
    guidanceMessage = 'Step back slightly to bring your full body into camera view';
  } else {
    status = 'POOR';
    guidanceMessage = 'Position camera so upper body and limbs are clearly visible';
  }

  return {
    qualityScore,
    lockedJointsCount: lockedCount,
    totalJointsCount: joints.length,
    status,
    guidanceMessage,
  };
}

/**
 * Dominant Side Tracker with Hysteresis to prevent noisy frame-by-frame flipping
 */
export class DominantSideTracker {
  private currentDominant: 'left' | 'right' = 'left';
  private leftConfidenceCount = 0;
  private rightConfidenceCount = 0;
  private smoothedElbowLeft = 180;
  private smoothedElbowRight = 180;

  public getDominantSideAngles(kp: BodyKeypoints): {
    elbowAngle: number;
    hipAngle: number;
    kneeAngle: number;
    shoulderAngle: number;
    dominantSide: 'left' | 'right';
    leftElbow: number;
    rightElbow: number;
    leftHip: number;
    rightHip: number;
    trackingQuality: ReturnType<typeof evaluateTrackingQuality>;
  } {
    const leftVis =
      ((kp.leftShoulder?.visibility ?? 0) +
        (kp.leftElbow?.visibility ?? 0) +
        (kp.leftWrist?.visibility ?? 0)) /
      3;
    const rightVis =
      ((kp.rightShoulder?.visibility ?? 0) +
        (kp.rightElbow?.visibility ?? 0) +
        (kp.rightWrist?.visibility ?? 0)) /
      3;

    const leftElbow = calculateJointAngle(kp.leftShoulder, kp.leftElbow, kp.leftWrist);
    const rightElbow = calculateJointAngle(kp.rightShoulder, kp.rightElbow, kp.rightWrist);

    const leftHip = calculateJointAngle(
      kp.leftShoulder,
      kp.leftHip,
      kp.leftAnkle || kp.leftKnee
    );
    const rightHip = calculateJointAngle(
      kp.rightShoulder,
      kp.rightHip,
      kp.rightAnkle || kp.rightKnee
    );

    const leftKnee = calculateJointAngle(kp.leftHip, kp.leftKnee, kp.leftAnkle);
    const rightKnee = calculateJointAngle(kp.rightHip, kp.rightKnee, kp.rightAnkle);

    const leftShoulder = calculateJointAngle(kp.leftElbow, kp.leftShoulder, kp.leftHip);
    const rightShoulder = calculateJointAngle(kp.rightElbow, kp.rightShoulder, kp.rightHip);

    // Hysteresis side-switch logic: requires 4 consecutive frames of clear higher confidence (>0.12 delta)
    if (leftVis > rightVis + 0.12) {
      this.leftConfidenceCount++;
      this.rightConfidenceCount = 0;
      if (this.leftConfidenceCount >= 3) {
        this.currentDominant = 'left';
      }
    } else if (rightVis > leftVis + 0.12) {
      this.rightConfidenceCount++;
      this.leftConfidenceCount = 0;
      if (this.rightConfidenceCount >= 3) {
        this.currentDominant = 'right';
      }
    }

    const isLeft = this.currentDominant === 'left';
    const trackingQuality = evaluateTrackingQuality(kp);

    return {
      elbowAngle: isLeft ? leftElbow : rightElbow,
      hipAngle: isLeft ? leftHip : rightHip,
      kneeAngle: isLeft ? leftKnee : rightKnee,
      shoulderAngle: isLeft ? leftShoulder : rightShoulder,
      dominantSide: this.currentDominant,
      leftElbow,
      rightElbow,
      leftHip,
      rightHip,
      trackingQuality,
    };
  }

  public reset() {
    this.currentDominant = 'left';
    this.leftConfidenceCount = 0;
    this.rightConfidenceCount = 0;
  }
}

export const dominantSideTracker = new DominantSideTracker();
