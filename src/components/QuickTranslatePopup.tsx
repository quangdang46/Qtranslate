import { useEffect } from "react";
import { useTranslationStore } from "@/stores/translationStore";
import { getLanguageName } from "@/domain/language";
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
  } = useTranslationStore();

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

  return (
    <div className="popup-overlay" onClick={hidePopup}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        {/* Title bar with close button */}
        <div className="popup-titlebar">
          <span className="popup-title">
            {getLanguageName(sourceLang)} to {getLanguageName(targetLang)} (Google)
          </span>
          <button className="popup-close-x" onClick={hidePopup}>×</button>
        </div>

        {/* Source text */}
        <div className="popup-section">
          <div className="popup-label">Source</div>
          <div className="popup-text popup-source">{inputText || "No text selected"}</div>
        </div>

        {/* Translation result */}
        <div className="popup-section">
          <div className="popup-label">Translation</div>
          {isLoading && <div className="popup-loading">Translating...</div>}
          {error && <div className="popup-error">{error}</div>}
          {translatedText && <div className="popup-text popup-result">{translatedText}</div>}
        </div>

        {/* Footer with copy button */}
        <div className="popup-footer">
          <button className="popup-btn popup-copy" onClick={copyResult}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
