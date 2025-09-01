"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createIdbStateStorage } from "@/lib/storage";
import { DEFAULT_MODEL } from "@/lib/config";

type SettingsState = {
  apiKey: string;
  model: string;
  placeholderOnRateLimit: boolean;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setPlaceholderOnRateLimit: (v: boolean) => void;
  reset: () => void;
};

const initial: Pick<SettingsState, "apiKey" | "model" | "placeholderOnRateLimit"> = {
  apiKey: "",
  // Default to a Gemini image generation preview model
  model: DEFAULT_MODEL,
  placeholderOnRateLimit: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setPlaceholderOnRateLimit: (v) => set({ placeholderOnRateLimit: v }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "settings",
      storage: createJSONStorage(() => createIdbStateStorage("settings", "settings")),
      version: 1,
      partialize: (state) => ({ apiKey: state.apiKey, model: state.model, placeholderOnRateLimit: state.placeholderOnRateLimit }),
    }
  )
);
