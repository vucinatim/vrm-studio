import * as THREE from "three";
import { clamp } from "three/src/math/MathUtils.js";
import { VRM } from "@pixiv/three-vrm";
import { Landmark } from "@mediapipe/tasks-vision";

/**
 * GazeSmoother class
 * * This class implements a more sophisticated smoothing mechanism to reduce jitter
 * from raw MediaPipe landmark data. It uses two techniques:
 * 1. A "dead zone" to ignore microscopic movements around the center.
 * 2. An Exponential Moving Average (EMA) to smooth the data over time.
 * * This should be instantiated ONCE outside of your animation loop.
 */
export class GazeSmoother {
  private smoothedGaze: { x: number; y: number };
  private smoothingFactor: number; // Alpha in EMA. Lower value = more smoothing.
  private deadZone: number; // The threshold below which movement is ignored.

  /**
   * @param smoothingFactor A value between 0 and 1. Lower values mean more smoothing but more latency. 0.3 is a good starting point.
   * @param deadZone A small value (e.g., 0.1) to prevent jitter when looking straight.
   */
  constructor(smoothingFactor: number = 0.3, deadZone: number = 0.1) {
    this.smoothedGaze = { x: 0, y: 0 };
    this.smoothingFactor = smoothingFactor;
    this.deadZone = deadZone;
  }

  /**
   * Processes the raw gaze data and returns a smoothed version.
   * @param rawGaze The raw {x, y} gaze data from calculateGaze.
   * @returns The smoothed {x, y} gaze data.
   */
  public smooth(rawGaze: { x: number; y: number } | null): {
    x: number;
    y: number;
  } {
    if (!rawGaze) {
      // If no gaze is detected, we can slowly return to center
      // by smoothing towards zero.
      rawGaze = { x: 0, y: 0 };
    }

    // 1. Apply dead zone to raw input
    const deadenedX = Math.abs(rawGaze.x) < this.deadZone ? 0 : rawGaze.x;
    const deadenedY = Math.abs(rawGaze.y) < this.deadZone ? 0 : rawGaze.y;

    // 2. Apply Exponential Moving Average (EMA) filter
    this.smoothedGaze.x =
      this.smoothingFactor * deadenedX +
      (1 - this.smoothingFactor) * this.smoothedGaze.x;
    this.smoothedGaze.y =
      this.smoothingFactor * deadenedY +
      (1 - this.smoothingFactor) * this.smoothedGaze.y;

    return this.smoothedGaze;
  }
}

// Helper function to get the 3D position of a landmark
const getLandmark = (landmarks: Landmark[], index: number): THREE.Vector3 => {
  const lm = landmarks[index];
  if (!lm) {
    throw new Error(`Facial landmark at index ${index} is missing.`);
  }
  return new THREE.Vector3(lm.x, lm.y, lm.z);
};

// Key landmark indices based on the MediaPipe 478-landmark face model
const P = {
  IRIS_L: 473,
  IRIS_R: 468,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  LEFT_EYE_LEFT_CORNER: 33,
  LEFT_EYE_RIGHT_CORNER: 133,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  RIGHT_EYE_LEFT_CORNER: 362,
  RIGHT_EYE_RIGHT_CORNER: 263,
};

/**
 * Calculates a normalized 2D gaze vector from face landmarks.
 */
