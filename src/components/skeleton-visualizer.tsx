// /components/SkeletonVisualizer.tsx

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TrackingData } from "@/hooks/use-holistic-tracking";
import { getLandmarkVector } from "@/lib/ik-utils";

// Define which landmarks connect to form the skeleton "bones"
// These indices are based on the official MediaPipe Holistic landmark map.

// POSE connections
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // Shoulder line
  [11, 13], // Left upper arm
  [13, 15], // Left lower arm
  [12, 14], // Right upper arm
  [14, 16], // Right lower arm
  [11, 23], // Left torso
  [12, 24], // Right torso
  [23, 24], // Hip line
  [23, 25], // Left upper leg
  [25, 27], // Left lower leg
  [24, 26], // Right upper leg
  [26, 28], // Right lower leg
];

// HAND connections (same for both left and right)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [5, 9], // Palm connection
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [9, 13], // Palm connection
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [13, 17], // Palm connection
  [0, 17], // Palm connection
  [17, 18],
  [18, 19],
  [19, 20], // Pinky finger
];

const NUM_POSE_LANDMARKS = 33;
const NUM_HAND_LANDMARKS = 21;

interface SkeletonVisualizerProps {
  trackingDataRef: React.RefObject<TrackingData>;
}

export function SkeletonVisualizer({
  trackingDataRef,
}: SkeletonVisualizerProps) {
  // We use useMemo to create the objects once, preventing recreation on every render
  const { poseJoints, leftHandJoints, rightHandJoints, bones } = useMemo(() => {
    const poseJoints: THREE.Mesh[] = [];
    const leftHandJoints: THREE.Mesh[] = [];
    const rightHandJoints: THREE.Mesh[] = [];
    const bones: THREE.Line[] = [];

    const jointGeometry = new THREE.SphereGeometry(0.015);
    const poseMaterial = new THREE.MeshStandardMaterial({ color: "white" });
    const leftHandMaterial = new THREE.MeshStandardMaterial({ color: "cyan" });
    const rightHandMaterial = new THREE.MeshStandardMaterial({
      color: "magenta",
    });

    for (let i = 0; i < NUM_POSE_LANDMARKS; i++) {
      const joint = new THREE.Mesh(jointGeometry, poseMaterial);
      joint.visible = false;
      poseJoints.push(joint);
    }
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      const leftJoint = new THREE.Mesh(jointGeometry, leftHandMaterial);
      leftJoint.visible = false;
      leftHandJoints.push(leftJoint);
      const rightJoint = new THREE.Mesh(jointGeometry, rightHandMaterial);
      rightJoint.visible = false;
      rightHandJoints.push(rightJoint);
    }

    const boneMaterial = new THREE.LineBasicMaterial({
      color: "white",
      linewidth: 2,
    });
    const allConnections = [
      ...POSE_CONNECTIONS,
      ...HAND_CONNECTIONS,
      ...HAND_CONNECTIONS,
    ]; // For pose, left, and right

    for (let i = 0; i < allConnections.length; i++) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const bone = new THREE.Line(lineGeometry, boneMaterial);
      bone.visible = false;
      bones.push(bone);
    }

    return { poseJoints, leftHandJoints, rightHandJoints, bones };
  }, []);

  // The main update loop
  useFrame(() => {
    const trackingData = trackingDataRef.current;
    if (!trackingData) return;

    // --- Update Pose ---
    const hasPose = trackingData.poseWorldLandmarks.length > 0;
    poseJoints.forEach((joint, i) => {
      if (hasPose) {
        const landmark = trackingData.poseWorldLandmarks[i];
        joint.position.copy(getLandmarkVector(landmark));
        joint.visible = landmark.visibility > 0.5;
      } else {
        joint.visible = false;
      }
    });

    // --- Update Left Hand ---
    const hasLeftHand = trackingData.leftHandWorldLandmarks.length > 0;
    leftHandJoints.forEach((joint, i) => {
      if (hasLeftHand) {
        const landmark = trackingData.leftHandWorldLandmarks[i];
        joint.position.copy(getLandmarkVector(landmark));
        joint.visible = true; // Hand visibility not provided, so always show if detected
      } else {
        joint.visible = false;
      }
    });

    // --- Update Right Hand ---
    const hasRightHand = trackingData.rightHandWorldLandmarks.length > 0;
    rightHandJoints.forEach((joint, i) => {
      if (hasRightHand) {
        const landmark = trackingData.rightHandWorldLandmarks[i];
        joint.position.copy(getLandmarkVector(landmark));
        joint.visible = true;
      } else {
        joint.visible = false;
      }
    });

    // --- Update Bones ---
    let boneIndex = 0;
    POSE_CONNECTIONS.forEach(([start, end]) => {
      const bone = bones[boneIndex++];
      if (hasPose && poseJoints[start].visible && poseJoints[end].visible) {
        bone.geometry.setFromPoints([
          poseJoints[start].position,
          poseJoints[end].position,
        ]);
        bone.visible = true;
      } else {
        bone.visible = false;
      }
    });
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const bone = bones[boneIndex++];
      if (hasLeftHand) {
        bone.geometry.setFromPoints([
          leftHandJoints[start].position,
          leftHandJoints[end].position,
        ]);
        bone.visible = true;
      } else {
        bone.visible = false;
      }
    });
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const bone = bones[boneIndex++];
      if (hasRightHand) {
        bone.geometry.setFromPoints([
          rightHandJoints[start].position,
          rightHandJoints[end].position,
        ]);
        bone.visible = true;
      } else {
        bone.visible = false;
      }
    });
  });

  return (
    <group position={[0, 1.5, 0]}>
      {poseJoints.map((joint, i) => (
        <primitive key={`pose-joint-${i}`} object={joint} />
      ))}
      {leftHandJoints.map((joint, i) => (
        <primitive key={`left-hand-joint-${i}`} object={joint} />
      ))}
      {rightHandJoints.map((joint, i) => (
        <primitive key={`right-hand-joint-${i}`} object={joint} />
      ))}
      {bones.map((bone, i) => (
        <primitive key={`bone-${i}`} object={bone} />
      ))}
    </group>
  );
}
