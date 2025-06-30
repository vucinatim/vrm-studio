import {
  HolisticLandmarker,
  FilesetResolver,
  HolisticLandmarkerResult,
  NormalizedLandmark,
  Landmark,
} from "@mediapipe/tasks-vision";
import KalmanFilter from "kalmanjs";

let holistic: HolisticLandmarker | null = null;

// --- Filter Banks and Parameters ---
const poseWorldLandmarkFilters: {
  x: KalmanFilter;
  y: KalmanFilter;
  z: KalmanFilter;
}[] = [];
const poseScreenLandmarkFilters: {
  x: KalmanFilter;
  y: KalmanFilter;
  z: KalmanFilter;
}[] = [];
const faceLandmarkFilters: {
  x: KalmanFilter;
  y: KalmanFilter;
  z: KalmanFilter;
}[] = [];
const leftHandLandmarkFilters: {
  x: KalmanFilter;
  y: KalmanFilter;
  z: KalmanFilter;
}[] = [];
const rightHandLandmarkFilters: {
  x: KalmanFilter;
  y: KalmanFilter;
  z: KalmanFilter;
}[] = [];

const R = 0.01;
let Q = 4;

function initializeFilters() {
  poseWorldLandmarkFilters.length = 0;
  poseScreenLandmarkFilters.length = 0;
  faceLandmarkFilters.length = 0;
  leftHandLandmarkFilters.length = 0;
  rightHandLandmarkFilters.length = 0;
  const POSE_LANDMARKS_COUNT = 33;
  const FACE_LANDMARKS_COUNT = 478;
  const HAND_LANDMARKS_COUNT = 21;
  for (let i = 0; i < POSE_LANDMARKS_COUNT; i++) {
    poseWorldLandmarkFilters.push({
      x: new KalmanFilter({ R, Q }),
      y: new KalmanFilter({ R, Q }),
      z: new KalmanFilter({ R, Q }),
    });
    poseScreenLandmarkFilters.push({
      x: new KalmanFilter({ R, Q }),
      y: new KalmanFilter({ R, Q }),
      z: new KalmanFilter({ R, Q }),
    });
  }
  for (let i = 0; i < FACE_LANDMARKS_COUNT; i++) {
    faceLandmarkFilters.push({
      x: new KalmanFilter({ R, Q }),
      y: new KalmanFilter({ R, Q }),
      z: new KalmanFilter({ R, Q }),
    });
  }
  for (let i = 0; i < HAND_LANDMARKS_COUNT; i++) {
    leftHandLandmarkFilters.push({
      x: new KalmanFilter({ R, Q }),
      y: new KalmanFilter({ R, Q }),
      z: new KalmanFilter({ R, Q }),
    });
    rightHandLandmarkFilters.push({
      x: new KalmanFilter({ R, Q }),
      y: new KalmanFilter({ R, Q }),
      z: new KalmanFilter({ R, Q }),
    });
  }
}

async function initializeHolistic() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    holistic = await HolisticLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      outputFaceBlendshapes: true,
    });
    initializeFilters();
    self.postMessage({ type: "READY" });
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      payload: `Initialization failed: ${(error as Error).message}`,
    });
  }
}

function smoothLandmarks<T extends Landmark | NormalizedLandmark>(
  landmarks: T[],
  filters: { x: KalmanFilter; y: KalmanFilter; z: KalmanFilter }[]
): T[] {
  if (!landmarks) return [];
  return landmarks.map((landmark, index) => {
    const filter = filters[index];
    if (!filter) return landmark;
    return {
      ...landmark,
      x: filter.x.filter(landmark.x),
      y: filter.y.filter(landmark.y),
      z: filter.z.filter(landmark.z),
    };
  });
}

function transformLandmarks<T extends Landmark | NormalizedLandmark>(
  landmarks: T[]
): T[] {
  if (!landmarks) return [];
  return landmarks.map((lm) => ({ ...lm, x: -lm.x, y: -lm.y }));
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "INITIALIZE":
      await initializeHolistic();
      break;
    case "UPDATE_SMOOTHING":
      Q = 0.01 + payload * 0.2;
      initializeFilters();
      break;
    case "PREDICT":
      if (holistic && payload) {
        const { imageBitmap, isSmoothingEnabled } = payload;
        try {
          const rawResults = holistic.detect(imageBitmap);

          // --- The Fix ---
          // Determine the base data for transformation. Use smoothed data if enabled, otherwise use raw.
          let dataForRigging = rawResults;
          let dataForDebug = rawResults;

          if (isSmoothingEnabled) {
            const smoothedResults: HolisticLandmarkerResult = {
              ...rawResults,
              faceLandmarks: rawResults.faceLandmarks?.map((l) =>
                smoothLandmarks(l, faceLandmarkFilters)
              ),
              // poseLandmarks: rawResults.poseLandmarks?.map((l) =>
              //   smoothLandmarks(l, poseScreenLandmarkFilters)
              // ),
              // poseWorldLandmarks: rawResults.poseWorldLandmarks?.map((l) =>
              //   smoothLandmarks(l, poseWorldLandmarkFilters)
              // ),
              leftHandLandmarks: rawResults.leftHandLandmarks?.map((l) =>
                smoothLandmarks(l, leftHandLandmarkFilters)
              ),
              rightHandLandmarks: rawResults.rightHandLandmarks?.map((l) =>
                smoothLandmarks(l, rightHandLandmarkFilters)
              ),
            };
            dataForRigging = smoothedResults;
            dataForDebug = smoothedResults;
          }

          // Always transform the data intended for the rigging model.
          const riggingResults: HolisticLandmarkerResult = {
            ...dataForRigging,
            faceLandmarks:
              dataForRigging.faceLandmarks?.map(transformLandmarks),
            poseLandmarks:
              dataForRigging.poseLandmarks?.map(transformLandmarks),
            poseWorldLandmarks:
              dataForRigging.poseWorldLandmarks?.map(transformLandmarks),
            leftHandWorldLandmarks:
              dataForRigging.leftHandWorldLandmarks?.map(transformLandmarks),
            rightHandWorldLandmarks:
              dataForRigging.rightHandWorldLandmarks?.map(transformLandmarks),
          };

          // Post both sets of data back. `dataForDebug` is either raw or smoothed. `riggingResults` is always transformed.
          self.postMessage({
            type: "RESULTS",
            payload: { raw: dataForDebug, rigging: riggingResults },
          });
        } catch (error) {
          console.error("Holistic Worker: Error during prediction.", error);
        } finally {
          imageBitmap.close();
        }
      }
      break;
  }
};
