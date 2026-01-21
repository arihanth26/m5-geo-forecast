// src/store/useMapStore.ts
"use client";

import { create } from "zustand";

export type ViewMode = "actual" | "forecast" | "abs_error";
export type ModelKey = "sarimax" | "lgbm" | "lstm";

type MapState = {
  t: number;
  setT: (v: number | ((prev: number) => number)) => void;

  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  model: ModelKey;
  setModel: (m: ModelKey) => void;
};

export const useMapStore = create<MapState>((set) => ({
  t: 0,
  setT: (v) =>
    set((s) => ({
      t: typeof v === "function" ? (v as (p: number) => number)(s.t) : v,
    })),

  viewMode: "actual",
  setViewMode: (viewMode) => set({ viewMode }),

  model: "sarimax",
  setModel: (model) => set({ model }),
}));
