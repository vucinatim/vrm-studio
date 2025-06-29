"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  NormalizedLandmark,
  Landmark,
  HolisticLandmarkerResult,
  Category,
} from "@mediapipe/tasks-vision";

// 1. DEFINE OUR DATA STRUCTURES
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

  // 2. CONSOLIDATE ALL TRACKING DATA INTO A SINGLE useRef
  // This is much cleaner than having 6 separate refs.
  const trackingDataRef = useRef<TrackingData>(initialTrackingData);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);

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
        case "RESULTS":
          const results = payload as HolisticLandmarkerResult;

          // 3. UPDATE PROPERTIES OF THE SINGLE trackingData OBJECT
          // This logic is the same, but it targets the properties of our new object.
          if (results.faceBlendshapes?.length > 0) {
            trackingDataRef.current.blendshapes =
              results.faceBlendshapes[0].categories;
          }
          if (results.poseLandmarks?.length > 0) {
            trackingDataRef.current.poseLandmarks = results.poseLandmarks[0];
          }
          if (results.poseWorldLandmarks?.length > 0) {
            trackingDataRef.current.poseWorldLandmarks =
              results.poseWorldLandmarks[0];
          }
          if (results.faceLandmarks?.length > 0) {
            trackingDataRef.current.faceLandmarks = results.faceLandmarks[0];
          }
          if (results.leftHandWorldLandmarks?.length > 0) {
            trackingDataRef.current.leftHandWorldLandmarks =
              results.leftHandWorldLandmarks[0];
          }
          if (results.rightHandWorldLandmarks?.length > 0) {
            trackingDataRef.current.rightHandWorldLandmarks =
              results.rightHandWorldLandmarks[0];
          }

          isProcessing.current = false;
          break;
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
  }, []);

  const predictWebcam = useCallback(async () => {
    if (
      !workerRef.current ||
      isProcessing.current ||
      trackingStatus !== "RUNNING"
    ) {
      animationFrameId.current = window.requestAnimationFrame(predictWebcam);
      return;
    }

    isProcessing.current = true;

    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      isProcessing.current = false;
      animationFrameId.current = window.requestAnimationFrame(predictWebcam);
      return;
    }

    const imageBitmap = await createImageBitmap(video);
    workerRef.current.postMessage({ type: "PREDICT", payload: imageBitmap }, [
      imageBitmap,
    ]);

    animationFrameId.current = window.requestAnimationFrame(predictWebcam);
  }, [trackingStatus]);

  useEffect(() => {
    const video = videoRef.current;
    if (trackingStatus === "RUNNING") {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          if (video) {
            video.srcObject = stream;
            video.onplaying = () => {
              animationFrameId.current =
                window.requestAnimationFrame(predictWebcam);
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
        window.cancelAnimationFrame(animationFrameId.current);
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
        window.cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [trackingStatus, predictWebcam]);

  const toggleTracking = () => {
    if (trackingStatus === "RUNNING") {
      setTrackingStatus("IDLE");
    } else if (trackingStatus === "IDLE") {
      setTrackingStatus("RUNNING");
    }
  };

  return {
    videoRef,
    trackingDataRef,
    trackingStatus,
    toggleTracking,
  };
}
