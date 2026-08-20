import { LanguageCode, Language } from "@/domain/language";
import { TranslationRequest, TranslationResponse } from "@/domain/translation";
import { TranslationProvider } from "./translation-provider";

/**
 * Microsoft Translator provider - placeholder for future implementation.
 */
export class MicrosoftProvider implements TranslationProvider {
  readonly key = "microsoft";
  readonly name = "Microsoft Translator";
  readonly supportedLanguages: LanguageCode[] = [
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
    Language.ITALIAN,
    Language.DUTCH,
    Language.POLISH,
    Language.TURKISH,
  ];

  async translate(_request: TranslationRequest): Promise<TranslationResponse> {
    throw new Error("Microsoft Translator provider not yet implemented");
  }

  async validate(): Promise<boolean> {
    return false;
  }
}
