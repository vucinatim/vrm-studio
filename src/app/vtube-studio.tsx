"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useHolisticTracking } from "@/hooks/use-holistic-tracking";
import { Avatar } from "@/components/Avatar";
import { OrbitControls, Stats } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { initialCamera, useEditorStore } from "@/store/editor-store";
import { MainOverlay } from "@/components/main-overlay";
import { SkeletonVisualizer } from "@/components/skeleton-visualizer";
import { useCursorStyle } from "@/hooks/use-cursor-style";

export function VTubeStudio() {
  const {
    videoRef,
    debugDataRef,
    riggingDataRef,
    toggleTracking,
    trackingStatus,
  } = useHolisticTracking();
  const {
    cameraControls,
    showGround,
    lights,
    selectedModelUrl,
    showStats,
    areShadowsEnabled,
    isGreenScreenEnabled,
  } = useEditorStore();

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useCursorStyle(canvas);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(
        cameraControls.target[0],
        cameraControls.target[1],
        cameraControls.target[2]
      );
      controlsRef.current.object.position.set(
        cameraControls.position[0],
        cameraControls.position[1],
        cameraControls.position[2]
      );
      controlsRef.current.update();
    }
  }, [cameraControls]);

  return (
    <div className="relative h-screen w-screen">
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          onCreated={({ gl }) => setCanvas(gl.domElement)}
          camera={{
            ...initialCamera,
            fov: 30,
          }}
        >
          {isGreenScreenEnabled && (
            <color attach="background" args={["#00ff00"]} />
          )}
          {showStats && (
            <Stats className="!absolute !top-8 !right-8 !left-auto" />
          )}
          <OrbitControls
            ref={controlsRef}
            target={cameraControls.target}
            enableDamping
            dampingFactor={0.1}
          />
          <ambientLight intensity={lights.ambient.intensity} />
          <directionalLight
            castShadow={areShadowsEnabled}
            position={lights.directional.position}
            intensity={lights.directional.intensity}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
          <pointLight
            position={lights.spot1.position}
            intensity={lights.spot1.intensity}
            color={lights.spot1.color}
          />
          <pointLight
            position={lights.spot2.position}
            intensity={lights.spot2.intensity}
            color={lights.spot2.color}
          />

          {showGround && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow={areShadowsEnabled}
            >
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial
                color="#303030"
                roughness={0.9}
                metalness={0}
              />
            </mesh>
          )}

          <Avatar
            modelUrl={selectedModelUrl}
            trackingDataRef={riggingDataRef}
          />
          <SkeletonVisualizer trackingDataRef={riggingDataRef} />
        </Canvas>
      </div>

      <MainOverlay
        videoRef={videoRef}
        trackingDataRef={debugDataRef}
        toggleTracking={toggleTracking}
        trackingStatus={trackingStatus}
      />
    </div>
  );
}
