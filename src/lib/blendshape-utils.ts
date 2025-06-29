import { VRM, VRMExpressionManager } from "@pixiv/three-vrm";

interface Blendshape {
  categoryName: string;
  score: number;
}

const blendshapeMap: { [key: string]: string } = {
  // --- ARKit to Custom VRM model Blendshapes ---

  // Eyes
  eyeBlinkLeft: "blinkLeft",
  eyeBlinkRight: "blinkRight",
  eyeWideLeft: "surprised",
  eyeWideRight: "surprised",

  // Brows (Emotions)
  browDownLeft: "angry",
  browDownRight: "angry",
  browInnerUp: "sad",

  // Jaw & Mouth
  jawOpen: "aa",
  mouthFunnel: "ou",
  mouthPucker: "oh",
  mouthStretchLeft: "ee",
  mouthStretchRight: "ee",
  mouthSmileLeft: "happy",
  mouthSmileRight: "happy",
  mouthFrownLeft: "sad",
  mouthFrownRight: "sad",
  mouthDimpleLeft: "relaxed",
  mouthDimpleRight: "relaxed",
  mouthLowerDownLeft: "ih",
  mouthLowerDownRight: "ih",
};

// =================================================================
// ADVANCED EXPRESSION CONFIGURATION
// =================================================================

interface ExpressionConfig {
  threshold?: number;
  smoothing?: number;
  ceiling?: number;
  sensitivity?: number;
  isDecisive?: boolean; // For blinks - snaps to 0 or 1
  suppresses?: string[];
  suppressedBy?: string[];
  priority?: number; // Higher values win in group conflicts
  activateThreshold?: number; // Hysteresis activation
  deactivateThreshold?: number; // Hysteresis deactivation
}

const expressionSettings: Record<string, ExpressionConfig> = {
  // Speech - High priority for distinct shapes to override general mouth opening
  aa: {
    threshold: 0.05,
    smoothing: 0.2,
    sensitivity: 0.4,
    ceiling: 0.8,
    priority: 0.5,
  },
  ee: {
    threshold: 0.1,
    smoothing: 0.2,
    sensitivity: 0.45,
    priority: 2.0,
  },
  ih: {
    threshold: 0.1,
    smoothing: 0.2,
    sensitivity: 0.45,
    priority: 2.0,
  },
  oh: {
    threshold: 0.1,
    smoothing: 0.2,
    sensitivity: 0.45,
    ceiling: 0.5,
    priority: 2.0,
  },
  ou: {
    threshold: 0.1,
    smoothing: 0.2,
    sensitivity: 0.45,
    priority: 2.0,
  },

  // Emotions
  happy: { threshold: 0.2, smoothing: 0.25, suppressedBy: ["sad", "angry"] },
  sad: { threshold: 0.2, smoothing: 0.25, suppresses: ["happy"] },
  angry: { threshold: 0.3, smoothing: 0.3, suppresses: ["happy"] },
  relaxed: { threshold: 0.2, smoothing: 0.2 },
  surprised: {
    threshold: 0.4,
    smoothing: 0.1,
    suppresses: ["happy", "sad", "angry"],
  },

  // Eyes
  blinkLeft: {
    activateThreshold: 0.45,
    deactivateThreshold: 0.3,
    smoothing: 0.3,
  },
  blinkRight: {
    activateThreshold: 0.45,
    deactivateThreshold: 0.3,
    smoothing: 0.3,
  },
};

// Configuration for preventing jitter
const ACTIVATION_FRAMES_THRESHOLD = 2; // Frames above threshold to activate
const DEACTIVATION_FRAMES_THRESHOLD = 5; // Frames below threshold to deactivate

// Groups for regulating cumulative expression values
const MOUTH_MOTION_GROUP = {
  expressions: ["aa", "ou", "oh", "ee", "ih", "happy", "sad", "relaxed"],
  ceiling: 1.4, // Max cumulative value for all mouth-related expressions
};

// =================================================================
// EXPRESSION PROCESSING LOGIC
// =================================================================

interface ExpressionState {
  currentValue: number;
  isActive: boolean;
  activationCounter: number;
  deactivationCounter: number;
  finalTarget: number;
}

const expressionStates: Record<string, ExpressionState> = {};

const initializeStates = (expressionManager: VRMExpressionManager) => {
  for (const name of Object.keys(expressionManager.expressionMap)) {
    expressionStates[name] = {
      currentValue: 0,
      isActive: false,
      activationCounter: 0,
      deactivationCounter: 0,
      finalTarget: 0,
    };
  }
};

