import { LanguageCode } from "./language";

/**
 * Quick Translate configuration (Ctrl+Q).
 */
export interface QuickTranslateConfig {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  hotkey: string;
}

/**
 * Replace translation configuration (Ctrl+Alt+W).
 */
export interface ReplaceConfig {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  hotkey: string;
}

/**
 * Application settings.
 */
export interface AppSettings {
  quickTranslate: QuickTranslateConfig;
  replace: ReplaceConfig;
  activeProvider: string;
}

/**
 * Default settings.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  quickTranslate: {
    sourceLanguage: "auto",
    targetLanguage: "vi",
    hotkey: "CmdOrCtrl+Q",
  },
  replace: {
    sourceLanguage: "auto",
    targetLanguage: "en",
    hotkey: "CmdOrCtrl+Alt+W",
  },
  activeProvider: "google",
};
