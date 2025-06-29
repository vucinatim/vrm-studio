import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Quaternion } from "three";
import { Landmark } from "@mediapipe/tasks-vision";

/**
 * Applies pose tracking data to a VRM model.
 * This function handles rigging the spine, arms, and legs based on
 * poseWorldLandmarks from MediaPipe.
 *
 * @param vrm The target VRM model.
 * @param poseWorldLandmarks An array of 3D world landmarks for the pose.
 * @param options Configuration to enable or disable specific parts of the rigging.
 * @param smoothingFactor A value between 0 and 1 for smoothing the rotation.
 */
export const rigPose = (
  vrm: VRM,
  poseWorldLandmarks: Landmark[],
  options: { enableLegs: boolean },
  smoothingFactor: number
) => {
  if (!vrm.humanoid) return;

  // A helper to get landmark vectors and correct their coordinate system.
  const getLandmark = (index: number): Vector3 | null => {
    const landmark = poseWorldLandmarks[index];
    if (!landmark) return null;
    return new Vector3(-landmark.x, -landmark.y, landmark.z);
  };

  // Get all necessary landmarks
  const lm = {
    lShoulder: getLandmark(11),
    rShoulder: getLandmark(12),
    lElbow: getLandmark(13),
    rElbow: getLandmark(14),
    lWrist: getLandmark(15),
    rWrist: getLandmark(16),
    lHip: getLandmark(23),
    rHip: getLandmark(24),
    lKnee: getLandmark(25),
    rKnee: getLandmark(26),
    lAnkle: getLandmark(27),
    rAnkle: getLandmark(28),
  };

  // Check for missing landmarks
  if (Object.values(lm).some((v) => v === null)) {
    return;
  }

  // Prevent arms from crossing over the body, which can be an artifact.
  if (lm.lElbow) lm.lElbow.x = Math.min(0, lm.lElbow.x);
  if (lm.lWrist) lm.lWrist.x = Math.min(0, lm.lWrist.x);
  if (lm.rElbow) lm.rElbow.x = Math.max(0, lm.rElbow.x);
  if (lm.rWrist) lm.rWrist.x = Math.max(0, lm.rWrist.x);

  /**
   * Calculates the rotation required to align a limb from a rest direction
   * to the target direction defined by two points.
   * @param p1 The starting point of the limb.
   * @param p2 The ending point of the limb.
   * @param restDirection The limb's default "at rest" direction.
   */
  const getLimbQuaternion = (
    p1: Vector3,
    p2: Vector3,
    restDirection: Vector3
  ): Quaternion => {
    const direction = new Vector3().subVectors(p2, p1).normalize();
    return new Quaternion().setFromUnitVectors(restDirection, direction);
  };

  /**
   * Applies a calculated rotation to a specific bone.
   * @param boneName The name of the bone to rotate.
   * @param worldQuat The calculated rotation in world space.
   * @param parentWorldQuat Optional parent rotation to calculate local space.
   * @param smoothing The smoothing factor to apply (slerp).
   */
  const setBoneRotation = (
    boneName: VRMHumanBoneName,
    worldQuat: Quaternion,
    parentWorldQuat?: Quaternion,
    smoothing: number = smoothingFactor
  ) => {
    const bone = vrm.humanoid?.getNormalizedBoneNode(boneName);
    if (!bone) return;

    let localQuat = worldQuat.clone();
    if (parentWorldQuat) {
      const parentInverse = parentWorldQuat.clone().invert();
      localQuat = parentInverse.multiply(localQuat);
    }
    bone.quaternion.slerp(localQuat, smoothing);
  };

  const armRestDirectionL = new Vector3(-1, 0, 0);
  const armRestDirectionR = new Vector3(1, 0, 0);
  const legRestDirection = new Vector3(0, -1, 0);

  // --- Upper Body ---
  const quatUpperArmL = getLimbQuaternion(
    lm.lShoulder!,
    lm.lElbow!,
    armRestDirectionL
  );
  const quatUpperArmR = getLimbQuaternion(
    lm.rShoulder!,
    lm.rElbow!,
    armRestDirectionR
  );
  const quatLowerArmL = getLimbQuaternion(
    lm.lElbow!,
    lm.lWrist!,
    armRestDirectionL
  );
  const quatLowerArmR = getLimbQuaternion(
    lm.rElbow!,
    lm.rWrist!,
    armRestDirectionR
  );

  setBoneRotation(VRMHumanBoneName.LeftUpperArm, quatUpperArmL);
  setBoneRotation(VRMHumanBoneName.RightUpperArm, quatUpperArmR);
  setBoneRotation(VRMHumanBoneName.LeftLowerArm, quatLowerArmL, quatUpperArmL);
  setBoneRotation(VRMHumanBoneName.RightLowerArm, quatLowerArmR, quatUpperArmR);

  // --- Lower Body ---
  if (options.enableLegs) {
    const quatUpperLegL = getLimbQuaternion(
      lm.lHip!,
      lm.lKnee!,
      legRestDirection
    );
    const quatUpperLegR = getLimbQuaternion(
      lm.rHip!,
      lm.rKnee!,
      legRestDirection
    );
    const quatLowerLegL = getLimbQuaternion(
      lm.lKnee!,
      lm.lAnkle!,
      legRestDirection
    );
    const quatLowerLegR = getLimbQuaternion(
      lm.rKnee!,
      lm.rAnkle!,
      legRestDirection
    );

    setBoneRotation(VRMHumanBoneName.LeftUpperLeg, quatUpperLegL);
    setBoneRotation(VRMHumanBoneName.RightUpperLeg, quatUpperLegR);
    setBoneRotation(
      VRMHumanBoneName.LeftLowerLeg,
      quatLowerLegL,
      quatUpperLegL
    );
    setBoneRotation(
      VRMHumanBoneName.RightLowerLeg,
      quatLowerLegR,
      quatUpperLegR
    );
  }

  // --- Spine ---
  const shoulderCenter = lm
    .lShoulder!.clone()
    .add(lm.rShoulder!)
    .multiplyScalar(0.5);
  const hipCenter = lm.lHip!.clone().add(lm.rHip!).multiplyScalar(0.5);
  const spineDirection = new Vector3()
    .subVectors(shoulderCenter, hipCenter)
    .normalize();
  const upVector = new Vector3(0, 1, 0);

  // Calculate forward lean (bend)
  const leanAngle = spineDirection.angleTo(upVector);
  const leanThreshold = 0.17; // ~10 degrees dead zone
  const quatSpineBend = new Quaternion();
  if (leanAngle > leanThreshold) {
    const bendAxis = new Vector3()
      .crossVectors(upVector, spineDirection)
      .normalize();
    const dampenedAngle = (leanAngle - leanThreshold) * 0.5; // Dampen for subtle movement
    quatSpineBend.setFromAxisAngle(bendAxis, dampenedAngle);
  }

  // Calculate torso twist
  const shoulderVector = new Vector3()
    .subVectors(lm.rShoulder!, lm.lShoulder!)
    .normalize();
  const hipVector = new Vector3().subVectors(lm.rHip!, lm.lHip!).normalize();
  const forward = new Vector3(0, 0, -1);
  const quatShoulders = new Quaternion().setFromUnitVectors(
    forward,
    shoulderVector
  );
  const quatHips = new Quaternion().setFromUnitVectors(forward, hipVector);
  const quatSpineTwist = quatHips.clone().invert().multiply(quatShoulders);

  // Combine bend and twist
  const quatSpine = quatSpineBend.multiply(quatSpineTwist);

  // Distribute rotation among spine, chest, and upper chest bones
  const spineSmoothing = 0.4;
  const quatSpinePart = new Quaternion().slerp(quatSpine, 0.3);
  const quatChestPart = new Quaternion().slerp(quatSpine, 0.4);

  setBoneRotation(
    VRMHumanBoneName.Spine,
    quatSpinePart,
    undefined,
    spineSmoothing
  );
  setBoneRotation(
    VRMHumanBoneName.Chest,
    quatChestPart,
    quatSpinePart,
    spineSmoothing
  );
  setBoneRotation(
    VRMHumanBoneName.UpperChest,
    quatSpine,
    quatChestPart,
    spineSmoothing
  );
};
