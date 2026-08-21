import { create } from "zustand";
import { LanguageCode } from "@/domain/language";
import { TranslationResponse } from "@/domain/translation";
import { createHistoryEntry } from "@/domain/history";
import { translationService } from "@/services/translation";
import { historyService } from "@/services/history";
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
      // Record in history
      historyService.addEntry(
        createHistoryEntry(
          text,
          state.sourceLang,
          state.targetLang,
          response.translatedText,
          translationService.getActiveProvider().key,
        ),
      );
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
    // Actually hide the OS-level popup window too - flipping React state
    // alone unmounts the card but leaves the (still-visible) transparent
    // window behind, which on Windows can show a leftover ghost frame of
    // the last rendered content until the real window is hidden.
    if (typeof window !== "undefined" && window.__TAURI__) {
      invoke("hide_popup").catch(() => {});
    }
  },

  copyResult: async () => {
    const { translatedText } = get();
    if (translatedText) {
      await navigator.clipboard.writeText(translatedText);
    }
  },
}));

// Listen for Tauri events (only in Tauri environment, and only in the popup
// window). Both the main window and the popup window bundle this store, so
// without this guard both would independently invoke the same
// concurrency-guarded Rust commands for a single hotkey press — one of them
// always loses the race with "Operation already in progress".
if (typeof window !== "undefined" && window.__TAURI__) {
  Promise.all([import("@tauri-apps/api/event"), import("@tauri-apps/api/window")]).then(
    async ([{ listen }, { getCurrentWindow }]) => {
      if (getCurrentWindow().label !== "popup") {
        return;
      }

      listen("quick-translate", async () => {
        try {
          // Load fresh settings to get configured source/target languages
          const freshSettings = await invoke<{
            quickTranslate: { sourceLanguage: string; targetLanguage: string };
          }>("load_settings");

          // Set state to loading, show the popup card
          useTranslationStore.setState({
            isPopupVisible: true,
            isLoading: true,
            error: null,
            translatedText: "",
            sourceLang: freshSettings.quickTranslate.sourceLanguage as any,
            targetLang: freshSettings.quickTranslate.targetLanguage as any,
          });
          await invoke("show_popup");

          // Capture selected text
          const selectedText = await invoke<string>("get_selected_text");
          if (selectedText) {
            useTranslationStore.setState({ inputText: selectedText });
            await useTranslationStore.getState().translate(selectedText);
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
          // Load fresh settings to get configured source/target languages
          const freshSettings = await invoke<{
            replace: { sourceLanguage: string; targetLanguage: string };
          }>("load_settings");

          const result = await invoke<{
            source_text: string;
            translated_text: string;
          }>("replace_with_translation", {
            sourceLang: freshSettings.replace.sourceLanguage,
            targetLang: freshSettings.replace.targetLanguage,
          });
          console.log("Replace completed:", result);
          // Record in history
          historyService.addEntry(
            createHistoryEntry(
              result.source_text,
              freshSettings.replace.sourceLanguage as any,
              freshSettings.replace.targetLanguage as any,
              result.translated_text,
              translationService.getActiveProvider().key,
            ),
          );
        } catch (err) {
          console.error("Replace failed:", err);
        }
      });

    },
  );
}
