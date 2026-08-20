/**
 * Dictionary service - word lookup using free dictionary API.
 */

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  definitions: { partOfSpeech: string; definition: string }[];
  synonyms?: string[];
  antonyms?: string[];
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0) {
      const entry = data[0];
      return {
        word: entry.word,
        phonetic: entry.phonetic,
        definitions: entry.meanings?.flatMap((m: { partOfSpeech: string; definitions: { definition: string }[] }) =>
          m.definitions.map((d) => ({ partOfSpeech: m.partOfSpeech, definition: d.definition }))
        ) || [],
      };
    }
    return null;
  } catch {
    return null;
  }
}
