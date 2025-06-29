import { Vector3, Quaternion, Object3D } from "three";
import { Landmark } from "@mediapipe/tasks-vision";

/**
 * A helper to get landmark vectors and correct their coordinate system.
 * @param landmark The landmark data from MediaPipe.
 * @returns A Vector3 in the correct coordinate space.
 */
export const getLandmarkVector = (landmark: Landmark): Vector3 => {
  // The coordinate system is flipped for VRM.
  return new Vector3(landmark.x, landmark.y, landmark.z);
};

/**
 * Applies a calculated rotation to a specific bone with smoothing.
 * @param bone The bone to rotate.
 * @param worldQuat The calculated rotation in world space.
 * @param parentWorldQuat The world rotation of the parent bone.
 * @param smoothingFactor How much to slerp (0-1).
 */
export const applyBoneRotation = (
  bone: Object3D | null,
  worldQuat: Quaternion,
  parentWorldQuat: Quaternion,
  smoothingFactor: number = 0.2
) => {
  if (!bone) return;

  // To get the bone's local rotation, we multiply the desired world rotation
  // by the inverse of the parent's world rotation.
  const localQuat = parentWorldQuat.clone().invert().multiply(worldQuat);
  bone.quaternion.slerp(localQuat, smoothingFactor);
};
