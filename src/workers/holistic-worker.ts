import { HolisticLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let holistic: HolisticLandmarker | null = null;

async function initializeHolistic() {
  console.log("Holistic Worker: Initializing...");
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
      // @ts-expect-error - This is a valid option but not in the type definition
      outputFaceLandmarks: true,
      outputPoseLandmarks: true,
      outputPoseWorldLandmarks: true,
    });

    console.log("Holistic Worker: Initialized successfully.");
    self.postMessage({ type: "READY" });
  } catch (error) {
    console.error("Holistic Worker: Initialization failed.", error);
    self.postMessage({
      type: "ERROR",
      payload: `Initialization failed: ${(error as Error).message}`,
    });
  }
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "INITIALIZE":
      await initializeHolistic();
      break;
    case "PREDICT":
      if (holistic && payload) {
        try {
          const results = holistic.detect(payload);
          self.postMessage({ type: "RESULTS", payload: results });
        } catch (error) {
          console.error("Holistic Worker: Error during prediction.", error);
        } finally {
          // In IMAGE mode, we are responsible for closing the bitmap
          payload.close();
        }
      }
      break;
  }
};
