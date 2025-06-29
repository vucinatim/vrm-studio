import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Quaternion, Matrix4 } from "three";
import { Landmark } from "@mediapipe/tasks-vision";
import { applyBoneRotation } from "./ik-utils"; // Assuming you have this helper

// --- Constants for Finger Rigging ---

/**
 * Maps MediaPipe landmarks to the VRM bones for the LEFT hand.
 */
const LEFT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.LeftThumbMetacarpal, lm: [0, 1, 2] },
    { bone: VRMHumanBoneName.LeftThumbProximal, lm: [1, 2, 3] },
    { bone: VRMHumanBoneName.LeftThumbDistal, lm: [2, 3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.LeftIndexProximal, lm: [0, 5, 6] },
    { bone: VRMHumanBoneName.LeftIndexIntermediate, lm: [5, 6, 7] },
    { bone: VRMHumanBoneName.LeftIndexDistal, lm: [6, 7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.LeftMiddleProximal, lm: [0, 9, 10] },
    { bone: VRMHumanBoneName.LeftMiddleIntermediate, lm: [9, 10, 11] },
    { bone: VRMHumanBoneName.LeftMiddleDistal, lm: [10, 11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.LeftRingProximal, lm: [0, 13, 14] },
    { bone: VRMHumanBoneName.LeftRingIntermediate, lm: [13, 14, 15] },
    { bone: VRMHumanBoneName.LeftRingDistal, lm: [14, 15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.LeftLittleProximal, lm: [0, 17, 18] },
    { bone: VRMHumanBoneName.LeftLittleIntermediate, lm: [17, 18, 19] },
    { bone: VRMHumanBoneName.LeftLittleDistal, lm: [18, 19, 20] },
  ],
};

/**
 * Maps MediaPipe landmarks to the VRM bones for the RIGHT hand.
 */
const RIGHT_HAND_FINGER_MAP = {
  Thumb: [
    { bone: VRMHumanBoneName.RightThumbMetacarpal, lm: [0, 1, 2] },
    { bone: VRMHumanBoneName.RightThumbProximal, lm: [1, 2, 3] },
    { bone: VRMHumanBoneName.RightThumbDistal, lm: [2, 3, 4] },
  ],
  Index: [
    { bone: VRMHumanBoneName.RightIndexProximal, lm: [0, 5, 6] },
    { bone: VRMHumanBoneName.RightIndexIntermediate, lm: [5, 6, 7] },
    { bone: VRMHumanBoneName.RightIndexDistal, lm: [6, 7, 8] },
  ],
  Middle: [
    { bone: VRMHumanBoneName.RightMiddleProximal, lm: [0, 9, 10] },
    { bone: VRMHumanBoneName.RightMiddleIntermediate, lm: [9, 10, 11] },
    { bone: VRMHumanBoneName.RightMiddleDistal, lm: [10, 11, 12] },
  ],
  Ring: [
    { bone: VRMHumanBoneName.RightRingProximal, lm: [0, 13, 14] },
    { bone: VRMHumanBoneName.RightRingIntermediate, lm: [13, 14, 15] },
    { bone: VRMHumanBoneName.RightRingDistal, lm: [14, 15, 16] },
  ],
  Little: [
    { bone: VRMHumanBoneName.RightLittleProximal, lm: [0, 17, 18] },
    { bone: VRMHumanBoneName.RightLittleIntermediate, lm: [17, 18, 19] },
    { bone: VRMHumanBoneName.RightLittleDistal, lm: [18, 19, 20] },
  ],
};

const HAND_FINGER_MAPS = {
  Left: LEFT_HAND_FINGER_MAP,
  Right: RIGHT_HAND_FINGER_MAP,
};

/**
 * Applies hand tracking data to a VRM model's hand and finger bones.
 * @param vrm The target VRM model.
 * @param leftHandLandmarks An array of 3D landmarks for the left hand.
 * @param rightHandLandmarks An array of 3D landmarks for the right hand.
 */
export const rigHands = (
  vrm: VRM,
  leftHandLandmarks: Landmark[],
  rightHandLandmarks: Landmark[]
) => {
  if (leftHandLandmarks && leftHandLandmarks.length > 0) {
    rigSingleHand(vrm, leftHandLandmarks, "Left");
  }
  if (rightHandLandmarks && rightHandLandmarks.length > 0) {
    rigSingleHand(vrm, rightHandLandmarks, "Right");
  }
};

/**
 * Rigs a single hand's orientation and fingers.
 * @param vrm The VRM model.
 * @param handLandmarks The list of landmarks for the hand.
 * @param side Which hand to rig ("Left" or "Right").
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

  // --- Rig Hand Orientation ---
  const getLandmark = (index: number): Vector3 => {
    const landmark = handLandmarks[index];
    // Flipping the z-axis is a common requirement when mapping from
    // screen-space 2.5D landmarks to a 3D world.
    return new Vector3(landmark.x, landmark.y, -landmark.z);
  };

  const wrist = getLandmark(0);
  const middleMcp = getLandmark(9);
  const indexMcp = getLandmark(5);

  const forward = new Vector3().subVectors(middleMcp, wrist).normalize();
  const up =
    side === "Left"
      ? new Vector3().subVectors(indexMcp, wrist).cross(forward).normalize()
      : new Vector3().subVectors(wrist, indexMcp).cross(forward).normalize();

  const right = new Vector3().crossVectors(up, forward).normalize();

  const rotationMatrix = new Matrix4().makeBasis(right, up, forward);
  const worldQuat = new Quaternion().setFromRotationMatrix(rotationMatrix);

  // Correction for T-pose alignment. May need adjustment.
  const correctionQuat = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    side === "Left" ? -Math.PI / 2 : Math.PI / 2
  );
  worldQuat.multiply(correctionQuat);

  const parentWorldQuat = handBone.parent.getWorldQuaternion(new Quaternion());
  applyBoneRotation(handBone, worldQuat, parentWorldQuat, 0.3);

  // --- Rig Fingers ---
  rigFingers(humanoid, handLandmarks, side);
};

/**
 * Rigs the fingers of a single hand by calculating the curl angle for each joint.
 * @param humanoid The VRM humanoid object.
 * @param handLandmarks The list of landmarks for the hand.
 * @param side Which hand to rig.
 */
const rigFingers = (
  humanoid: VRM["humanoid"],
  handLandmarks: Landmark[],
  side: "Left" | "Right"
) => {
  // --- REFACTORED SECTION ---
  // Select the correct finger map based on the hand side.
  const fingerMap = HAND_FINGER_MAPS[side];

  const getLandmark = (index: number): Vector3 => {
    const landmark = handLandmarks[index];
    return new Vector3(landmark.x, landmark.y, landmark.z);
  };

  for (const [fingerName, joints] of Object.entries(fingerMap)) {
    for (const joint of joints) {
      // The bone name is now directly taken from the map.
      const fingerBone = humanoid.getNormalizedBoneNode(joint.bone);
      if (!fingerBone) continue;

      const lmPrev = getLandmark(joint.lm[0]);
      const lmCurr = getLandmark(joint.lm[1]);
      const lmNext = getLandmark(joint.lm[2]);

      const vec1 = new Vector3().subVectors(lmCurr, lmPrev).normalize();
      const vec2 = new Vector3().subVectors(lmNext, lmCurr).normalize();

      let curlAngle = vec1.angleTo(vec2);

      // Determine the curl axis based on the hand.
      // For most fingers, this is rotation around the local Z-axis.
      let curlAxis = new Vector3(0, 0, side === "Left" ? 1 : -1);

      if (fingerName === "Thumb") {
        // The thumb swings inwards on the Y-axis.
        curlAxis = new Vector3(0, side === "Left" ? 1 : -1, 0);

        // Amplify thumb curl for a more natural look, except for the first joint.
        if (!joint.bone.includes("Metacarpal")) {
          curlAngle *= 1.5;
        }
      }

      const curlQuat = new Quaternion().setFromAxisAngle(curlAxis, curlAngle);

      // Apply the rotation with smoothing (slerp)
      fingerBone.quaternion.slerp(curlQuat, 0.5);
    }
  }
};
