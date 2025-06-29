import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Matrix4, Quaternion } from "three";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Key landmark indices from MediaPipe FaceLandmarker
const NOSE_TIP = 1;
const CHIN_BOTTOM = 152;
const LEFT_TEMPLE = 234;
const RIGHT_TEMPLE = 454;

/**
 * Calculates a quaternion representing the head's rotation from face landmarks.
 * This version assumes the landmarks are ALREADY in the correct Three.js coordinate system.
 * @param landmarks - An array of normalized landmarks.
 * @returns A THREE.Quaternion representing the head's rotation in world space.
 */
const getHeadQuaternion = (landmarks: NormalizedLandmark[]): Quaternion => {
  if (landmarks.length < RIGHT_TEMPLE + 1) {
    return new Quaternion();
  }

  // --- 1. Get Key Landmark Positions ---
  // The coordinate transformation is now handled in the worker, so we can use the values directly.
  const pNose = new Vector3(
    landmarks[NOSE_TIP].x,
    landmarks[NOSE_TIP].y,
    landmarks[NOSE_TIP].z
  );
  const pChin = new Vector3(
    landmarks[CHIN_BOTTOM].x,
    landmarks[CHIN_BOTTOM].y,
    landmarks[CHIN_BOTTOM].z
  );
  const pLeftTemple = new Vector3(
    landmarks[LEFT_TEMPLE].x,
    landmarks[LEFT_TEMPLE].y,
    landmarks[LEFT_TEMPLE].z
  );
  const pRightTemple = new Vector3(
    landmarks[RIGHT_TEMPLE].x,
    landmarks[RIGHT_TEMPLE].y,
    landmarks[RIGHT_TEMPLE].z
  );

  // --- 2. Define the Primary Directional Vectors ---
  const midPointTemples = new Vector3()
    .addVectors(pLeftTemple, pRightTemple)
    .multiplyScalar(0.5);
  const forward = new Vector3().subVectors(pNose, midPointTemples).normalize();
  const upRough = new Vector3().subVectors(midPointTemples, pChin).normalize();

  // --- 3. Create a True Orthogonal Basis ---
  const right = new Vector3().crossVectors(upRough, forward).normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();

  // --- 4. Construct the Rotation Matrix ---
  // The forward vector is negated to align with Three.js's -Z forward direction.
  const matrix = new Matrix4().makeBasis(right, up, forward.negate());
  matrix.scale(new Vector3(-1, 1, 1));

  // --- 5. Convert to Quaternion ---
  return new Quaternion().setFromRotationMatrix(matrix);
};

/**
 * Applies the calculated head rotation to a VRM model's head bone.
 * @param vrm - The target VRM model.
 * @param landmarks - The facial landmarks for the current frame.
 * @param smoothingFactor - The amount of smoothing to apply (0-1).
 */
export const rigHead = (
  vrm: VRM,
  landmarks: NormalizedLandmark[],
  smoothingFactor: number
) => {
  const humanoid = vrm.humanoid;
  if (!humanoid || landmarks.length === 0) return;

  const headBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  // Getting the neck's parent (UpperChest) to correctly calculate local rotation
  const neckBone = humanoid.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  if (!headBone || !neckBone) return;

  // Calculate the head's rotation in world space from landmarks
  const worldHeadQuaternion = getHeadQuaternion(landmarks);

  // To correctly apply rotation, we need the world rotation of the head's PARENT bone (the neck)
  const parentWorldQuaternion = new Quaternion();
  neckBone.getWorldQuaternion(parentWorldQuaternion);

  // Calculate the head's local rotation relative to its parent (the neck)
  const localHeadQuaternion = parentWorldQuaternion
    .invert()
    .multiply(worldHeadQuaternion);

  // Smoothly interpolate towards the new local rotation
  headBone.quaternion.slerp(localHeadQuaternion, smoothingFactor);
};
