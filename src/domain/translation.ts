import { LanguageCode } from "./language";

/**
 * Translation request sent from TypeScript to Rust backend via invoke().
 */
export interface TranslationRequest {
  text: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

/**
 * Translation response returned from Rust backend.
 */
export interface TranslationResponse {
  translatedText: string;
  detectedLanguage: LanguageCode | null;
}

/**
 * Translation error with retry information.
 */
export interface TranslationError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Rust-side TranslationResult returned by invoke().
 * Maps 1:1 to TranslationResponse.
 */
export interface TranslationResult {
  translated_text: string;
  detected_language: string | null;
}

/**
 * Maps Rust TranslationResult to TypeScript TranslationResponse.
 */
export function mapTranslationResult(result: TranslationResult): TranslationResponse {
  return {
    translatedText: result.translated_text,
    detectedLanguage: result.detected_language as LanguageCode | null,
  };
}
