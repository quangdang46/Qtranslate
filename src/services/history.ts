import { HistoryEntry } from "@/domain/history";
import { LanguageCode } from "@/domain/language";

const STORAGE_KEY = "qtranslate_history";
const MAX_ENTRIES = 1000;

/**
 * HistoryService - manages translation history.
 */
class HistoryService {
  private entries: HistoryEntry[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // localStorage might be full
    }
  }

  addEntry(entry: HistoryEntry): void {
    this.entries.unshift(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.save();
  }

  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }

  deleteEntry(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.save();
  }

  clearAll(): void {
    this.entries = [];
    this.save();
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  /** Filter entries by substring match on source or translated text. */
  searchEntries(query: string): HistoryEntry[] {
    const q = query.toLowerCase();
    return this.entries.filter(
      (e) =>
        e.sourceText.toLowerCase().includes(q) ||
        e.translatedText.toLowerCase().includes(q),
    );
  }

  /** Get all distinct language pairs present in history. */
  getDistinctLanguagePairs(): Array<{ source: LanguageCode; target: LanguageCode }> {
    const seen = new Set<string>();
    const pairs: Array<{ source: LanguageCode; target: LanguageCode }> = [];
    for (const e of this.entries) {
      const key = `${e.sourceLanguage}→${e.targetLanguage}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ source: e.sourceLanguage, target: e.targetLanguage });
      }
    }
    return pairs;
  }

  /** Get all distinct provider keys present in history. */
  getDistinctProviders(): string[] {
    return [...new Set(this.entries.map((e) => e.provider))];
  }

  /** Filter entries by language pair (optional) and provider (optional). */
  filterEntries(
    languagePair?: { source: LanguageCode; target: LanguageCode },
    provider?: string,
  ): HistoryEntry[] {
    return this.entries.filter((e) => {
      if (languagePair) {
        if (e.sourceLanguage !== languagePair.source || e.targetLanguage !== languagePair.target) {
          return false;
        }
      }
      if (provider && e.provider !== provider) {
        return false;
      }
      return true;
    });
  }

  /** Export filtered entries as a JSON string. */
  exportEntries(entries: HistoryEntry[]): string {
    return JSON.stringify(entries, null, 2);
  }
}

export const historyService = new HistoryService();
