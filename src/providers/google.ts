import { invoke } from "@tauri-apps/api/core";
import { LanguageCode } from "@/domain/language";
import {
  TranslationRequest,
  TranslationResponse,
  TranslationResult,
  mapTranslationResult,
} from "@/domain/translation";
import { TranslationProvider } from "./translation-provider";

/**
 * Google Translate provider - thin wrapper calling Rust backend.
 * Does NOT call fetch() directly (CORS blocked in webview).
 */
export class GoogleProvider implements TranslationProvider {
  readonly key = "google";
  readonly name = "Google Translate";
  readonly supportedLanguages: LanguageCode[] = [
    LanguageCode.AUTO,
    "en",
    "vi",
    "ja",
    "zh-CN",
    "zh-TW",
    "ko",
    "fr",
    "de",
    "es",
    "pt",
    "ru",
    "ar",
    "hi",
    "th",
    "id",
    "ms",
    "tr",
    "it",
    "nl",
    "pl",
    "sv",
    "no",
    "da",
    "fi",
    "el",
    "cs",
    "ro",
    "hu",
    "uk",
    "fa",
    "he",
  ];

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const result = await invoke<TranslationResult>("translate_text", {
      text: request.text,
      sourceLang: request.sourceLanguage,
      targetLang: request.targetLanguage,
    });
    return mapTranslationResult(result);
  }

  async validate(): Promise<boolean> {
    try {
      const result = await this.translate({
        text: "hello",
        sourceLanguage: "en",
        targetLanguage: "vi",
      });
      return result.translatedText.length > 0;
    } catch {
      return false;
    }
  }
}
