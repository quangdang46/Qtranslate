import { LanguageCode } from "./language";

/**
 * History entry for a translation.
 */
export interface HistoryEntry {
  id: string;
  sourceText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  translatedText: string;
  provider: string;
  timestamp: number;
}

/**
 * Create a new history entry.
 */
export function createHistoryEntry(
  sourceText: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
  translatedText: string,
  provider: string,
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    sourceText,
    sourceLanguage,
    targetLanguage,
    translatedText,
    provider,
    timestamp: Date.now(),
  };
}
