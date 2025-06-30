import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LightName = "ambient" | "directional" | "spot1" | "spot2";

export interface LightSettings {
  intensity: number;
  color: string;
  position: [number, number, number];
}

interface EditorState {
  // Camera
  cameraControls: {
    target: [number, number, number];
    position: [number, number, number];
  };
  resetCamera: () => void;

  // Scene
  showGround: boolean;
  toggleGround: () => void;

  // Lighting
  lights: {
    ambient: { intensity: number };
    directional: LightSettings;
    spot1: LightSettings;
    spot2: LightSettings;
  };
  setLight: (
    type: keyof EditorState["lights"],
    settings: Partial<LightSettings | { intensity: number }>
  ) => void;

  // Model
  selectedModelUrl: string;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  customModel: File | null;
  setCustomModel: (file: File) => void;

  // UI
  hideUiOnMouseOut: boolean;
  toggleHideUiOnMouseOut: () => void;

  // Tracking toggles
  isFaceTrackingEnabled: boolean;
  toggleFaceTracking: () => void;
  isPoseTrackingEnabled: boolean;
  togglePoseTracking: () => void;
  isHeadTrackingEnabled: boolean;
  toggleHeadTracking: () => void;
  isHandTrackingEnabled: boolean;
  toggleHandTracking: () => void;
  isLegTrackingEnabled: boolean;
  toggleLegTracking: () => void;
  isPupilTrackingEnabled: boolean;
  togglePupilTracking: () => void;
  isSmoothingEnabled: boolean;
  toggleSmoothing: () => void;
  globalSmoothingFactor: number;
  setGlobalSmoothingFactor: (factor: number) => void;

  showTrackingDebug: boolean;
  set: (fn: (state: EditorState) => Partial<EditorState>) => void;

  morphTargetDictionary: { [key: string]: number } | undefined;
  setMorphTargetDictionary: (
    dictionary: { [key: string]: number } | undefined
  ) => void;
  showStats: boolean;
  toggleShowStats: () => void;
  areShadowsEnabled: boolean;
  toggleShadows: () => void;
  isGreenScreenEnabled: boolean;
  toggleGreenScreen: () => void;
}

export const initialCamera = {
  target: [0, 1.5, 0] as [number, number, number],
  position: [0, 1.5, -1.5] as [number, number, number],
};

const modelCameraPositions: Record<
  string,
  { target: [number, number, number]; position: [number, number, number] }
> = {
  witch: {
    target: [0, 1.25, 0],
    position: [0, 1.25, -1.5],
  },
  girl: {
    target: [0, 1.35, 0],
    position: [0, 1.35, -1.5],
  },
  boy: {
    target: [0, 1.45, 0],
    position: [0, 1.45, -1.5],
  },
  horny: {
    target: [0, 1.35, 0],
    position: [0, 1.35, -1.5],
  },
  cute: {
    target: [0, 1.4, 0],
    position: [0, 1.4, -1.5],
  },
  cat: {
    target: [0, 1.5, 0],
    position: [0, 1.5, -1.5],
  },
};

const getModelUrl = (modelName: string) => {
  return `vrm/${modelName}.vrm`;
};

