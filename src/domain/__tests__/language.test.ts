import { describe, it, expect } from "vitest";
import {
  Language,
  isValidLanguageCode,
  getLanguageName,
  getCommonLanguages,
} from "../language";

describe("LanguageCode", () => {
  it("has AUTO constant", () => {
    expect(Language.AUTO).toBe("auto");
  });

  it("has common language constants", () => {
    expect(Language.ENGLISH).toBe("en");
    expect(Language.VIETNAMESE).toBe("vi");
    expect(Language.JAPANESE).toBe("ja");
  });
});

describe("isValidLanguageCode", () => {
  it("accepts 'auto'", () => {
    expect(isValidLanguageCode("auto")).toBe(true);
  });

  it("accepts valid BCP-47 codes", () => {
    expect(isValidLanguageCode("en")).toBe(true);
    expect(isValidLanguageCode("zh-CN")).toBe(true);
    expect(isValidLanguageCode("pt-BR")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidLanguageCode("")).toBe(false);
    expect(isValidLanguageCode("x")).toBe(false);
    expect(isValidLanguageCode("123")).toBe(false);
  });
});

describe("getLanguageName", () => {
  it("returns display name for known codes", () => {
    expect(getLanguageName("en")).toBe("English");
    expect(getLanguageName("vi")).toBe("Vietnamese");
    expect(getLanguageName("auto")).toBe("Auto Detect");
  });

  it("returns code for unknown codes", () => {
    expect(getLanguageName("xx")).toBe("xx");
  });
});

describe("getCommonLanguages", () => {
  it("returns a list of common languages", () => {
    const langs = getCommonLanguages();
    expect(langs.length).toBeGreaterThan(5);
    expect(langs[0]).toBe("auto");
  });
});
