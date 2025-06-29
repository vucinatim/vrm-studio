import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3 } from "three";
import { Landmark } from "@mediapipe/tasks-vision";
import { rigTorso } from "./torso-rigging";
import { rigLimbs } from "./limb-rigging";
import { getLandmarkVector } from "./ik-utils";

export interface LandmarkData {
  lShoulder: Vector3;
  rShoulder: Vector3;
  lElbow: Vector3;
  rElbow: Vector3;
  lWrist: Vector3;
  rWrist: Vector3;
  lHip: Vector3;
  rHip: Vector3;
  lKnee: Vector3;
  rKnee: Vector3;
  lAnkle: Vector3;
  rAnkle: Vector3;
}

/**
 * Applies pose tracking to a VRM model using a simple IK solver.
 * @param vrm The target VRM model.
 * @param poseWorldLandmarks An array of 3D world landmarks for the pose.
 * @param options Configuration for the rigging.
 */
export const rigPose = (
  vrm: VRM,
  poseWorldLandmarks: Landmark[],
  options: { enableLegs: boolean }
) => {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  // --- 1. Get Bones and Initial State ---
  const bones = {
    hips: humanoid.getNormalizedBoneNode(VRMHumanBoneName.Hips),
    spine: humanoid.getNormalizedBoneNode(VRMHumanBoneName.Spine),
    chest: humanoid.getNormalizedBoneNode(VRMHumanBoneName.Chest),
    upperChest: humanoid.getNormalizedBoneNode(VRMHumanBoneName.UpperChest),
    leftUpperArm: humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm),
    rightUpperArm: humanoid.getNormalizedBoneNode(
      VRMHumanBoneName.RightUpperArm
    ),
    leftLowerArm: humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm),
    rightLowerArm: humanoid.getNormalizedBoneNode(
      VRMHumanBoneName.RightLowerArm
    ),
    leftUpperLeg: humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg),
    rightUpperLeg: humanoid.getNormalizedBoneNode(
      VRMHumanBoneName.RightUpperLeg
    ),
    leftLowerLeg: humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerLeg),
    rightLowerLeg: humanoid.getNormalizedBoneNode(
      VRMHumanBoneName.RightLowerLeg
    ),
  };

  const boneLengths = {
    arm: bones.leftLowerArm!.position.length(),
    forearm: bones.rightLowerArm!.position.length(),
    leg: bones.leftLowerLeg!.position.length(),
    shin: bones.rightLowerLeg!.position.length(),
  };

  // --- 2. Get Landmark Targets ---
  const lm: LandmarkData = {
    lShoulder: getLandmarkVector(poseWorldLandmarks[11]),
    rShoulder: getLandmarkVector(poseWorldLandmarks[12]),
    lElbow: getLandmarkVector(poseWorldLandmarks[13]),
    rElbow: getLandmarkVector(poseWorldLandmarks[14]),
    lWrist: getLandmarkVector(poseWorldLandmarks[15]),
    rWrist: getLandmarkVector(poseWorldLandmarks[16]),
    lHip: getLandmarkVector(poseWorldLandmarks[23]),
    rHip: getLandmarkVector(poseWorldLandmarks[24]),
    lKnee: getLandmarkVector(poseWorldLandmarks[25]),
    rKnee: getLandmarkVector(poseWorldLandmarks[26]),
    lAnkle: getLandmarkVector(poseWorldLandmarks[27]),
    rAnkle: getLandmarkVector(poseWorldLandmarks[28]),
  };

  // Prevent arms from crossing over, a common tracking artifact.
  lm.lElbow.x = Math.min(0, lm.lElbow.x);
  lm.lWrist.x = Math.min(0, lm.lWrist.x);
  lm.rElbow.x = Math.max(0, lm.rElbow.x);
  lm.rWrist.x = Math.max(0, lm.rWrist.x);

  // --- 3. Rig Torso ---
  rigTorso(vrm, lm, {
    hips: bones.hips,
    spine: bones.spine,
    chest: bones.chest,
    upperChest: bones.upperChest,
  });

  // --- 4. Rig Limbs ---
  rigLimbs(
    vrm,
    lm,
    {
      leftUpperArm: bones.leftUpperArm,
      rightUpperArm: bones.rightUpperArm,
      leftLowerArm: bones.leftLowerArm,
      rightLowerArm: bones.rightLowerArm,
      leftUpperLeg: bones.leftUpperLeg,
      rightUpperLeg: bones.rightUpperLeg,
      leftLowerLeg: bones.leftLowerLeg,
      rightLowerLeg: bones.rightLowerLeg,
    },
    boneLengths,
    options
  );
};