const getModelCameraPositions = (modelName: string) => {
  return modelCameraPositions[modelName] || modelCameraPositions["boy"];
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      cameraControls: { ...initialCamera },
      resetCamera: () => {
        const currentModel = get().selectedModel;
        const newCamera = getModelCameraPositions(currentModel);
        set({
          cameraControls: {
            target: newCamera.target as [number, number, number],
            position: newCamera.position as [number, number, number],
          },
        });
      },

      showGround: true,
      toggleGround: () => set((state) => ({ showGround: !state.showGround })),

      lights: {
        ambient: { intensity: 0.2 },
        directional: {
          intensity: 1.5,
          color: "#ffffff",
          position: [2, 5, -3],
        },
        spot1: {
          intensity: 0.3,
          color: "#aaccff",
          position: [-2, 1, -4],
        },
        spot2: {
          intensity: 0.2,
          color: "#ff88aa",
          position: [0, -2, 5],
        },
      },
      setLight: (type, settings) =>
        set((state) => ({
          lights: {
            ...state.lights,
            [type]: { ...state.lights[type], ...settings },
          },
        })),

      selectedModel: "girl",
      customModel: null,
      selectedModelUrl: getModelUrl("girl"),
      setSelectedModel: (model) =>
        set({
          selectedModel: model,
          selectedModelUrl: getModelUrl(model),
          customModel: null,
          morphTargetDictionary: undefined,
          cameraControls: getModelCameraPositions(model),
        }),
      setCustomModel: (file) => {
        const customModelUrl = URL.createObjectURL(file);
        set({
          selectedModel: customModelUrl,
          selectedModelUrl: customModelUrl,
          customModel: file,
          morphTargetDictionary: undefined,
        });
      },

      hideUiOnMouseOut: true,
      toggleHideUiOnMouseOut: () =>
        set((state) => ({ hideUiOnMouseOut: !state.hideUiOnMouseOut })),

      // Tracking toggles
      isFaceTrackingEnabled: true,
      toggleFaceTracking: () =>
        set((state) => ({
          isFaceTrackingEnabled: !state.isFaceTrackingEnabled,
        })),
      isPoseTrackingEnabled: true,
      togglePoseTracking: () =>
        set((state) => ({
          isPoseTrackingEnabled: !state.isPoseTrackingEnabled,
        })),
      isHeadTrackingEnabled: true,
      toggleHeadTracking: () =>
        set((state) => ({
          isHeadTrackingEnabled: !state.isHeadTrackingEnabled,
        })),
      isHandTrackingEnabled: true,
      toggleHandTracking: () =>
        set((state) => ({
          isHandTrackingEnabled: !state.isHandTrackingEnabled,
        })),
      isLegTrackingEnabled: false,
      toggleLegTracking: () =>
        set((state) => ({ isLegTrackingEnabled: !state.isLegTrackingEnabled })),
      isPupilTrackingEnabled: true,
      togglePupilTracking: () =>
        set((state) => ({
          isPupilTrackingEnabled: !state.isPupilTrackingEnabled,
        })),
      isSmoothingEnabled: true,
      toggleSmoothing: () =>
        set((state) => ({ isSmoothingEnabled: !state.isSmoothingEnabled })),
      globalSmoothingFactor: 0.8,
      setGlobalSmoothingFactor: (factor: number) =>
        set({ globalSmoothingFactor: factor }),

      showTrackingDebug: true,

      set: (fn: (state: EditorState) => Partial<EditorState>) => set(fn),

      morphTargetDictionary: undefined,
      setMorphTargetDictionary: (
        dictionary: { [key: string]: number } | undefined
      ) => set({ morphTargetDictionary: dictionary }),
      showStats: true,
      toggleShowStats: () => set((state) => ({ showStats: !state.showStats })),
      areShadowsEnabled: true,
      toggleShadows: () =>
        set((state) => ({ areShadowsEnabled: !state.areShadowsEnabled })),
      isGreenScreenEnabled: false,
      toggleGreenScreen: () =>
        set((state) => ({
          isGreenScreenEnabled: !state.isGreenScreenEnabled,
        })),
      setFaceTracking: (value: boolean) =>
        set({ isFaceTrackingEnabled: value }),
      setPoseTracking: (value: boolean) =>
        set({ isPoseTrackingEnabled: value }),
      setHeadTracking: (value: boolean) =>
        set({ isHeadTrackingEnabled: value }),
      setHandTracking: (value: boolean) =>
        set({ isHandTrackingEnabled: value }),
      setLegTracking: (value: boolean) => set({ isLegTrackingEnabled: value }),
      setPupilTracking: (value: boolean) =>
        set({ isPupilTrackingEnabled: value }),
      setShadows: (value: boolean) => set({ areShadowsEnabled: value }),
    }),
    {
      name: "vtube-studio-editor-storage",
    }
  )
);
