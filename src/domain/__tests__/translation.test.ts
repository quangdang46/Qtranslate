import { describe, it, expect } from "vitest";
import { mapTranslationResult } from "../translation";

describe("mapTranslationResult", () => {
  it("maps Rust result to TypeScript response", () => {
    const rustResult = {
      translated_text: "Xin chao",
      detected_language: "en",
    };
    const result = mapTranslationResult(rustResult);
    expect(result.translatedText).toBe("Xin chao");
    expect(result.detectedLanguage).toBe("en");
  });

  it("handles null detected language", () => {
    const rustResult = {
      translated_text: "Hello",
      detected_language: null,
    };
    const result = mapTranslationResult(rustResult);
    expect(result.detectedLanguage).toBeNull();
  });
});
