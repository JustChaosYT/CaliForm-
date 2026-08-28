import { BodyKeypoints, calculateJointAngle } from './poseGeometry';
import { RepPhase } from '../types/workout';

export type SkeletonVisualStyle = 'cyberpunk' | 'biomechanical' | 'minimal' | 'ghost_depth';

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  keypoints: BodyKeypoints;
  rawLandmarks?: any[];
  width: number;
  height: number;
  currentPhase: RepPhase;
  formScore: number;
  activeWarning?: string | null;
  dominantSide: 'left' | 'right';
  targetDepthAngle?: number;
  primaryJoint: 'elbow' | 'knee' | 'hip' | 'shoulder';
  visualStyle?: SkeletonVisualStyle;
  depthPercentage?: number;
  trackingQualityScore?: number;
  isCalibrated?: boolean;
}

const POSE_CONNECTIONS = [
  // Torso
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  // Left Arm
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  // Right Arm
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  // Left Leg
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  // Right Leg
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

export function renderSkeletonOverlay(options: RenderOptions) {
  const {
    ctx,
    keypoints,
    width,
    height,
    formScore,
    activeWarning,
    dominantSide,
    primaryJoint,
    visualStyle = 'cyberpunk',
    depthPercentage = 0,
  } = options;

  ctx.clearRect(0, 0, width, height);

  if (!keypoints.leftShoulder && !keypoints.rightShoulder) {
    return;
  }

  // Determine color theme based on form score & style
  let limbColor = '#10B981'; // Green
  let jointColor = '#34D399';
  let glowColor = 'rgba(16, 185, 129, 0.45)';

  if (visualStyle === 'minimal') {
    limbColor = '#38BDF8'; // Sky cyan
    jointColor = '#E0F2FE';
    glowColor = 'rgba(56, 189, 248, 0.25)';
  } else if (visualStyle === 'biomechanical') {
    if (activeWarning || formScore < 70) {
      limbColor = '#EF4444'; // Red
      jointColor = '#F87171';
      glowColor = 'rgba(239, 68, 68, 0.5)';
    } else if (formScore < 85) {
      limbColor = '#F59E0B'; // Amber
      jointColor = '#FBBF24';
      glowColor = 'rgba(245, 158, 11, 0.5)';
    } else {
      limbColor = '#10B981';
      jointColor = '#6EE7B7';
      glowColor = 'rgba(16, 185, 129, 0.5)';
    }
  } else {
    // Cyberpunk default
    if (activeWarning || formScore < 70) {
      limbColor = '#EF4444';
      jointColor = '#F87171';
      glowColor = 'rgba(239, 68, 68, 0.5)';
    } else if (formScore < 85) {
      limbColor = '#F59E0B';
      jointColor = '#FBBF24';
      glowColor = 'rgba(245, 158, 11, 0.5)';
    }
  }

  // Draw Optical Target Depth Guide Line (if Ghost Depth mode active)
  if (visualStyle === 'ghost_depth' || visualStyle === 'biomechanical') {
    const shoulder = dominantSide === 'left' ? keypoints.leftShoulder : keypoints.rightShoulder;
    const hip = dominantSide === 'left' ? keypoints.leftHip : keypoints.rightHip;
    if (shoulder && hip) {
      const guideY = (shoulder.y + (hip.y - shoulder.y) * 0.45) * height;
      const isDepthMet = depthPercentage >= 80;

      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(width * 0.08, guideY);
      ctx.lineTo(width * 0.92, guideY);
      ctx.strokeStyle = isDepthMet ? '#10B981' : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = isDepthMet ? 3 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = isDepthMet ? '#10B981' : '#94A3B8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        isDepthMet ? '✓ TARGET DEPTH PLANE REACHED' : '--- TARGET INFLECTION PLANE ---',
        width * 0.1,
        guideY - 8
      );
      ctx.restore();
    }
  }

  // Draw skeleton bones
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  POSE_CONNECTIONS.forEach(([fromKey, toKey]) => {
    const from = (keypoints as any)[fromKey];
    const to = (keypoints as any)[toKey];

    if (
      from &&
      to &&
      (from.visibility === undefined || from.visibility > 0.25) &&
      (to.visibility === undefined || to.visibility > 0.25)
    ) {
      const fromX = from.x * width;
      const fromY = from.y * height;
      const toX = to.x * width;
      const toY = to.y * height;

      // Glow line (cyberpunk / biomechanical)
      if (visualStyle !== 'minimal') {
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = visualStyle === 'cyberpunk' ? 10 : 8;
        ctx.stroke();
      }

      // Sharp core line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = limbColor;
      ctx.lineWidth = visualStyle === 'minimal' ? 2.5 : 4;
      ctx.stroke();
    }
  });

  // Draw joints
  Object.entries(keypoints).forEach(([key, pt]) => {
    if (!pt || (pt.visibility !== undefined && pt.visibility < 0.25)) return;

    const px = pt.x * width;
    const py = pt.y * height;

    const isPrimary =
      (primaryJoint === 'elbow' && (key === 'leftElbow' || key === 'rightElbow')) ||
      (primaryJoint === 'knee' && (key === 'leftKnee' || key === 'rightKnee')) ||
      (primaryJoint === 'hip' && (key === 'leftHip' || key === 'rightHip'));

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(px, py, isPrimary ? 10 : 6, 0, Math.PI * 2);
    ctx.fillStyle = isPrimary ? '#FFFFFF' : jointColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(px, py, isPrimary ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isPrimary ? limbColor : '#0F172A';
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Render Angle Callout Badges with Protractor Arcs
  const shoulder = dominantSide === 'left' ? keypoints.leftShoulder : keypoints.rightShoulder;
  const elbow = dominantSide === 'left' ? keypoints.leftElbow : keypoints.rightElbow;
  const wrist = dominantSide === 'left' ? keypoints.leftWrist : keypoints.rightWrist;
  const hip = dominantSide === 'left' ? keypoints.leftHip : keypoints.rightHip;
  const knee = dominantSide === 'left' ? keypoints.leftKnee : keypoints.rightKnee;
  const ankle = dominantSide === 'left' ? keypoints.leftAnkle : keypoints.rightAnkle;

  if (elbow && shoulder && wrist && (elbow.visibility ?? 1) > 0.25) {
    const angle = calculateJointAngle(shoulder, elbow, wrist);
    drawAngleBadge(
      ctx,
      elbow.x * width,
      elbow.y * height,
      `${Math.round(angle)}°`,
      primaryJoint === 'elbow',
      limbColor
    );
    if (primaryJoint === 'elbow') {
      drawProtractorArc(ctx, elbow.x * width, elbow.y * height, shoulder.x * width, shoulder.y * height, wrist.x * width, wrist.y * height, limbColor);
    }
  }

  if (hip && shoulder && ankle && (hip.visibility ?? 1) > 0.25) {
    const hipAngle = calculateJointAngle(shoulder, hip, ankle);
    drawAngleBadge(
      ctx,
      hip.x * width,
      hip.y * height,
      `${Math.round(hipAngle)}°`,
      primaryJoint === 'hip',
      limbColor
    );
  }

  if (knee && hip && ankle && (knee.visibility ?? 1) > 0.25) {
    const kneeAngle = calculateJointAngle(hip, knee, ankle);
    drawAngleBadge(
      ctx,
      knee.x * width,
      knee.y * height,
      `${Math.round(kneeAngle)}°`,
      primaryJoint === 'knee',
      limbColor
    );
    if (primaryJoint === 'knee') {
      drawProtractorArc(ctx, knee.x * width, knee.y * height, hip.x * width, hip.y * height, ankle.x * width, ankle.y * height, limbColor);
    }
  }

  ctx.restore();
}

/**
 * Draws a subtle biomechanical protractor arc between the two segments forming the joint angle
 */
function drawProtractorArc(
  ctx: CanvasRenderingContext2D,
  vx: number,
  vy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  color: string
) {
  const angleA = Math.atan2(ay - vy, ax - vx);
  const angleB = Math.atan2(by - vy, bx - vx);
  const radius = 28;

  ctx.save();
  ctx.beginPath();
  ctx.arc(vx, vy, radius, angleA, angleB, false);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([3, 3]);
  ctx.stroke();

  // Subtle filled sector
  ctx.beginPath();
  ctx.moveTo(vx, vy);
  ctx.arc(vx, vy, radius, angleA, angleB, false);
  ctx.closePath();
  ctx.fillStyle = color.startsWith('#') ? `${color}22` : 'rgba(16, 185, 129, 0.15)';
  ctx.fill();
  ctx.restore();
}

function drawAngleBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isHighlight: boolean,
  accentColor: string
) {
  ctx.save();
  const badgeWidth = isHighlight ? 56 : 46;
  const badgeHeight = isHighlight ? 26 : 22;
  const badgeX = x + 12;
  const badgeY = y - 12;

  // Background pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = isHighlight ? accentColor : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = isHighlight ? 2 : 1;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = isHighlight ? 'bold 13px system-ui, sans-serif' : '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
  ctx.restore();
}
