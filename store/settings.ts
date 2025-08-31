"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createIdbStateStorage } from "@/lib/storage";

type SettingsState = {
  apiKey: string;
  model: string;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  reset: () => void;
};

const initial: Pick<SettingsState, "apiKey" | "model"> = {
  apiKey: "",
  model: "imagen-3.0",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initial,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "settings",
      storage: createJSONStorage(() => createIdbStateStorage("settings", "settings")),
      version: 1,
      partialize: (state) => ({ apiKey: state.apiKey, model: state.model }),
    }
  )
);
