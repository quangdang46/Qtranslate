/**
 * Provider icon metadata for the toolbar shown in both the popup and the
 * main translator form.
 *
 * `enabled` providers map 1:1 to a real `TranslationProvider` registered in
 * `services/translation.ts`. The rest are shown as grayed-out placeholders
 * purely to match the classic QTranslate icon row — no logo assets are used
 * (avoids bundling/licensing third-party brand marks), just a colored
 * initials badge per provider.
 */
export interface ProviderIconInfo {
  key: string;
  label: string;
  initials: string;
  color: string;
  enabled: boolean;
}

export const PROVIDER_ICONS: ProviderIconInfo[] = [
  { key: "google", label: "Google Translate", initials: "G", color: "#4285F4", enabled: true },
  { key: "microsoft", label: "Microsoft Translator (Bing)", initials: "B", color: "#008373", enabled: true },
  { key: "yandex", label: "Yandex Translate", initials: "Y", color: "#FC3F1D", enabled: false },
  { key: "deepl", label: "DeepL", initials: "De", color: "#0F2B46", enabled: true },
  { key: "baidu", label: "Baidu Translate", initials: "Bd", color: "#2932E1", enabled: false },
  { key: "yahoo", label: "Yahoo", initials: "Y!", color: "#6001D2", enabled: false },
  { key: "papago", label: "Papago", initials: "Pa", color: "#1EC800", enabled: false },
  { key: "openai", label: "OpenAI", initials: "AI", color: "#10A37F", enabled: true },
];
