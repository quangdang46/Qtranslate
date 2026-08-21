import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCommonLanguages, getLanguageName, LanguageCode } from "@/domain/language";
import { PROVIDER_ICONS } from "@/domain/providers";
import { translationService } from "@/services/translation";

/**
 * Options window — settings page matching QTranslate's Options dialog.
 * Sections: Quick Translate, Replace, Default Provider, Mouse Mode.
 * Every change saves immediately (no Save button).
 */
export function OptionsPanel() {
  const {
    settings,
    isLoaded,
    updateQuickTranslate,
    updateReplace,
    setActiveProvider,
    saveSettings,
    loadSettings,
  } = useSettingsStore();

  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    loadSettings();
  }, [isLoaded, loadSettings]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleQTSourceChange = (lang: LanguageCode) => {
    updateQuickTranslate({ sourceLanguage: lang });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleQTTargetChange = (lang: LanguageCode) => {
    updateQuickTranslate({ targetLanguage: lang });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleQTHotkeyChange = (hotkey: string) => {
    updateQuickTranslate({ hotkey });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleRepSourceChange = (lang: LanguageCode) => {
    updateReplace({ sourceLanguage: lang });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleRepTargetChange = (lang: LanguageCode) => {
    updateReplace({ targetLanguage: lang });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleRepHotkeyChange = (hotkey: string) => {
    updateReplace({ hotkey });
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  const handleProviderChange = (key: string) => {
    translationService.setActiveProvider(key);
    setActiveProvider(key);
    setTimeout(() => { saveSettings(); flashSaved(); }, 0);
  };

  return (
    <div className="opts">
      <div className="opts-title">Options — QTranslate</div>

      {/* Quick Translate */}
      <div className="opts-section">
        <div className="opts-section-header">Quick Translate (Ctrl+Q)</div>
        <div className="opts-section-body">
          <div className="opts-row">
            <span className="opts-label">Source language</span>
            <select
              className="opts-select"
              value={settings.quickTranslate.sourceLanguage}
              onChange={(e) => handleQTSourceChange(e.target.value as LanguageCode)}
            >
              {getCommonLanguages().map((code) => (
                <option key={code} value={code}>
                  {getLanguageName(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="opts-row">
            <span className="opts-label">Target language</span>
            <select
              className="opts-select"
              value={settings.quickTranslate.targetLanguage}
              onChange={(e) => handleQTTargetChange(e.target.value as LanguageCode)}
            >
              {getCommonLanguages()
                .filter((c) => c !== "auto")
                .map((code) => (
                  <option key={code} value={code}>
                    {getLanguageName(code)}
                  </option>
                ))}
            </select>
          </div>
          <div className="opts-row">
            <span className="opts-label">Hotkey</span>
            <input
              className="opts-input"
              type="text"
              value={settings.quickTranslate.hotkey}
              onChange={(e) => handleQTHotkeyChange(e.target.value)}
              placeholder="CmdOrCtrl+Q"
            />
          </div>
          <div className="opts-note">
            Changes apply on next app restart. Format: CmdOrCtrl+Key, CmdOrCtrl+Shift+Key, etc.
          </div>
        </div>
      </div>

      {/* Replace */}
      <div className="opts-section">
        <div className="opts-section-header">Replace (Ctrl+Alt+W)</div>
        <div className="opts-section-body">
          <div className="opts-row">
            <span className="opts-label">Source language</span>
            <select
              className="opts-select"
              value={settings.replace.sourceLanguage}
              onChange={(e) => handleRepSourceChange(e.target.value as LanguageCode)}
            >
              {getCommonLanguages().map((code) => (
                <option key={code} value={code}>
                  {getLanguageName(code)}
                </option>
              ))}
            </select>
          </div>
          <div className="opts-row">
            <span className="opts-label">Target language</span>
            <select
              className="opts-select"
              value={settings.replace.targetLanguage}
              onChange={(e) => handleRepTargetChange(e.target.value as LanguageCode)}
            >
              {getCommonLanguages()
                .filter((c) => c !== "auto")
                .map((code) => (
                  <option key={code} value={code}>
                    {getLanguageName(code)}
                  </option>
                ))}
            </select>
          </div>
          <div className="opts-row">
            <span className="opts-label">Hotkey</span>
            <input
              className="opts-input"
              type="text"
              value={settings.replace.hotkey}
              onChange={(e) => handleRepHotkeyChange(e.target.value)}
              placeholder="CmdOrCtrl+Alt+W"
            />
          </div>
          <div className="opts-note">
            Changes apply on next app restart.
          </div>
        </div>
      </div>

      {/* Default Provider */}
      <div className="opts-section">
        <div className="opts-section-header">Default Provider</div>
        <div className="opts-section-body">
          <div className="opts-provider-bar">
            {PROVIDER_ICONS.map((p) => (
              <div
                key={p.key}
                onClick={() => p.enabled && handleProviderChange(p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  background: settings.activeProvider === p.key ? p.color : "#f0f0f0",
                  color: settings.activeProvider === p.key ? "#fff" : "#888",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: p.enabled ? "pointer" : "default",
                  opacity: p.enabled ? 1 : 0.35,
                  border: settings.activeProvider === p.key ? `2px solid ${p.color}` : "2px solid transparent",
                  transition: "all 0.15s",
                }}
                title={p.enabled ? p.label : `${p.label} (coming soon)`}
              >
                {p.initials}
              </div>
            ))}
          </div>
          <div className="opts-note" style={{ marginTop: "6px" }}>
            Active: {PROVIDER_ICONS.find((p) => p.key === settings.activeProvider)?.label || settings.activeProvider}
          </div>
        </div>
      </div>

      {/* Mouse Mode */}
      <div className="opts-section">
        <div className="opts-section-header">Mouse Mode (Experimental)</div>
        <div className="opts-section-body">
          <div className="opts-toggle">
            <div
              className="opts-toggle-switch"
              style={{ background: "#ccc", cursor: "not-allowed" }}
            />
            <span className="opts-toggle-label" style={{ color: "#999" }}>
              Off — Coming in a future update
            </span>
          </div>
          <div className="opts-note" style={{ marginTop: "8px" }}>
            When enabled, automatically shows a translation icon after selecting text with the mouse.
            Uses a global mouse hook — may conflict with other automation software.
          </div>
        </div>
      </div>

      <div className={`opts-saved ${savedFlash ? "show" : ""}`}>
        ✓ Settings saved
      </div>
    </div>
  );
}
