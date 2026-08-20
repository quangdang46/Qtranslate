import { invoke } from "@tauri-apps/api/core";
import { LanguageCode, Language } from "@/domain/language";
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
    Language.AUTO,
    Language.ENGLISH,
    Language.VIETNAMESE,
    Language.JAPANESE,
    Language.CHINESE_SIMPLIFIED,
    Language.CHINESE_TRADITIONAL,
    Language.KOREAN,
    Language.FRENCH,
    Language.GERMAN,
    Language.SPANISH,
    Language.PORTUGUESE,
    Language.RUSSIAN,
    Language.ARABIC,
    Language.HINDI,
    Language.THAI,
    Language.INDONESIAN,
    Language.MALAY,
    Language.TURKISH,
    Language.ITALIAN,
    Language.DUTCH,
    Language.POLISH,
    Language.SWEDISH,
    Language.NORWEGIAN,
    Language.DANISH,
    Language.FINNISH,
    Language.GREEK,
    Language.CZECH,
    Language.ROMANIAN,
    Language.HUNGARIAN,
    Language.UKRAINIAN,
    Language.PERSIAN,
    Language.HEBREW,
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
