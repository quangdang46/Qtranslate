import { TranslationProvider } from "@/providers/translation-provider";

/**
 * ProviderRegistry - manages all translation providers.
 */
class ProviderRegistry {
  private providers: Map<string, TranslationProvider> = new Map();

  register(provider: TranslationProvider): void {
    this.providers.set(provider.key, provider);
  }

  get(key: string): TranslationProvider | undefined {
    return this.providers.get(key);
  }

  getAll(): TranslationProvider[] {
    return Array.from(this.providers.values());
  }

  getKeys(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
