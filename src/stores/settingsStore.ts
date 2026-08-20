import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { AppSettings, DEFAULT_SETTINGS } from "@/domain/settings";

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  updateQuickTranslate: (partial: Partial<AppSettings["quickTranslate"]>) => void;
  updateReplace: (partial: Partial<AppSettings["replace"]>) => void;
  setActiveProvider: (provider: string) => void;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings>("load_settings");
      set({ settings, isLoaded: true });
    } catch (err) {
      console.error("Failed to load settings:", err);
      set({ isLoaded: true });
    }
  },

  updateQuickTranslate: (partial) => {
    set((state) => ({
      settings: {
        ...state.settings,
        quickTranslate: { ...state.settings.quickTranslate, ...partial },
      },
    }));
  },

  updateReplace: (partial) => {
    set((state) => ({
      settings: {
        ...state.settings,
        replace: { ...state.settings.replace, ...partial },
      },
    }));
  },

  setActiveProvider: (provider) => {
    set((state) => ({
      settings: { ...state.settings, activeProvider: provider },
    }));
  },

  saveSettings: async () => {
    const { settings } = get();
    try {
      await invoke("save_settings", { settings });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  },
}));

// Load settings on startup
if (typeof window !== "undefined" && window.__TAURI__) {
  useSettingsStore.getState().loadSettings();
}