export const applyBlendshapes = (vrm: VRM, blendshapes: Blendshape[]) => {
  const expressionManager = vrm.expressionManager;
  if (!expressionManager) return;

  if (Object.keys(expressionStates).length === 0) {
    initializeStates(expressionManager);
  }

  // 1. Process Raw Inputs
  const rawScores: Record<string, number> = {};
  blendshapes.forEach((blendshape) => {
    const name = blendshapeMap[blendshape.categoryName];
    if (name) {
      rawScores[name] = Math.max(rawScores[name] || 0, blendshape.score);
    }
  });

  // 2. Update State & Handle Jitter
  for (const name in expressionStates) {
    const state = expressionStates[name];
    const config = expressionSettings[name] || {};
    const rawValue = rawScores[name] || 0;

    // Use hysteresis for blinks/expressions with dual thresholds for stability
    if (config.activateThreshold && config.deactivateThreshold) {
      if (rawValue > config.activateThreshold) state.isActive = true;
      else if (rawValue < config.deactivateThreshold) state.isActive = false;
      // If in the dead zone, state does not change.
    } else {
      // Use frame counters for other expressions
      if (rawValue > (config.threshold ?? 0)) {
        state.activationCounter++;
        state.deactivationCounter = 0;
      } else {
        state.activationCounter = 0;
        state.deactivationCounter++;
      }

      if (state.activationCounter > ACTIVATION_FRAMES_THRESHOLD)
        state.isActive = true;
      if (state.deactivationCounter > DEACTIVATION_FRAMES_THRESHOLD)
        state.isActive = false;
    }

    // Calculate initial target value
    state.finalTarget = 0;
    if (state.isActive) {
      let target = rawValue;
      if (config.sensitivity) target = Math.pow(target, config.sensitivity);
      // For dual-threshold expressions, the target is a simple 0 or 1
      const isHysteresis =
        config.activateThreshold && config.deactivateThreshold;
      state.finalTarget = isHysteresis ? (state.isActive ? 1 : 0) : target;
    }
  }

  // 3. Apply Suppression Rules
  for (const name in expressionStates) {
    const state = expressionStates[name];
    if (!state.isActive) continue;

    const config = expressionSettings[name] || {};
    config.suppresses?.forEach((suppressedName) => {
      if (expressionStates[suppressedName]) {
        expressionStates[suppressedName].finalTarget = 0;
      }
    });
    config.suppressedBy?.forEach((suppressorName) => {
      if (expressionStates[suppressorName]?.isActive) {
        state.finalTarget = 0;
      }
    });
  }

  // 4. Apply Ceilings and Group Prioritization
  // First, apply individual expression ceilings
  for (const name in expressionStates) {
    const state = expressionStates[name];
    const config = expressionSettings[name] || {};
    if (config.ceiling) {
      state.finalTarget = Math.min(state.finalTarget, config.ceiling);
    }
  }

  // Then, handle cumulative group ceilings with prioritization
  const group = MOUTH_MOTION_GROUP;
  let groupTotal = 0;
  let dominantExpr = { name: "", weightedValue: -1, originalValue: -1 };

  // Find the dominant expression in the group using weights
  for (const name of group.expressions) {
    const state = expressionStates[name];
    const config = expressionSettings[name] || {};
    const priority = config.priority || 1.0;
    const originalValue = state.finalTarget;
    const weightedValue = originalValue * priority;

    if (weightedValue > dominantExpr.weightedValue) {
      dominantExpr = { name, weightedValue, originalValue };
    }
    groupTotal += originalValue;
  }

  // If the group total exceeds the ceiling, re-distribute values to prioritize the dominant expression
  if (groupTotal > group.ceiling && dominantExpr.name) {
    const dominantValue = dominantExpr.originalValue;
    const newDominantValue = Math.min(dominantValue, group.ceiling);

    const remainingCapacity = group.ceiling - newDominantValue;
    const othersTotal = groupTotal - dominantValue;

    // Scale down the other expressions to fit in the remaining space
    const scale = othersTotal > 0 ? remainingCapacity / othersTotal : 0;

    expressionStates[dominantExpr.name].finalTarget = newDominantValue;

    for (const name of group.expressions) {
      if (name !== dominantExpr.name) {
        expressionStates[name].finalTarget *= scale;
      }
    }
  }

  // 5. Apply Smoothing and Final Value to VRM
  for (const name in expressionStates) {
    const state = expressionStates[name];
    const config = expressionSettings[name] || {};
    const smoothing = config.smoothing ?? 0.2; // Default smoothing
    state.currentValue += (state.finalTarget - state.currentValue) * smoothing;
    expressionManager.setValue(name, state.currentValue);
  }

  expressionManager.update();
};
