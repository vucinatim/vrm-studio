import { VRM } from "@pixiv/three-vrm";
import * as THREE from "three";
import { TrackingData } from "@/hooks/use-holistic-tracking";
import { applyBlendshapes } from "./blendshape-utils";
import { rigHead } from "./head-utils";
import { rigPose } from "./pose-utils";
import { rigHands } from "./hand-utils";
import { GazeSmoother, rigPupils } from "./pupil-utils";

/**
 * Configuration options for the VRMRigSolver.
 * This tells the solver which parts of the tracking to apply.
 */
export interface SolverConfig {
  isFaceTrackingEnabled: boolean;
  isPoseTrackingEnabled: boolean;
  isHeadTrackingEnabled: boolean;
  isHandTrackingEnabled: boolean;
  isLegTrackingEnabled: boolean;
  isPupilTrackingEnabled: boolean;
}

/**
 * VRMRigSolver is a class dedicated to applying motion tracking data
 * from MediaPipe to a VRM model. It acts as a conductor, orchestrating
 * various rigging utilities based on the provided data and configuration.
 */
export class VRMRigSolver {
  private vrm: VRM;
  private lookAtTarget = new THREE.Object3D();
  private gazeSmoother = new GazeSmoother(0.1, 0.1);

  /**
   * Creates an instance of the VRMRigSolver.
   * @param vrm The target VRM model to be rigged.
   */
  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.lookAtTarget.position.set(0, 1.5, -1.5);
    vrm.humanoid.getNormalizedBoneNode("head")?.add(this.lookAtTarget);
  }

  /**
   * The main update loop to be called on every animation frame.
   * It applies the tracking data to the VRM model according to the config.
   * @param trackingData The latest tracking data from useHolisticTracking.
   * @param config The configuration specifying which tracking features are enabled.
   * @param delta The time delta since the last frame, for physics updates.
   */
  public update(
    trackingData: TrackingData,
    config: SolverConfig,
    delta: number
  ) {
    if (!this.vrm || !this.vrm.lookAt) return;

    this.vrm.lookAt.target = this.lookAtTarget;

    // --- Blendshapes (Face Expressions) ---
    // Uses faceBlendshapes from the tracking data.
    if (
      config.isFaceTrackingEnabled &&
      this.vrm.expressionManager &&
      trackingData.blendshapes.length > 0
    ) {
      applyBlendshapes(this.vrm, trackingData.blendshapes);
    }

    // --- Head Rotation ---
    // Uses faceLandmarks (screen space) for precise head orientation.
    if (config.isHeadTrackingEnabled && trackingData.faceLandmarks.length > 0) {
      rigHead(this.vrm, trackingData.faceLandmarks, 0.3);
    }

    // --- Pupil Tracking ---
    if (
      config.isPupilTrackingEnabled &&
      trackingData.faceLandmarks.length > 0
    ) {
      rigPupils(this.vrm, trackingData.faceLandmarks, this.gazeSmoother);
    }

    // --- Full Body & Limb Pose ---
    if (
      config.isPoseTrackingEnabled &&
      trackingData.poseWorldLandmarks.length > 0
    ) {
      rigPose(
        this.vrm,
        trackingData.poseWorldLandmarks, // Use world landmarks for 3D rigging
        {
          enableLegs: config.isLegTrackingEnabled,
        }
      );
    }

    // --- Hand Tracking (if not part of rigPose) ---
    if (config.isHandTrackingEnabled) {
      rigHands(
        this.vrm,
        trackingData.leftHandWorldLandmarks,
        trackingData.rightHandWorldLandmarks
      );
    }

    // --- VRM Physics Update ---
    // Finally, update the model's internal state (e.g., spring bones).
    this.vrm.update(delta);
  }
}
