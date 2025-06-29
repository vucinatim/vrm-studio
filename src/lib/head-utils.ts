import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Matrix4 } from "three";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { Quaternion, MathUtils } from "three";

// Key landmark indices from MediaPipe FaceLandmarker
const NOSE_TIP = 1;
const CHIN_BOTTOM = 152;
const LEFT_TEMPLE = 234;
const RIGHT_TEMPLE = 454;

/**
 * Calculates a quaternion representing the head's rotation from face landmarks.
 * This version correctly handles all three axes of rotation (pitch, yaw, roll).
 * @param landmarks - An array of normalized landmarks from MediaPipe FaceLandmarker.
 * @returns A THREE.Quaternion representing the head's rotation in world space.
 */
const getHeadQuaternion = (landmarks: NormalizedLandmark[]): Quaternion => {
  if (landmarks.length < RIGHT_TEMPLE + 1) {
    return new Quaternion();
  }

  // --- 1. Get Key Landmark Positions in 3D Space ---
  // The 'y' coordinate is negated to align MediaPipe's screen-based
  // coordinate system (y-down) with Three.js's 3D world space (y-up).
  const pNose = new Vector3(
    -landmarks[NOSE_TIP].x,
    -landmarks[NOSE_TIP].y,
    landmarks[NOSE_TIP].z
  );
  const pChin = new Vector3(
    -landmarks[CHIN_BOTTOM].x,
    -landmarks[CHIN_BOTTOM].y,
    landmarks[CHIN_BOTTOM].z
  );
  const pLeftTemple = new Vector3(
    -landmarks[LEFT_TEMPLE].x,
    -landmarks[LEFT_TEMPLE].y,
    landmarks[LEFT_TEMPLE].z
  );
  const pRightTemple = new Vector3(
    -landmarks[RIGHT_TEMPLE].x,
    -landmarks[RIGHT_TEMPLE].y,
    landmarks[RIGHT_TEMPLE].z
  );

  // --- 2. Define the Primary Directional Vectors ---

  // The center point between the temples is a stable reference for the center of the head.
  const midPointTemples = new Vector3()
    .addVectors(pLeftTemple, pRightTemple)
    .multiplyScalar(0.5);

  // The 'forward' vector is crucial for YAW. It's the direction perpendicular
  // to the plane of the face. We can estimate this by pointing from the center
  // of the head (temple midpoint) to the nose.
  // The 'z' difference between the nose and temples is the most important factor for yaw.
  const forward = new Vector3().subVectors(pNose, midPointTemples).normalize();

  // The 'up' vector is initially defined by the line from the center of the head to the chin.
  // We use the chin instead of the forehead as it tends to be more stable relative to the temples.
  // We make it negative because chin is below the center.
  const upRough = new Vector3().subVectors(midPointTemples, pChin).normalize();

  // --- 3. Create a True Orthogonal Basis ---
  // The vectors we calculated above are not guaranteed to be perfectly perpendicular.
  // We use cross-products to create a clean, orthogonal (90-degree) basis.

  // The 'right' vector is perpendicular to both the rough up and forward vectors.
  // This correctly captures the roll/tilt of the head.
  const right = new Vector3().crossVectors(upRough, forward).normalize();

  // The final 'up' vector is recalculated to be perfectly perpendicular to the
  // 'right' and 'forward' vectors.
  const up = new Vector3().crossVectors(forward, right).normalize();

  // --- 4. Construct the Rotation Matrix ---
  // A rotation matrix is created from our three orthogonal basis vectors.
  // We use the original calculated 'forward' vector. In Three.js, cameras
  // and objects look down the negative Z axis, so we must negate our forward vector
  // to align the model's gaze correctly.
  const matrix = new Matrix4().makeBasis(right, up, forward.negate());

  // If we dont do this exactly like this, the left and right look wont animate at all
  matrix.scale(new Vector3(-1, 1, 1));

  // --- 5. Convert to Quaternion ---
  return new Quaternion().setFromRotationMatrix(matrix);
};

/**
 * Applies the calculated head rotation to a VRM model's head bone.
 * This function correctly handles the bone hierarchy by converting the
 * world-space rotation into the head bone's local space.
 * @param vrm - The target VRM model.
 * @param landmarks - The facial landmarks for the current frame.
 * @param smoothingFactor - A value between 0 and 1 to smooth the rotation.
 */
