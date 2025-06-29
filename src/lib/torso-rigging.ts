import { VRM } from "@pixiv/three-vrm";
import { Vector3, Quaternion, Matrix4, Object3D } from "three";
import { applyBoneRotation } from "./ik-utils";
import { LandmarkData } from "./pose-utils";

interface Bones {
  hips: Object3D | null;
  spine: Object3D | null;
  chest: Object3D | null;
  upperChest: Object3D | null;
}

// A constant to easily enable or disable forward/backward leaning.
const ENABLE_FORWARD_LEAN = false;

export const rigTorso = (vrm: VRM, lm: LandmarkData, bones: Bones) => {
  if (!bones.hips || !bones.spine) return;

  // Calculate hip and shoulder centers in world space from landmarks
  const hipCenter = new Vector3()
    .addVectors(lm.lHip, lm.rHip)
    .multiplyScalar(0.5);
  const shoulderCenter = new Vector3()
    .addVectors(lm.lShoulder, lm.rShoulder)
    .multiplyScalar(0.5);

  // Move the hips bone to the tracked hip center position
  if (bones.hips && bones.hips.parent) {
    const parentInverseWorld = new Matrix4()
      .copy(bones.hips.parent.matrixWorld)
      .invert();
    const localTargetPosition = hipCenter
      .clone()
      .applyMatrix4(parentInverseWorld);

    // Only apply X and Z movement to hips to prevent sinking
    bones.hips.position.lerp(
      new Vector3(
        localTargetPosition.x,
        bones.hips.position.y,
        localTargetPosition.z
      ),
      0.1
    );
  }

  // Update world matrix of hips before calculating spine rotation
  bones.hips?.updateWorldMatrix(true, false);

  // Calculate the spine's lean
  const spineDirection = new Vector3().subVectors(shoulderCenter, hipCenter);

  // --- FIX: Use constant to control forward lean ---
  if (!ENABLE_FORWARD_LEAN) {
    spineDirection.z = 0;
  } else {
    // Dampen forward lean if it is enabled
    spineDirection.z *= 0.4;
  }
  spineDirection.normalize();

  const upVector = new Vector3(0, 1, 0);
  const leanQuat = new Quaternion().setFromUnitVectors(
    upVector,
    spineDirection
  );

  // Isolate Twist from Lean
  const shoulderDirection = new Vector3().subVectors(
    lm.rShoulder,
    lm.lShoulder
  );
  shoulderDirection.y = 0;
  shoulderDirection.normalize();

  const hipsDirection = new Vector3().subVectors(lm.rHip, lm.lHip);
  hipsDirection.y = 0;
  hipsDirection.normalize();

  const rightVector = new Vector3(1, 0, 0);
  const quatShoulders = new Quaternion().setFromUnitVectors(
    rightVector,
    shoulderDirection
  );
  const quatHips = new Quaternion().setFromUnitVectors(
    rightVector,
    hipsDirection
  );
  const twistQuat = quatHips.clone().invert().multiply(quatShoulders);

  // Combine lean and twist
  const spineQuat = leanQuat.multiply(twistQuat);

  // Distribute rotation among spine, chest, and upper chest for a more natural bend
  const spineParentRot = bones.spine!.parent!.getWorldQuaternion(
    new Quaternion()
  );

  applyBoneRotation(bones.spine, spineQuat, spineParentRot);
  applyBoneRotation(bones.chest, spineQuat, spineParentRot);
  applyBoneRotation(bones.upperChest, spineQuat, spineParentRot);

  // Update matrices of the upper body to get the correct world positions for the limbs
  bones.upperChest?.updateWorldMatrix(true, true);
};
