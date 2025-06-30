"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  NormalizedLandmark,
  Landmark,
  HolisticLandmarkerResult,
  Category,
} from "@mediapipe/tasks-vision";
import { usePerformanceStore } from "@/store/performance-store";
import { useEditorStore } from "@/store/editor-store";

type Blendshape = Category;

export interface TrackingData {
  blendshapes: Blendshape[];
  poseLandmarks: NormalizedLandmark[];
  faceLandmarks: NormalizedLandmark[];
  poseWorldLandmarks: Landmark[];
  leftHandWorldLandmarks: Landmark[];
  rightHandWorldLandmarks: Landmark[];
}

export type TrackingStatus = "IDLE" | "INITIALIZING" | "RUNNING" | "ERROR";

const initialTrackingData: TrackingData = {
  blendshapes: [],
  poseLandmarks: [],
  faceLandmarks: [],
  poseWorldLandmarks: [],
  leftHandWorldLandmarks: [],
  rightHandWorldLandmarks: [],
};

export function useHolisticTracking() {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("IDLE");
  const workerRef = useRef<Worker | null>(null);
  const isProcessing = useRef(false);

  // --- NEW: Separate refs for different coordinate systems ---
  const riggingDataRef = useRef<TrackingData>({ ...initialTrackingData }); // For the 3D Avatar
  const debugDataRef = useRef<TrackingData>({ ...initialTrackingData }); // For the 2D Debug Canvas

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const addWorkerTiming = usePerformanceStore((state) => state.addWorkerTiming);
  const lastMessageTimeRef = useRef<number | null>(null);
  const isSmoothingEnabled = useEditorStore(
    (state) => state.isSmoothingEnabled
  );
  const globalSmoothingFactor = useEditorStore(
    (state) => state.globalSmoothingFactor
  );

  useEffect(() => {
    if (workerRef.current) {
      console.log("Updating smoothing factor", globalSmoothingFactor);
      workerRef.current.postMessage({
        type: "UPDATE_SMOOTHING",
        payload: globalSmoothingFactor,
      });
    }
  }, [globalSmoothingFactor]);

  useEffect(() => {
    setTrackingStatus("INITIALIZING");
    workerRef.current = new Worker(
      new URL("../workers/holistic-worker.ts", import.meta.url)
    );

    const onMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case "READY":
          setTrackingStatus("IDLE");
          break;
        case "RESULTS": {
          const now = performance.now();
          if (lastMessageTimeRef.current) {
            addWorkerTiming(now - lastMessageTimeRef.current);
          }
          lastMessageTimeRef.current = now;

          // --- NEW: Destructure the payload to get both raw and rigging data ---
          const { raw, rigging } = payload as {
            raw: HolisticLandmarkerResult;
            rigging: HolisticLandmarkerResult;
          };

          // Populate the rigging data ref for the avatar
          if (rigging.faceBlendshapes?.length > 0)
            riggingDataRef.current.blendshapes =
              rigging.faceBlendshapes[0].categories;
          if (rigging.poseLandmarks?.length > 0)
            riggingDataRef.current.poseLandmarks = rigging.poseLandmarks[0];
          if (rigging.poseWorldLandmarks?.length > 0)
            riggingDataRef.current.poseWorldLandmarks =
              rigging.poseWorldLandmarks[0];
          if (rigging.faceLandmarks?.length > 0)
            riggingDataRef.current.faceLandmarks = rigging.faceLandmarks[0];
          if (rigging.leftHandWorldLandmarks?.length > 0)
            riggingDataRef.current.leftHandWorldLandmarks =
              rigging.leftHandWorldLandmarks[0];
          if (rigging.rightHandWorldLandmarks?.length > 0)
            riggingDataRef.current.rightHandWorldLandmarks =
              rigging.rightHandWorldLandmarks[0];

          // Populate the debug data ref with the untransformed data
          if (raw.poseLandmarks?.length > 0)
            debugDataRef.current.poseLandmarks = raw.poseLandmarks[0];
          if (raw.faceLandmarks?.length > 0)
            debugDataRef.current.faceLandmarks = raw.faceLandmarks[0];

          isProcessing.current = false;
          break;
        }
        case "ERROR":
          console.error("[Worker Error]", payload);
          setTrackingStatus("ERROR");
          isProcessing.current = false;
          break;
      }
    };

    workerRef.current.addEventListener("message", onMessage);
    workerRef.current.postMessage({ type: "INITIALIZE" });

    return () => {
      workerRef.current?.removeEventListener("message", onMessage);
      workerRef.current?.terminate();
    };
  }, [addWorkerTiming]);

  // The rest of the hook (predictWebcam, useEffect for tracking, toggleTracking) remains the same.
  const predictWebcam = useCallback(async () => {
    if (
      !workerRef.current ||
      isProcessing.current ||
      trackingStatus !== "RUNNING"
    ) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    isProcessing.current = true;
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      isProcessing.current = false;
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    const imageBitmap = await createImageBitmap(video);
    workerRef.current.postMessage(
      { type: "PREDICT", payload: { imageBitmap, isSmoothingEnabled } },
      [imageBitmap]
    );
    animationFrameId.current = requestAnimationFrame(predictWebcam);
  }, [trackingStatus, isSmoothingEnabled]);

  useEffect(() => {
    // This effect remains identical
    const video = videoRef.current;
    if (trackingStatus === "RUNNING") {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          if (video) {
            video.srcObject = stream;
            video.onplaying = () => {
              animationFrameId.current = requestAnimationFrame(predictWebcam);
            };
            video.play();
          }
        })
        .catch((err) => {
          console.error("Failed to get media stream", err);
          setTrackingStatus("ERROR");
        });
    } else {
      if (video && video.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        video.srcObject = null;
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }
    return () => {
      if (video && video.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [trackingStatus, predictWebcam]);

  const toggleTracking = () => {
    if (trackingStatus === "RUNNING") setTrackingStatus("IDLE");
    else if (trackingStatus === "IDLE") setTrackingStatus("RUNNING");
  };

  return {
    videoRef,
    riggingDataRef, // The transformed data for the avatar
    debugDataRef, // The raw data for the debug panel
    trackingStatus,
    toggleTracking,
  };
}
