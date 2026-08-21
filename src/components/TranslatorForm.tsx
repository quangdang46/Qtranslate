import { useState } from "react";
import { translationService } from "@/services/translation";
import { createHistoryEntry } from "@/domain/history";
import { historyService } from "@/services/history";
import { getCommonLanguages, getLanguageName, Language, LanguageCode } from "@/domain/language";
import { useSettingsStore } from "@/stores/settingsStore";
import { ProviderToolbar } from "@/components/ProviderToolbar";

/**
 * Full translator form shown in the main window - mirrors the classic
 * QTranslate main window: source box, language pickers + swap, Translate
 * button, result box, provider toolbar. Deliberately keeps its own local
 * state instead of `stores/translationStore` - that store is owned by the
 * popup window (see stores/translationStore.ts), and sharing it across
 * windows previously caused both windows to race on the same Rust commands.
 */
export function TranslatorForm() {
  const { settings, setActiveProvider: persistActiveProvider, updateQuickTranslate, saveSettings } = useSettingsStore();

  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<LanguageCode>(
    settings.quickTranslate.sourceLanguage,
  );
  const [targetLang, setTargetLang] = useState<LanguageCode>(
    settings.quickTranslate.targetLanguage,
  );
  const [activeProviderKey, setActiveProviderKey] = useState(
    translationService.getActiveProvider().key,
  );

  const activeProviderName = translationService.getProvider(activeProviderKey)?.name ?? "";

  const runTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await translationService.translate({
        text: sourceText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      setTranslatedText(response.translatedText);
      // Record in history
      historyService.addEntry(
        createHistoryEntry(
          sourceText,
          sourceLang,
          targetLang,
          response.translatedText,
          activeProviderKey,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
      setTranslatedText("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (sourceLang === Language.AUTO) return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSourceText(text);
    } catch {
      // Clipboard permission denied or unavailable - ignore silently.
    }
  };

  const handleProviderSelect = (key: string) => {
    if (key === activeProviderKey) return;
    translationService.setActiveProvider(key);
    setActiveProviderKey(key);
    persistActiveProvider(key);
    saveSettings();
    if (translatedText || sourceText) {
      runTranslate();
    }
  };

  const handleSourceLangChange = (lang: LanguageCode) => {
    setSourceLang(lang);
    updateQuickTranslate({ sourceLanguage: lang });
    saveSettings();
  };

  const handleTargetLangChange = (lang: LanguageCode) => {
    setTargetLang(lang);
    updateQuickTranslate({ targetLanguage: lang });
    saveSettings();
  };

  return (
    <div className="translator">
      <div className="tf-header">
        <button className="tf-nav-btn" disabled title="Back (coming soon)">
          ◄
        </button>
        <button className="tf-nav-btn" disabled title="Forward (coming soon)">
          ►
        </button>
        <span className="tf-provider-name">{activeProviderName}</span>
      </div>

      <textarea
        className="tf-source"
        placeholder="Enter text to translate..."
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
      />

      <div className="tf-controls">
        <button className="tf-icon-btn" title="Paste from clipboard" onClick={handlePaste}>
          📋
        </button>
        <select
          className="tf-lang-select"
          value={sourceLang}
          onChange={(e) => handleSourceLangChange(e.target.value as LanguageCode)}
        >
          {getCommonLanguages().map((code) => (
            <option key={code} value={code}>
              {getLanguageName(code)}
            </option>
          ))}
        </select>
        <button
          className="tf-icon-btn"
          title="Swap languages"
          onClick={handleSwap}
          disabled={sourceLang === Language.AUTO}
        >
          ⇄
        </button>
        <select
          className="tf-lang-select"
          value={targetLang}
          onChange={(e) => handleTargetLangChange(e.target.value as LanguageCode)}
        >
          {getCommonLanguages()
            .filter((code) => code !== Language.AUTO)
            .map((code) => (
              <option key={code} value={code}>
                {getLanguageName(code)}
              </option>
            ))}
        </select>
        <button
          className="tf-translate-btn"
          onClick={runTranslate}
          disabled={isLoading || !sourceText.trim()}
        >
          {isLoading ? "Translating…" : "Translate"}
        </button>
      </div>

      <div className="tf-result">
        {isLoading && (
          <div className="tf-loading">
            <span className="tf-spinner" />
            Translating…
          </div>
        )}
        {error && <div className="tf-error">{error}</div>}
        {!isLoading && !error && translatedText && <div className="tf-result-text">{translatedText}</div>}
        {!isLoading && !error && !translatedText && (
          <div className="tf-placeholder">
            <p>Global hotkeys:</p>
            <p>Ctrl+Q — Translate selected text and show it in a popup window</p>
            <p>Ctrl+Alt+W — Translate selected text in place</p>
          </div>
        )}
      </div>

      <ProviderToolbar activeKey={activeProviderKey} onSelect={handleProviderSelect} />
    </div>
  );
}
