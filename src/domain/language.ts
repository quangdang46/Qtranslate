/**
 * LanguageCode - BCP-47 language tag wrapper.
 * Uses "auto" for auto-detection, otherwise standard BCP-47 tags.
 */

const BCP47_REGEX = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{2,8})*$/;

export type LanguageCode = string;

export const Language = {
  AUTO: "auto" as LanguageCode,
  ENGLISH: "en" as LanguageCode,
  VIETNAMESE: "vi" as LanguageCode,
  JAPANESE: "ja" as LanguageCode,
  CHINESE_SIMPLIFIED: "zh-CN" as LanguageCode,
  CHINESE_TRADITIONAL: "zh-TW" as LanguageCode,
  KOREAN: "ko" as LanguageCode,
  FRENCH: "fr" as LanguageCode,
  GERMAN: "de" as LanguageCode,
  SPANISH: "es" as LanguageCode,
  PORTUGUESE: "pt" as LanguageCode,
  RUSSIAN: "ru" as LanguageCode,
  ARABIC: "ar" as LanguageCode,
  HINDI: "hi" as LanguageCode,
  THAI: "th" as LanguageCode,
  INDONESIAN: "id" as LanguageCode,
  MALAY: "ms" as LanguageCode,
  TURKISH: "tr" as LanguageCode,
  ITALIAN: "it" as LanguageCode,
  DUTCH: "nl" as LanguageCode,
  POLISH: "pl" as LanguageCode,
  SWEDISH: "sv" as LanguageCode,
  NORWEGIAN: "no" as LanguageCode,
  DANISH: "da" as LanguageCode,
  FINNISH: "fi" as LanguageCode,
  GREEK: "el" as LanguageCode,
  CZECH: "cs" as LanguageCode,
  ROMANIAN: "ro" as LanguageCode,
  HUNGARIAN: "hu" as LanguageCode,
  UKRAINIAN: "uk" as LanguageCode,
  PERSIAN: "fa" as LanguageCode,
  HEBREW: "he" as LanguageCode,
} as const;

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  auto: "Auto Detect",
  en: "English",
  vi: "Vietnamese",
  ja: "Japanese",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  tr: "Turkish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  el: "Greek",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  uk: "Ukrainian",
  fa: "Persian",
  he: "Hebrew",
};

export function isValidLanguageCode(code: string): boolean {
  return code === "auto" || BCP47_REGEX.test(code);
}

export function getLanguageName(code: LanguageCode): string {
  return LANGUAGE_NAMES[code] || code;
}

export function getCommonLanguages(): LanguageCode[] {
  return [
    Language.AUTO,
    Language.ENGLISH,
    Language.VIETNAMESE,
    Language.JAPANESE,
    Language.CHINESE_SIMPLIFIED,
    Language.KOREAN,
    Language.FRENCH,
    Language.GERMAN,
    Language.SPANISH,
  ];
}