/**
 * Applies the calculated head rotation to a VRM model's head bone.
 * This version uses a HeadSmoother instance to reduce jitter and wobbling.
 * @param vrm - The target VRM model.
 * @param landmarks - The facial landmarks for the current frame.
 * @param headSmoother - An instance of the HeadSmoother class.
 */
export const rigHead = (
  vrm: VRM,
  landmarks: NormalizedLandmark[],
  headSmoother: HeadSmoother // REMOVED the extra smoothingFactor parameter
) => {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const headBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  const neckBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  if (!headBone || !neckBone) return;

  const rawHeadWorldQuaternion = getHeadQuaternion(landmarks);

  const smoothedHeadWorldQuaternion = headSmoother.smooth(
    rawHeadWorldQuaternion
  );

  const parentWorldQuaternion = new Quaternion();
  neckBone.getWorldQuaternion(parentWorldQuaternion);

  const localHeadQuaternion = parentWorldQuaternion
    .invert()
    .multiply(smoothedHeadWorldQuaternion);

  // **CRITICAL CHANGE**: Apply the result directly.
  // The smoothing is already done.
  headBone.quaternion.copy(localHeadQuaternion);
};

/**
 * HeadSmoother class (V4 - Velocity-Based)
 *
 * This version implements the user's suggestion of reacting to the *change*
 * in rotation (velocity) rather than the position. It is the most robust
 * and intuitive method, as it requires no calibration.
 *
 * - It applies strong smoothing when the head is still.
 * - It becomes responsive when the head moves quickly.
 */
export class HeadSmoother {
  // Smoothed result
  private smoothedQuaternion: Quaternion;
  // State for tracking velocity
  private lastRawQuaternion: Quaternion | null;

  private maxSmoothingFactor: number;
  private minSmoothingFactor: number;
  // The new threshold based on rotational speed (radians per frame)
  private velocityThreshold: number;

  /**
   * @param maxSmoothingFactor The responsiveness for intentional movements (e.g., 0.5).
   * @param minSmoothingFactor The strong smoothing factor for stillness (e.g., 0.05).
   * @param velocityThreshold The speed (in radians per frame) above which the head is considered "moving" (e.g., 0.002).
   */
  constructor(
    maxSmoothingFactor: number = 0.05,
    minSmoothingFactor: number = 0.05,
    velocityThreshold: number = 0.002
  ) {
    this.smoothedQuaternion = new Quaternion();
    this.lastRawQuaternion = null; // Initialize as null to handle the first frame

    this.maxSmoothingFactor = maxSmoothingFactor;
    this.minSmoothingFactor = minSmoothingFactor;
    this.velocityThreshold = velocityThreshold;
  }

  /**
   * Processes the raw head quaternion and returns a smoothed version.
   * @param rawQuaternion The raw THREE.Quaternion from getHeadQuaternion.
   * @returns The smoothed THREE.Quaternion.
   */
  public smooth(rawQuaternion: Quaternion | null): Quaternion {
    if (!rawQuaternion) {
      // If we lose tracking, just return the last known good rotation.
      return this.smoothedQuaternion.clone();
    }

    // On the very first frame with data, initialize everything.
    if (!this.lastRawQuaternion) {
      this.lastRawQuaternion = new Quaternion().copy(rawQuaternion);
      this.smoothedQuaternion.copy(rawQuaternion);
      return this.smoothedQuaternion.clone();
    }

    // --- Core Logic: Velocity-Based Smoothing ---

    // 1. Calculate the speed of rotation since the last frame.
    const rotationalVelocity = rawQuaternion.angleTo(this.lastRawQuaternion);

    // 2. Normalize the velocity to a 0-1 range based on the threshold.
    const t = Math.min(rotationalVelocity / this.velocityThreshold, 1.0);

    // 3. Interpolate the smoothing factor based on this speed.
    // Still (t=0) -> minSmoothingFactor
    // Moving (t=1) -> maxSmoothingFactor
    const dynamicFactor = MathUtils.lerp(
      this.minSmoothingFactor,
      this.maxSmoothingFactor,
      t
    );

    // 4. Apply the smoothing.
    this.smoothedQuaternion.slerp(rawQuaternion, dynamicFactor);

    // 5. Update the last known raw rotation for the next frame's calculation.
    this.lastRawQuaternion.copy(rawQuaternion);

    return this.smoothedQuaternion.clone();
  }
}
