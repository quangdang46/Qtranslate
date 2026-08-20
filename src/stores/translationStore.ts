import { create } from "zustand";
import { LanguageCode } from "@/domain/language";
import { TranslationResponse } from "@/domain/translation";
import { translationService } from "@/services/translation";
import { invoke } from "@tauri-apps/api/core";

interface TranslationState {
  // State
  inputText: string;
  translatedText: string;
  isLoading: boolean;
  error: string | null;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  isPopupVisible: boolean;

  // Actions
  setInputText: (text: string) => void;
  setSourceLang: (lang: LanguageCode) => void;
  setTargetLang: (lang: LanguageCode) => void;
  translate: (text?: string) => Promise<void>;
  showPopup: (selectedText: string) => void;
  hidePopup: () => void;
  copyResult: () => Promise<void>;
}

export const useTranslationStore = create<TranslationState>((set, get) => ({
  // Initial state
  inputText: "",
  translatedText: "",
  isLoading: false,
  error: null,
  sourceLang: "auto",
  targetLang: "vi",
  isPopupVisible: false,

  // Actions
  setInputText: (text) => set({ inputText: text }),

  setSourceLang: (lang) => set({ sourceLang: lang }),

  setTargetLang: (lang) => set({ targetLang: lang }),

  translate: async (textOverride?: string) => {
    const state = get();
    const text = textOverride || state.inputText;

    if (!text.trim()) {
      set({ translatedText: "", error: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await translationService.quickTranslate(
        text,
        state.targetLang,
        state.sourceLang,
      );
      set({
        translatedText: response.translatedText,
        isLoading: false,
        inputText: text,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Translation failed",
        isLoading: false,
      });
    }
  },

  showPopup: (selectedText: string) => {
    set({
      isPopupVisible: true,
      inputText: selectedText,
      isLoading: true,
      error: null,
      translatedText: "",
    });
    // Auto-translate
    get().translate(selectedText);
  },

  hidePopup: () => {
    set({
      isPopupVisible: false,
      isLoading: false,
      error: null,
    });
  },

  copyResult: async () => {
    const { translatedText } = get();
    if (translatedText) {
      await navigator.clipboard.writeText(translatedText);
    }
  },
}));

// Listen for Tauri events (only in Tauri environment)
if (typeof window !== "undefined" && window.__TAURI__) {
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen("quick-translate", async () => {
      try {
        // Show popup immediately with loading state
        useTranslationStore.setState({
          isPopupVisible: true,
          isLoading: true,
          error: null,
          translatedText: "",
        });
        // Show popup window at cursor position
        await invoke("show_popup");

        // Capture selected text
        const selectedText = await invoke<string>("get_selected_text");
        if (selectedText) {
          useTranslationStore.setState({ inputText: selectedText });
          // Now translate
          useTranslationStore.getState().translate(selectedText);
        } else {
          useTranslationStore.setState({
            error: "No text selected",
            isLoading: false,
          });
        }
      } catch (err) {
        console.error("Failed to get selected text:", err);
        useTranslationStore.setState({
          error: "Failed to capture text",
          isLoading: false,
        });
      }
    });

    listen("replace-translate", async () => {
      try {
        const state = useTranslationStore.getState();
        const result = await invoke<string>("replace_with_translation", {
          sourceLang: state.sourceLang,
          targetLang: state.targetLang,
        });
        console.log("Replace completed:", result);
      } catch (err) {
        console.error("Replace failed:", err);
      }
    });
  });
}
