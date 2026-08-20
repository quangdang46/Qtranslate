import { LanguageCode, Language } from "@/domain/language";
import { TranslationRequest, TranslationResponse } from "@/domain/translation";
import { TranslationProvider } from "./translation-provider";

/**
 * OpenAI/GPT provider - placeholder for future implementation.
 */
export class OpenAIProvider implements TranslationProvider {
  readonly key = "openai";
  readonly name = "OpenAI";
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
    Language.ITALIAN,
    Language.DUTCH,
    Language.POLISH,
    Language.TURKISH,
  ];

  async translate(_request: TranslationRequest): Promise<TranslationResponse> {
    throw new Error("OpenAI provider not yet implemented");
  }

  async validate(): Promise<boolean> {
    return false;
  }
}
