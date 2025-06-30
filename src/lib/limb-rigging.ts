import { VRM } from "@pixiv/three-vrm";
import { Vector3, Quaternion, Object3D } from "three";
import { applyBoneRotation } from "./ik-utils";
import { LandmarkData } from "./pose-utils";

interface Bones {
  leftUpperArm: Object3D | null;
  rightUpperArm: Object3D | null;
  leftLowerArm: Object3D | null;
  rightLowerArm: Object3D | null;
  leftUpperLeg: Object3D | null;
  rightUpperLeg: Object3D | null;
  leftLowerLeg: Object3D | null;
  rightLowerLeg: Object3D | null;
}

interface BoneLengths {
  arm: number;
  forearm: number;
  leg: number;
  shin: number;
}

const solveTwoBoneIK = (
  origin: Vector3,
  target: Vector3,
  pole: Vector3,
  l1: number,
  l2: number,
  restDirection: Vector3
) => {
  const originToTarget = new Vector3().subVectors(target, origin);
  let d = originToTarget.length();

  let upperBonePos = new Vector3();
  const lowerBonePos = new Vector3();

  if (d > l1 + l2) {
    d = l1 + l2;
    const direction = originToTarget.normalize();
    upperBonePos.copy(origin).addScaledVector(direction, l1);
    lowerBonePos.copy(upperBonePos).addScaledVector(direction, l2);
  } else {
    const a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const h = l1 * Math.sqrt(Math.max(0, 1 - a * a));
    const d1 = l1 * a;
    const circleCenter = origin
      .clone()
      .addScaledVector(originToTarget.normalize(), d1);
    const armPlaneNormal = new Vector3()
      .subVectors(pole, origin)
      .cross(originToTarget)
      .normalize();
    const elbowDirection = new Vector3()
      .crossVectors(originToTarget, armPlaneNormal)
      .normalize();
    upperBonePos = circleCenter.clone().addScaledVector(elbowDirection, h);
    lowerBonePos.copy(target);
  }

  const quatUpper = new Quaternion().setFromUnitVectors(
    restDirection,
    new Vector3().subVectors(upperBonePos, origin).normalize()
  );
  const quatLower = new Quaternion().setFromUnitVectors(
    restDirection,
    new Vector3().subVectors(lowerBonePos, upperBonePos).normalize()
  );

  return { quatUpper, quatLower };
};

export const rigLimbs = (
  vrm: VRM,
  lm: LandmarkData,
  bones: Bones,
  boneLengths: BoneLengths,
  options: { enableLegs: boolean },
  smoothingFactor: number = 0.4
) => {
  const parentRotations: { [key: string]: Quaternion } = {
    leftUpperArm: bones.leftUpperArm!.parent!.getWorldQuaternion(
      new Quaternion()
    ),
    rightUpperArm: bones.rightUpperArm!.parent!.getWorldQuaternion(
      new Quaternion()
    ),
  };
  if (options.enableLegs) {
    parentRotations.leftUpperLeg =
      bones.leftUpperLeg!.parent!.getWorldQuaternion(new Quaternion());
    parentRotations.rightUpperLeg =
      bones.rightUpperLeg!.parent!.getWorldQuaternion(new Quaternion());
  }

  const armRestDirectionL = new Vector3(-1, 0, 0);
  const armRestDirectionR = new Vector3(1, 0, 0);
  const legRestDirection = new Vector3(0, -1, 0);

  const ikL = solveTwoBoneIK(
    lm.lShoulder,
    lm.lWrist,
    lm.lElbow,
    boneLengths.arm,
    boneLengths.forearm,
    armRestDirectionL
  );
  applyBoneRotation(
    bones.leftUpperArm,
    ikL.quatUpper,
    parentRotations.leftUpperArm,
    smoothingFactor
  );
  applyBoneRotation(
    bones.leftLowerArm,
    ikL.quatLower,
    ikL.quatUpper,
    smoothingFactor
  );

  const ikR = solveTwoBoneIK(
    lm.rShoulder,
    lm.rWrist,
    lm.rElbow,
    boneLengths.arm,
    boneLengths.forearm,
    armRestDirectionR
  );
  applyBoneRotation(
    bones.rightUpperArm,
    ikR.quatUpper,
    parentRotations.rightUpperArm,
    smoothingFactor
  );
  applyBoneRotation(
    bones.rightLowerArm,
    ikR.quatLower,
    ikR.quatUpper,
    smoothingFactor
  );

  if (options.enableLegs) {
    const ikLegL = solveTwoBoneIK(
      lm.lHip,
      lm.lAnkle,
      lm.lKnee,
      boneLengths.leg,
      boneLengths.shin,
      legRestDirection
    );
    applyBoneRotation(
      bones.leftUpperLeg,
      ikLegL.quatUpper,
      parentRotations.leftUpperLeg!,
      smoothingFactor
    );
    applyBoneRotation(
      bones.leftLowerLeg,
      ikLegL.quatLower,
      ikLegL.quatUpper,
      smoothingFactor
    );

    const ikLegR = solveTwoBoneIK(
      lm.lHip,
      lm.rAnkle,
      lm.rKnee,
      boneLengths.leg,
      boneLengths.shin,
      legRestDirection
    );
    applyBoneRotation(
      bones.rightUpperLeg,
      ikLegR.quatUpper,
      parentRotations.rightUpperLeg!,
      smoothingFactor
    );
    applyBoneRotation(
      bones.rightLowerLeg,
      ikLegR.quatLower,
      ikLegR.quatUpper,
      smoothingFactor
    );
  }
};
