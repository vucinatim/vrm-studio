import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Quaternion, Matrix4, Euler } from "three";
import { Landmark } from "@mediapipe/tasks-vision";
import { applyBoneRotation } from "./ik-utils";
import { getLandmarkVector } from "./ik-utils";

// --- MAPPING CONSTANTS ---
// Using separate, explicit maps for each hand.
const LEFT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.LeftThumbMetacarpal, lm: [1, 2] },
    { bone: VRMHumanBoneName.LeftThumbProximal, lm: [2, 3] },
    { bone: VRMHumanBoneName.LeftThumbDistal, lm: [3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.LeftIndexProximal, lm: [5, 6] },
    { bone: VRMHumanBoneName.LeftIndexIntermediate, lm: [6, 7] },
    { bone: VRMHumanBoneName.LeftIndexDistal, lm: [7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.LeftMiddleProximal, lm: [9, 10] },
    { bone: VRMHumanBoneName.LeftMiddleIntermediate, lm: [10, 11] },
    { bone: VRMHumanBoneName.LeftMiddleDistal, lm: [11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.LeftRingProximal, lm: [13, 14] },
    { bone: VRMHumanBoneName.LeftRingIntermediate, lm: [14, 15] },
    { bone: VRMHumanBoneName.LeftRingDistal, lm: [15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.LeftLittleProximal, lm: [17, 18] },
    { bone: VRMHumanBoneName.LeftLittleIntermediate, lm: [18, 19] },
    { bone: VRMHumanBoneName.LeftLittleDistal, lm: [19, 20] },
  ],
};

const RIGHT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.RightThumbMetacarpal, lm: [1, 2] },
    { bone: VRMHumanBoneName.RightThumbProximal, lm: [2, 3] },
    { bone: VRMHumanBoneName.RightThumbDistal, lm: [3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.RightIndexProximal, lm: [5, 6] },
    { bone: VRMHumanBoneName.RightIndexIntermediate, lm: [6, 7] },
    { bone: VRMHumanBoneName.RightIndexDistal, lm: [7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.RightMiddleProximal, lm: [9, 10] },
    { bone: VRMHumanBoneName.RightMiddleIntermediate, lm: [10, 11] },
    { bone: VRMHumanBoneName.RightMiddleDistal, lm: [11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.RightRingProximal, lm: [13, 14] },
    { bone: VRMHumanBoneName.RightRingIntermediate, lm: [14, 15] },
    { bone: VRMHumanBoneName.RightRingDistal, lm: [15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.RightLittleProximal, lm: [17, 18] },
    { bone: VRMHumanBoneName.RightLittleIntermediate, lm: [18, 19] },
    { bone: VRMHumanBoneName.RightLittleDistal, lm: [19, 20] },
  ],
};

const HAND_FINGER_MAPS = {
  Left: LEFT_HAND_FINGER_MAP,
  Right: RIGHT_HAND_FINGER_MAP,
};

/**
 * Main function to apply hand tracking data to the VRM model.
 */
export const rigHands = (
  vrm: VRM,
  leftHandLandmarks: Landmark[],
  rightHandLandmarks: Landmark[]
) => {
  if (leftHandLandmarks?.length > 0) {
    rigSingleHand(vrm, leftHandLandmarks, "Left");
  }
  if (rightHandLandmarks?.length > 0) {
    rigSingleHand(vrm, rightHandLandmarks, "Right");
  }
};

/**
 * Rigs a single hand's orientation and then delegates to the finger rigger.
 */
const rigSingleHand = (
  vrm: VRM,
  handLandmarks: Landmark[],
  side: "Left" | "Right"
) => {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const handBone = humanoid.getNormalizedBoneNode(
    VRMHumanBoneName[`${side}Hand`]
  );

  if (!handBone || !handBone.parent) return;

  const wrist = getLandmarkVector(handLandmarks[0]);
  const middleMcp = getLandmarkVector(handLandmarks[9]);
  const indexMcp = getLandmarkVector(handLandmarks[5]);

  const forward = new Vector3().subVectors(middleMcp, wrist).normalize();
  const up =
    side === "Left"
      ? new Vector3().subVectors(indexMcp, wrist).cross(forward).normalize()
      : new Vector3().subVectors(wrist, indexMcp).cross(forward).normalize();

  const right = new Vector3().crossVectors(up, forward).normalize();
  const rotationMatrix = new Matrix4().makeBasis(right, up, forward);
  const worldQuat = new Quaternion().setFromRotationMatrix(rotationMatrix);

  const correctionQuat = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    side === "Left" ? Math.PI / 2 : -Math.PI / 2
  );

  worldQuat.multiply(correctionQuat);
  const parentWorldQuat = handBone.parent.getWorldQuaternion(new Quaternion());
  applyBoneRotation(handBone, worldQuat, parentWorldQuat, 0.3);

  rigFingers(vrm, handLandmarks, side);
};

/**
 * Rigs each finger bone by directly pointing it at the next landmark.
 */
const rigFingers = (
  vrm: VRM,
  handLandmarks: Landmark[],
  side: "Left" | "Right"
) => {
  const fingerMap = HAND_FINGER_MAPS[side];
  const humanoid = vrm.humanoid;
  if (!humanoid) return;

  const thumbOffset = new Quaternion();
  const yawAngle = side === "Left" ? Math.PI / 4 : -Math.PI / 4;
  thumbOffset.setFromAxisAngle(new Vector3(0, 1, 0), yawAngle);

  for (const [fingerName, joints] of Object.entries(fingerMap)) {
    for (const joint of joints) {
      const fingerBone = humanoid.getNormalizedBoneNode(joint.bone);
      if (!fingerBone || !fingerBone.parent) continue;

      const parentWorldQuat = fingerBone.parent.getWorldQuaternion(
        new Quaternion()
      );

      const lmStart = getLandmarkVector(handLandmarks[joint.lm[0]]);
      const lmEnd = getLandmarkVector(handLandmarks[joint.lm[1]]);

      const targetDirection = new Vector3()
        .subVectors(lmEnd, lmStart)
        .normalize();

      const defaultDirection = new Vector3(side === "Left" ? -1 : 1, 0, 0);

      const localTargetDirection = targetDirection
        .clone()
        .applyQuaternion(parentWorldQuat.clone().invert());

      const localQuat = new Quaternion().setFromUnitVectors(
        defaultDirection,
        localTargetDirection
      );

      if (fingerName === "Thumb") {
        const finalThumbQuat = thumbOffset.clone().multiply(localQuat);
        fingerBone.quaternion.slerp(finalThumbQuat, 0.6);
      } else {
        // --- NEW: Hinge Constraint Logic for Fingers ---

        // Check if the bone is an intermediate or distal joint.
        // These joints should only bend on one axis (like a hinge).
        const isHingeJoint =
          joint.bone.includes("Intermediate") || joint.bone.includes("Distal");

        if (isHingeJoint) {
          // 1. Convert the full rotation to Euler angles.
          const euler = new Euler().setFromQuaternion(localQuat, "XYZ");

          // 2. Zero out the rotations we want to disable.
          // For VRM models, a bone's length is on the X-axis.
          // - Y-axis rotation is the side-to-side wiggle.
          // - X-axis rotation is the twist.
          // We set them to 0 to disable them.
          euler.y = 0;
          euler.x = 0;

          // 3. Convert the constrained Euler angles back to a quaternion.
          const constrainedQuat = new Quaternion().setFromEuler(euler);

          // 4. Apply the constrained rotation.
          fingerBone.quaternion.slerp(constrainedQuat, 0.6);
        } else {
          // This is the Proximal joint (at the base of the finger).
          // We allow it to have unconstrained rotation for more natural side-to-side movement.
          fingerBone.quaternion.slerp(localQuat, 0.6);
        }
      }
    }
  }
};
