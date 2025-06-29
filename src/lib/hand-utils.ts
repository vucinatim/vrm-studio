import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import { Vector3, Quaternion } from "three";
import { Landmark } from "@mediapipe/tasks-vision";

// A Map to store the initial "at rest" rotation of the hand bones.
// This allows us to apply new rotations relative to the base pose.
const initialRotations = new Map<VRMHumanBoneName, Quaternion>();

// Maps key landmark indices for defining the hand's plane.
const HAND_PLANE_LANDMARKS = {
  wrist: 0,
  index: 5, // Index finger MCP joint
  middle: 9, // Middle finger MCP joint
  little: 17, // Little finger MCP joint
};

/**
 * Applies hand tracking data to a VRM model's hand bones (wrist).
 */
export const rigHands = (
  vrm: VRM,
  leftHandLandmarks: Landmark[],
  rightHandLandmarks: Landmark[],
  smoothingFactor: number
) => {
  // We will only test the left hand for simplicity.
  if (leftHandLandmarks.length > 0) {
    rigSingleHand(vrm, leftHandLandmarks, "Left", smoothingFactor);
  }
  // The right hand will remain static.
  if (rightHandLandmarks.length > 0) {
    rigSingleHand(vrm, rightHandLandmarks, "Right", smoothingFactor);
  }
};

/**
 * Rigs a single hand bone by connecting one axis at a time to landmark data.
 */
const rigSingleHand = (
  vrm: VRM,
  handLandmarks: Landmark[],
  side: "Left" | "Right",
  smoothingFactor: number
) => {
  if (!vrm.humanoid) return;

  const boneName = VRMHumanBoneName[`${side}Hand`];
  const handBone = vrm.humanoid.getNormalizedBoneNode(boneName);
  if (!handBone || !handBone.parent) return;

  // --- CAPTURE INITIAL ROTATION (ONCE) ---
  if (!initialRotations.has(boneName)) {
    initialRotations.set(boneName, handBone.quaternion.clone());
  }

  const getLandmark = (index: number): Vector3 => {
    const landmark = handLandmarks[index];
    if (side === "Left") {
      return new Vector3(-landmark.x, landmark.y, -landmark.z);
    } else {
      return new Vector3(landmark.x, landmark.y, landmark.z);
    }
  };

  // --- AXIS ISOLATION TESTS ---
  // We will build the final rotation by combining individual axis rotations.

  // --- Y-AXIS (Wave) - Currently disabled to focus on the next axis ---
  const indexMcpY = getLandmark(HAND_PLANE_LANDMARKS.index);
  const littleMcpY = getLandmark(HAND_PLANE_LANDMARKS.little);
  const knuckleVectorY = new Vector3().subVectors(indexMcpY, littleMcpY);
  let waveAngle = Math.atan2(knuckleVectorY.y, knuckleVectorY.x);
  const maxWaveAngle = Math.PI / 2;
  waveAngle = Math.max(-maxWaveAngle, Math.min(maxWaveAngle, waveAngle));
  const waveRotation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    side === "Left" ? -waveAngle : waveAngle
  );

  // --- X-AXIS (Pitch - Up/Down) ---
  const wristX = getLandmark(HAND_PLANE_LANDMARKS.wrist);
  const middleMcpX = getLandmark(HAND_PLANE_LANDMARKS.middle);
  const handForwardVector = new Vector3().subVectors(middleMcpX, wristX);
  let pitchAngle = Math.atan2(handForwardVector.y, handForwardVector.z);
  pitchAngle += Math.PI / 2;
  const pitchRotation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 0, 1), // Using the axis you found to work
    pitchAngle
  );

  // --- Z-AXIS (Roll/Twist) ---
  //   const wristZ = getLandmark(HAND_PLANE_LANDMARKS.wrist);
  //   const indexMcpZ = getLandmark(HAND_PLANE_LANDMARKS.index);
  //   const middleMcpZ = getLandmark(HAND_PLANE_LANDMARKS.middle);

  //   // Calculate the 'up' vector (pointing out the back of the hand)
  //   const handUpVector = new Vector3()
  //     .subVectors(middleMcpZ, wristZ)
  //     .cross(new Vector3().subVectors(indexMcpZ, wristZ))
  //     .normalize();

  //   // Calculate the roll angle based on the 'up' vector's tilt
  //   const rollAngle = Math.atan2(handUpVector.x, handUpVector.y);

  //   // Apply this rotation around the Y-axis of the bone's local space
  //   const rollRotation = new Quaternion().setFromAxisAngle(
  //     new Vector3(1, 0, 0),
  //     rollAngle
  //   );
  const rollRotation = new Quaternion();

  // --- COMBINE AND APPLY ---
  const baseRotation = initialRotations.get(boneName)!;
  // We multiply the rotations together. For now, only pitch is active.
  const animatedRotation = waveRotation
    .multiply(pitchRotation)
    .multiply(rollRotation);
  const finalLocalQuat = baseRotation.clone().multiply(animatedRotation);

  handBone.quaternion.slerp(finalLocalQuat, smoothingFactor);
};
