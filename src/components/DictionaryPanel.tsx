import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// Listen for show-dictionary event from the hotkey (Ctrl+Shift+Q)
// which carries the selected text as the payload.
if (typeof window !== "undefined" && window.__TAURI__) {
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen<string>("show-dictionary", async (_event) => {
      const selected = _event.payload;
      if (selected && selected.trim()) {
        // Trigger a lookup for the selected word
        try {
          const res = await invoke<{
            word: string;
            phonetic: string | null;
            definitions: { part_of_speech: string; definition: string }[];
            synonyms: string[];
            antonyms: string[];
          }>("lookup_dictionary", { word: selected.trim() });
          // Dispatch a custom event so the React component picks it up
          window.dispatchEvent(
            new CustomEvent("dictionary-lookup-result", { detail: res }),
          );
        } catch {
          window.dispatchEvent(
            new CustomEvent("dictionary-lookup-error", {
              detail: selected.trim(),
            }),
          );
        }
      }
    });
  });
}

interface DictionaryDef {
  part_of_speech: string;
  definition: string;
}

interface DictionaryResult {
  word: string;
  phonetic: string | null;
  definitions: DictionaryDef[];
  synonyms: string[];
  antonyms: string[];
}

/**
 * Dictionary window content — manual word lookup using the free
 * dictionaryapi.dev endpoint (English-only for v1, served via Rust
 * backend to sidestep CORS/CSP issues in WebView2).
 */
export function DictionaryPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    const word = query.trim();
    if (!word) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await invoke<DictionaryResult>("lookup_dictionary", { word });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLookup();
  };

  // Listen for dictionary lookup results triggered by Ctrl+Shift+Q hotkey
  useEffect(() => {
    const handleResult = (e: Event) => {
      const custom = e as CustomEvent;
      setResult(custom.detail);
      setIsLoading(false);
      setError(null);
    };
    const handleError = (e: Event) => {
      const custom = e as CustomEvent;
      setError(`No definitions found for "${custom.detail}"`);
      setIsLoading(false);
      setResult(null);
    };
    window.addEventListener("dictionary-lookup-result", handleResult);
    window.addEventListener("dictionary-lookup-error", handleError);
    return () => {
      window.removeEventListener("dictionary-lookup-result", handleResult);
      window.removeEventListener("dictionary-lookup-error", handleError);
    };
  }, []);

  // Group definitions by part of speech
  const grouped = new Map<string, string[]>();
  if (result) {
    for (const def of result.definitions) {
      const list = grouped.get(def.part_of_speech) || [];
      list.push(def.definition);
      grouped.set(def.part_of_speech, list);
    }
  }

  return (
    <div className="dict">
      <div className="dict-header">
        <input
          className="dict-input"
          type="text"
          placeholder="Enter a word to look up..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="dict-btn"
          onClick={handleLookup}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? "Looking up…" : "Lookup"}
        </button>
      </div>

      {isLoading && <div className="dict-loading">Looking up…</div>}
      {error && <div className="dict-error">{error}</div>}

      {result && (
        <div className="dict-result">
          <div className="dict-word-header">
            <div className="dict-word">{result.word}</div>
            {result.phonetic && <div className="dict-phonetic">{result.phonetic}</div>}
          </div>

          {/* Synonyms chips */}
          {result.synonyms.length > 0 && (
            <div className="dict-chips">
              <span className="dict-chips-label">Synonyms</span>
              {result.synonyms.slice(0, 10).map((s) => (
                <span
                  key={s}
                  className="dict-chip synonym"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setQuery(s);
                    // Auto-lookup the clicked synonym
                    (async () => {
                      setIsLoading(true);
                      setError(null);
                      setResult(null);
                      try {
                        const res = await invoke<DictionaryResult>("lookup_dictionary", { word: s });
                        setResult(res);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Lookup failed");
                      } finally {
                        setIsLoading(false);
                      }
                    })();
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Antonyms chips */}
          {result.antonyms.length > 0 && (
            <div className="dict-chips">
              <span className="dict-chips-label">Antonyms</span>
              {result.antonyms.slice(0, 10).map((a) => (
                <span
                  key={a}
                  className="dict-chip antonym"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setQuery(a);
                    (async () => {
                      setIsLoading(true);
                      setError(null);
                      setResult(null);
                      try {
                        const res = await invoke<DictionaryResult>("lookup_dictionary", { word: a });
                        setResult(res);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Lookup failed");
                      } finally {
                        setIsLoading(false);
                      }
                    })();
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Definitions grouped by part of speech */}
          {Array.from(grouped.entries()).map(([pos, defs]) => (
            <div key={pos} className="dict-definition-group">
              <div className="dict-pos">{pos}</div>
              {defs.map((d, i) => (
                <div key={i} className="dict-def-text">
                  {d}
                </div>
              ))}
            </div>
          ))}

          {result.definitions.length === 0 && (
            <div className="dict-empty">No definitions available</div>
          )}
        </div>
      )}

      {!result && !isLoading && !error && (
        <div className="dict-empty">
          <p style={{ marginBottom: "8px" }}>English Dictionary</p>
          <p style={{ fontSize: "12px", color: "#aaa" }}>
            Type a word and press Enter or click Lookup
          </p>
          <p style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
            Powered by dictionaryapi.dev (English only)
          </p>
        </div>
      )}
    </div>
  );
}
