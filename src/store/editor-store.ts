import { create } from "zustand";

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
  modelUrl: string;
  setModelUrl: (url: string) => void;

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

  showTrackingDebug: boolean;
  set: (fn: (state: EditorState) => Partial<EditorState>) => void;

  morphTargetDictionary: { [key: string]: number } | undefined;
  setMorphTargetDictionary: (
    dictionary: { [key: string]: number } | undefined
  ) => void;
  smoothingFactor: number;
  setSmoothingFactor: (factor: number) => void;
  showStats: boolean;
  toggleShowStats: () => void;
  areShadowsEnabled: boolean;
  toggleShadows: () => void;
}

export const initialCamera = {
  target: [0, 1.5, 0] as [number, number, number],
  position: [0, 1.5, -1.5] as [number, number, number],
};

export const useEditorStore = create<EditorState>((set) => ({
  cameraControls: { ...initialCamera },
  resetCamera: () => set({ cameraControls: { ...initialCamera } }),

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

  modelUrl: "/boy.vrm",
  setModelUrl: (url) => set({ modelUrl: url }),

  hideUiOnMouseOut: false,
  toggleHideUiOnMouseOut: () =>
    set((state) => ({ hideUiOnMouseOut: !state.hideUiOnMouseOut })),

  // Tracking toggles
  isFaceTrackingEnabled: true,
  toggleFaceTracking: () =>
    set((state) => ({ isFaceTrackingEnabled: !state.isFaceTrackingEnabled })),
  isPoseTrackingEnabled: true,
  togglePoseTracking: () =>
    set((state) => ({ isPoseTrackingEnabled: !state.isPoseTrackingEnabled })),
  isHeadTrackingEnabled: true,
  toggleHeadTracking: () =>
    set((state) => ({ isHeadTrackingEnabled: !state.isHeadTrackingEnabled })),
  isHandTrackingEnabled: true,
  toggleHandTracking: () =>
    set((state) => ({ isHandTrackingEnabled: !state.isHandTrackingEnabled })),
  isLegTrackingEnabled: false,
  toggleLegTracking: () =>
    set((state) => ({ isLegTrackingEnabled: !state.isLegTrackingEnabled })),
  isPupilTrackingEnabled: true,
  togglePupilTracking: () =>
    set((state) => ({ isPupilTrackingEnabled: !state.isPupilTrackingEnabled })),

  showTrackingDebug: true,

  set: (fn: (state: EditorState) => Partial<EditorState>) => set(fn),

  morphTargetDictionary: undefined,
  setMorphTargetDictionary: (
    dictionary: { [key: string]: number } | undefined
  ) => set({ morphTargetDictionary: dictionary }),
  smoothingFactor: 0.2,
  setSmoothingFactor: (factor: number) => set({ smoothingFactor: factor }),
  showStats: true,
  toggleShowStats: () => set((state) => ({ showStats: !state.showStats })),
  areShadowsEnabled: true,
  toggleShadows: () =>
    set((state) => ({ areShadowsEnabled: !state.areShadowsEnabled })),
  setFaceTracking: (value: boolean) => set({ isFaceTrackingEnabled: value }),
  setPoseTracking: (value: boolean) => set({ isPoseTrackingEnabled: value }),
  setHeadTracking: (value: boolean) => set({ isHeadTrackingEnabled: value }),
  setHandTracking: (value: boolean) => set({ isHandTrackingEnabled: value }),
  setLegTracking: (value: boolean) => set({ isLegTrackingEnabled: value }),
  setPupilTracking: (value: boolean) => set({ isPupilTrackingEnabled: value }),
  setShadows: (value: boolean) => set({ areShadowsEnabled: value }),
}));
