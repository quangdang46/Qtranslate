import { HistoryEntry } from "@/domain/history";

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
}

export const historyService = new HistoryService();
