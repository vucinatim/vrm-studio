import { create } from "zustand";

const HISTORY_SIZE = 100; // Store last 100 readings for a rolling average

interface PerformanceState {
  workerTimings: number[];
  averageWorkerTime: number;
  addWorkerTiming: (timing: number) => void;
}

export const usePerformanceStore = create<PerformanceState>((set, get) => ({
  workerTimings: [],
  averageWorkerTime: 0,
  addWorkerTiming: (timing) => {
    const newTimings = [...get().workerTimings, timing];
    if (newTimings.length > HISTORY_SIZE) {
      newTimings.shift(); // Keep the array size fixed
    }
    const average = newTimings.reduce((a, b) => a + b, 0) / newTimings.length;
    set({
      workerTimings: newTimings,
      averageWorkerTime: average,
    });
  },
}));
