"use client";

import React, { useEffect, useState, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm";
import { SkinnedMesh } from "three";
import { useEditorStore } from "@/store/editor-store";
import { TrackingData } from "@/hooks/use-holistic-tracking";
import { VRMRigSolver } from "@/lib/vrm-rig-solver";

interface AvatarProps {
  modelUrl: string;
  trackingDataRef: RefObject<TrackingData>;
}

export function Avatar({ modelUrl, trackingDataRef }: AvatarProps) {
  // We now store the solver instance in the state, not just the VRM.
  const [solver, setSolver] = useState<VRMRigSolver | null>(null);

  // Get all the configuration flags from the Zustand store.
  const {
    isFaceTrackingEnabled,
    isPupilTrackingEnabled,
    isPoseTrackingEnabled,
    isHeadTrackingEnabled,
    isHandTrackingEnabled,
    isLegTrackingEnabled,
    setMorphTargetDictionary,
    areShadowsEnabled,
  } = useEditorStore();

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // When the model loads, we create a new instance of our solver
    // and store it in the component's state.
    loader.load(
      modelUrl,
      (gltf) => {
        const loadedVrm = gltf.userData.vrm as VRM;
        setSolver(new VRMRigSolver(loadedVrm));

        // This logic for the debug panel remains the same.
        if (loadedVrm.expressionManager) {
          const dictionary = Object.fromEntries(
            loadedVrm.expressionManager.expressions.map((exp) => [
              exp.expressionName,
              0,
            ])
          );
          setMorphTargetDictionary(dictionary);
        }
      },
      (progress) =>
        console.log(
          `Loading model... ${(
            100.0 *
            (progress.loaded / progress.total)
          ).toFixed(0)}%`
        ),
      (error) => console.error(error)
    );
  }, [modelUrl, setMorphTargetDictionary]);

  useEffect(() => {
    // This effect handles applying shadow settings when they change.
    // We access the vrm instance, which is now managed by the solver.
    // Note: `vrm` is a private member, this is a direct way to access it.
    // A public getter on the solver class is another option.
    const vrm = solver?.["vrm"];
    if (vrm) {
      vrm.scene.traverse((object) => {
        if (object instanceof SkinnedMesh) {
          object.castShadow = areShadowsEnabled;
        }
      });
    }
  }, [solver, areShadowsEnabled]);

  useFrame((state, delta) => {
    // The useFrame loop is now beautifully simple.
    // If the solver and tracking data are ready, we just call update.
    if (solver && trackingDataRef.current) {
      // The solver handles all the complex conditional logic internally.
      solver.update(
        trackingDataRef.current,
        {
          isFaceTrackingEnabled,
          isPupilTrackingEnabled,
          isPoseTrackingEnabled,
          isHeadTrackingEnabled,
          isHandTrackingEnabled,
          isLegTrackingEnabled,
        },
        delta
      );
    }
  });

  // We get the VRM scene from the solver instance to render it.
  const vrmScene = solver?.["vrm"]?.scene;

  if (!vrmScene) {
    return null; // Don't render anything until the model and solver are ready
  }

  return <primitive object={vrmScene} />;
}
