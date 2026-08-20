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
        <div className="popup-header">
          {getLanguageName(sourceLang)} → {getLanguageName(targetLang)}
        </div>
        <div className="popup-body">
          {isLoading && <div className="popup-loading">Translating...</div>}
          {error && <div className="popup-error">{error}</div>}
          {translatedText && <div className="popup-result">{translatedText}</div>}
        </div>
        <div className="popup-footer">
          <button className="popup-btn popup-close" onClick={hidePopup}>
            Close
          </button>
          <button className="popup-btn popup-copy" onClick={copyResult}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
