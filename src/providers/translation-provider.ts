import { LanguageCode } from "@/domain/language";
import { TranslationRequest, TranslationResponse } from "@/domain/translation";

/**
 * TranslationProvider - contract for all translation providers.
 * Each provider implements this interface and calls Rust backend via invoke().
 */
export interface TranslationProvider {
  readonly key: string;
  readonly name: string;
  readonly supportedLanguages: LanguageCode[];

  translate(request: TranslationRequest): Promise<TranslationResponse>;
  validate(): Promise<boolean>;
}
