import { useState, useEffect } from "react";
import { useTranslationStore } from "@/stores/translationStore";
import { getLanguageName } from "@/domain/language";
import { translationService } from "@/services/translation";
import { speak } from "@/services/tts";
import { ProviderToolbar } from "@/components/ProviderToolbar";
import "../styles/popup.css";

export function QuickTranslatePopup() {
  const {
    inputText,
    translatedText,
    isLoading,
    error,
    sourceLang,
    targetLang,
    isPopupVisible,
    hidePopup,
    copyResult,
    translate,
  } = useTranslationStore();

  const [activeProviderKey, setActiveProviderKey] = useState(
    translationService.getActiveProvider().key,
  );

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPopupVisible) {
        hidePopup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPopupVisible, hidePopup]);

  if (!isPopupVisible) return null;

  // While translating, show only a tiny loading pill at the cursor - the
  // full card (title bar, icons, provider toolbar) only mounts once
  // translation has actually finished, matching the classic QTranslate
  // behavior of not popping up the result window until it's ready.
  if (isLoading) {
    return (
      <div className="popup-loading-pill">
        <span className="popup-loading-track">
          <span className="popup-loading-bar" />
        </span>
      </div>
    );
  }

  const activeProviderName = translationService.getProvider(activeProviderKey)?.name ?? "";

  const handleProviderSelect = (key: string) => {
    if (key === activeProviderKey) return;
    translationService.setActiveProvider(key);
    setActiveProviderKey(key);
    if (inputText) {
      translate(inputText);
    }
  };

  return (
    <div className="popup">
      {/* Title bar */}
      <div className="popup-titlebar">
        <span className="popup-title">
          {getLanguageName(sourceLang)} to {getLanguageName(targetLang)} ({activeProviderName})
        </span>
        <div className="popup-titlebar-actions">
          <button className="popup-icon-btn" title="Favorite" onClick={() => {}}>
            ★
          </button>
          <button
            className="popup-icon-btn"
            title="Listen to source text"
            onClick={() => speak(inputText, sourceLang === "auto" ? "en" : sourceLang)}
            disabled={!inputText}
          >
            🎤
          </button>
          <button
            className="popup-icon-btn"
            title="Listen to translation"
            onClick={() => speak(translatedText, targetLang)}
            disabled={!translatedText}
          >
            🔊
          </button>
          <button className="popup-close-x" title="Close" onClick={hidePopup}>
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="popup-body">
        {inputText && <div className="popup-source">{inputText}</div>}

        {error && <div className="popup-error">{error}</div>}

        {translatedText && (
          <div className="popup-result" title="Click to copy" onClick={copyResult}>
            {translatedText}
          </div>
        )}
      </div>

      {/* Provider toolbar */}
      <ProviderToolbar activeKey={activeProviderKey} onSelect={handleProviderSelect} />
    </div>
  );
}
