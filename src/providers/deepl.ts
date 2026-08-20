import { LanguageCode, Language } from "@/domain/language";
import { TranslationRequest, TranslationResponse } from "@/domain/translation";
import { TranslationProvider } from "./translation-provider";

/**
 * DeepL provider - placeholder for future implementation.
 */
export class DeepLProvider implements TranslationProvider {
  readonly key = "deepl";
  readonly name = "DeepL";
  readonly supportedLanguages: LanguageCode[] = [
    Language.ENGLISH,
    Language.VIETNAMESE,
    Language.JAPANESE,
    Language.CHINESE_SIMPLIFIED,
    Language.KOREAN,
    Language.FRENCH,
    Language.GERMAN,
    Language.SPANISH,
    Language.PORTUGUESE,
    Language.RUSSIAN,
    Language.ITALIAN,
    Language.DUTCH,
    Language.POLISH,
    Language.TURKISH,
  ];

  async translate(_request: TranslationRequest): Promise<TranslationResponse> {
    throw new Error("DeepL provider not yet implemented");
  }

  async validate(): Promise<boolean> {
    return false;
  }
}
