"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface Blendshape {
  categoryName: string;
  score: number;
}

// A new state to represent our tracking status
type TrackingStatus = "IDLE" | "INITIALIZING" | "RUNNING" | "ERROR";

export function useFaceTracking() {
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(
    null
  );
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("IDLE");
  const [blendshapes, setBlendshapes] = useState<Blendshape[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Memoize the prediction function so it's not recreated on every render
  const predictWebcam = useCallback(async () => {
    // Ensure everything is ready before predicting
    if (
      videoRef.current &&
      videoRef.current.readyState >= 3 && // Check if video has enough data
      faceLandmarker &&
      trackingStatus === "RUNNING"
    ) {
      const startTimeMs = performance.now();

      const results: FaceLandmarkerResult = faceLandmarker.detectForVideo(
        videoRef.current,
        startTimeMs
      );
      console.log("Raw detection results:", results);

      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        console.log(
          "Face tracking data detected:",
          results.faceBlendshapes[0].categories
        );
        setBlendshapes(results.faceBlendshapes[0].categories);
      }

      // Recursively call the function to continue the loop
      animationFrameId.current = window.requestAnimationFrame(predictWebcam);
    }
  }, [faceLandmarker, trackingStatus]);

  // Effect for initializing the face landmarker
  useEffect(() => {
    const initFaceLandmarker = async () => {
      try {
        setTrackingStatus("INITIALIZING");
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );
        const newFaceLandmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          }
        );
        setFaceLandmarker(newFaceLandmarker);
        setTrackingStatus("IDLE"); // Ready to start
      } catch (error) {
        console.error("Error initializing FaceLandmarker:", error);
        setTrackingStatus("ERROR");
      }
    };

    initFaceLandmarker();
  }, []);

  // Effect for managing the webcam and animation loop
  useEffect(() => {
    const video = videoRef.current;
    if (trackingStatus === "RUNNING") {
      // Start the webcam
      navigator.mediaDevices
        .getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          if (video) {
            video.srcObject = stream;
            video.play(); // Explicitly play the video to trigger onplaying
            // When video data is loaded, start the prediction loop
            video.onplaying = () => {
              animationFrameId.current =
                window.requestAnimationFrame(predictWebcam);
            };
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
          setTrackingStatus("ERROR");
        });
    } else {
      // Cleanup logic when tracking is stopped
      if (video && video.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        video.srcObject = null;
      }
      if (animationFrameId.current) {
        window.cancelAnimationFrame(animationFrameId.current);
      }
    }

    // Cleanup function to run when the component unmounts or trackingStatus changes
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

  // Function to be called by the UI button
  const toggleTracking = () => {
    if (trackingStatus === "RUNNING") {
      setTrackingStatus("IDLE");
    } else if (trackingStatus === "IDLE" && faceLandmarker) {
      setTrackingStatus("RUNNING");
    }
  };

  return {
    blendshapes,
    trackingStatus,
    toggleTracking,
    videoRef,
  };
}