export const calculateGaze = (
  landmarks: Landmark[]
): { x: number; y: number } | null => {
  if (landmarks.length < 478) return null;

  try {
    const irisL = getLandmark(landmarks, P.IRIS_L);
    const irisR = getLandmark(landmarks, P.IRIS_R);

    const lEyeLeft = getLandmark(landmarks, P.LEFT_EYE_LEFT_CORNER);
    const lEyeRight = getLandmark(landmarks, P.LEFT_EYE_RIGHT_CORNER);
    const lEyeTop = getLandmark(landmarks, P.LEFT_EYE_TOP);
    const lEyeBottom = getLandmark(landmarks, P.LEFT_EYE_BOTTOM);

    const rEyeLeft = getLandmark(landmarks, P.RIGHT_EYE_LEFT_CORNER);
    const rEyeRight = getLandmark(landmarks, P.RIGHT_EYE_RIGHT_CORNER);
    const rEyeTop = getLandmark(landmarks, P.RIGHT_EYE_TOP);
    const rEyeBottom = getLandmark(landmarks, P.RIGHT_EYE_BOTTOM);

    // --- FIX: Calculate eye center more accurately ---
    // The horizontal center is the midpoint between the left and right corners.
    // The vertical center is the midpoint between the top and bottom eyelids.
    const lEyeCenterX = (lEyeLeft.x + lEyeRight.x) / 2;
    const lEyeCenterY = (lEyeTop.y + lEyeBottom.y) / 2;
    const lEyeCenter = new THREE.Vector3(
      lEyeCenterX,
      lEyeCenterY,
      (lEyeLeft.z + lEyeRight.z + lEyeTop.z + lEyeBottom.z) / 4
    );

    const rEyeCenterX = (rEyeLeft.x + rEyeRight.x) / 2;
    const rEyeCenterY = (rEyeTop.y + rEyeBottom.y) / 2;
    const rEyeCenter = new THREE.Vector3(
      rEyeCenterX,
      rEyeCenterY,
      (rEyeLeft.z + rEyeRight.z + rEyeTop.z + rEyeBottom.z) / 4
    );

    const lEyeHWidth = lEyeLeft.distanceTo(lEyeRight);
    const lEyeVHeight = lEyeTop.distanceTo(lEyeBottom);
    const rEyeHWidth = rEyeLeft.distanceTo(rEyeRight);
    const rEyeVHeight = rEyeTop.distanceTo(rEyeBottom);

    const avgHWidth = (lEyeHWidth + rEyeHWidth) / 2;
    const avgVHeight = (lEyeVHeight + rEyeVHeight) / 2;

    const lGazeRaw = new THREE.Vector2(
      irisL.x - lEyeCenter.x,
      irisL.y - lEyeCenter.y
    );
    const rGazeRaw = new THREE.Vector2(
      irisR.x - rEyeCenter.x,
      irisR.y - rEyeCenter.y
    );

    const avgGaze = lGazeRaw.add(rGazeRaw).multiplyScalar(0.5);
    const normalizedGazeX = avgGaze.x / avgHWidth;
    const normalizedGazeY = avgGaze.y / avgVHeight;

    const sensitivity = 8;

    return {
      x: clamp(normalizedGazeX * sensitivity, -1, 1),
      y: clamp(normalizedGazeY * sensitivity * -1, -1, 1),
    };
  } catch (e) {
    console.error("Error calculating gaze:", e);
    return null;
  }
};

/**
 * Applies the calculated gaze to a VRM model's lookAt target, creating pupil movement.
 * @param vrm - The VRM model instance from @pixiv/three-vrm.
 * @param landmarks - An array of face landmarks.
 * @param gazeSmoother - An instance of the GazeSmoother class.
 */
export const rigPupils = (
  vrm: VRM,
  landmarks: Landmark[],
  gazeSmoother: GazeSmoother, // The smoother is now a required parameter
  smoothingFactor: number
) => {
  if (!vrm.lookAt?.target) return;

  const rawGaze = calculateGaze(landmarks);
  const gaze = gazeSmoother.smooth(rawGaze);

  if (gaze) {
    const target = vrm.lookAt.target as THREE.Object3D;

    const horizontalMovementScale = 10;
    const verticalMovementScale = 10;
    const forwardDistance = 1.5;

    // Note: The user inverted the horizontal movement (-gaze.x). This is preserved.
    const newPosition = new THREE.Vector3(
      -gaze.x * horizontalMovementScale,
      gaze.y * verticalMovementScale + 1.5,
      -forwardDistance
    );

    // The smoothing is handled by GazeSmoother, so we apply the position directly.
    target.position.lerp(newPosition, smoothingFactor * 0.5);
  }
};

/*
// --- USAGE EXAMPLE ---

// In your main application setup (run once)
const gazeSmoother = new GazeSmoother(0.3, 0.1);

// In your animation loop (requestAnimationFrame)
function animate() {
  // ... get new landmarks from MediaPipe ...
  const landmarks = getLatestLandmarks();
  const myVrmModel = getMyVrmModel();

  rigPupils(myVrmModel, landmarks, gazeSmoother);

  requestAnimationFrame(animate);
}

*/
