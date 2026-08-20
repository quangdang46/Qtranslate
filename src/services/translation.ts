import { LanguageCode } from "@/domain/language";
import { TranslationRequest, TranslationResponse } from "@/domain/translation";
import { TranslationProvider } from "@/providers/translation-provider";
import { GoogleProvider } from "@/providers/google";
import { DeepLProvider } from "@/providers/deepl";
import { MicrosoftProvider } from "@/providers/microsoft";
import { OpenAIProvider } from "@/providers/openai";

/**
 * TranslationService - orchestrates providers and manages state.
 */
class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map();
  private activeProviderKey: string = "google";

  constructor() {
    this.registerProvider(new GoogleProvider());
    this.registerProvider(new DeepLProvider());
    this.registerProvider(new MicrosoftProvider());
    this.registerProvider(new OpenAIProvider());
  }

  registerProvider(provider: TranslationProvider): void {
    this.providers.set(provider.key, provider);
  }

  getProvider(key: string): TranslationProvider | undefined {
    return this.providers.get(key);
  }

  getAvailableProviders(): TranslationProvider[] {
    return Array.from(this.providers.values());
  }

  setActiveProvider(key: string): void {
    if (this.providers.has(key)) {
      this.activeProviderKey = key;
    }
  }

  getActiveProvider(): TranslationProvider {
    return this.providers.get(this.activeProviderKey) || this.getAvailableProviders()[0];
  }

  async translate(
    request: TranslationRequest,
    providerKey?: string,
  ): Promise<TranslationResponse> {
    const provider = providerKey
      ? this.providers.get(providerKey)
      : this.getActiveProvider();

    if (!provider) {
      throw new Error(`Provider "${providerKey}" not found`);
    }

    return provider.translate(request);
  }

  async quickTranslate(
    text: string,
    targetLanguage: LanguageCode,
    sourceLanguage: LanguageCode = "auto",
  ): Promise<TranslationResponse> {
    return this.translate({
      text,
      sourceLanguage,
      targetLanguage,
    });
  }
}

// Singleton
export const translationService = new TranslationService();
