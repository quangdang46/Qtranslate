import { useState, useMemo } from "react";
import { historyService } from "@/services/history";
import { HistoryEntry } from "@/domain/history";
import { getLanguageName, LanguageCode } from "@/domain/language";
import { PROVIDER_ICONS } from "@/domain/providers";

const PROVIDER_NAMES = Object.fromEntries(PROVIDER_ICONS.map((p) => [p.key, p.label]));

export function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>(historyService.getEntries());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLangPair, setFilterLangPair] = useState<string>("__all__");
  const [filterProvider, setFilterProvider] = useState<string>("__all__");

  const refresh = () => {
    setEntries(historyService.getEntries());
  };

  const handleDelete = (id: string) => {
    historyService.deleteEntry(id);
    refresh();
  };

  const handleClearAll = () => {
    historyService.clearAll();
    refresh();
  };

  // Build distinct values for filter dropdowns
  const languagePairs = useMemo(() => historyService.getDistinctLanguagePairs(), [entries]);
  const providerKeys = useMemo(() => historyService.getDistinctProviders(), [entries]);

  // Apply all filters
  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchQuery.trim()) {
      result = historyService.searchEntries(searchQuery);
    }
    if (filterLangPair !== "__all__") {
      const [src, tgt] = filterLangPair.split("→");
      result = result.filter((e) => e.sourceLanguage === src && e.targetLanguage === tgt);
    }
    if (filterProvider !== "__all__") {
      result = result.filter((e) => e.provider === filterProvider);
    }
    return result;
  }, [entries, searchQuery, filterLangPair, filterProvider]);

  const handleExport = () => {
    const json = historyService.exportEntries(filteredEntries);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qtranslate-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#e94560",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          cursor: "pointer",
          fontSize: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        📋
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "380px",
        maxHeight: "500px",
        background: "#ffffff",
        border: "1px solid #d0d0d0",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        color: "#222",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #eee",
          background: "#f5f5f5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "bold", fontSize: "14px" }}>
          History ({filteredEntries.length}/{entries.length})
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleExport}
            title="Export filtered history as JSON"
            style={{
              background: "#fff",
              color: "#555",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              padding: "2px 8px",
            }}
          >
            Export
          </button>
          <button
            onClick={handleClearAll}
            style={{
              background: "transparent",
              color: "#c0392b",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear All
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "transparent",
              color: "#aaa",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <input
          type="text"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "13px",
            boxSizing: "border-box",
            color: "#222",
          }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={filterLangPair}
            onChange={(e) => setFilterLangPair(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 6px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#222",
            }}
          >
            <option value="__all__">All languages</option>
            {languagePairs.map((p) => (
              <option key={`${p.source}-${p.target}`} value={`${p.source}→${p.target}`}>
                {getLanguageName(p.source)} → {getLanguageName(p.target)}
              </option>
            ))}
          </select>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 6px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#222",
            }}
          >
            <option value="__all__">All providers</option>
            {providerKeys.map((pk) => (
              <option key={pk} value={pk}>
                {PROVIDER_NAMES[pk] || pk}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Entries */}
      <div style={{ overflow: "auto", flex: 1 }}>
        {filteredEntries.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#888", fontSize: "13px" }}>
            {entries.length === 0 ? "No history yet" : "No matching entries"}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
              onClick={() => {
                navigator.clipboard.writeText(entry.translatedText);
              }}
              title="Click to copy translation"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#888" }}>
                  {getLanguageName(entry.sourceLanguage)} →{" "}
                  {getLanguageName(entry.targetLanguage)}
                </span>
                <span style={{ fontSize: "11px", color: "#aaa" }}>
                  {PROVIDER_NAMES[entry.provider] || entry.provider}
                </span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#333",
                  marginTop: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.sourceText}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#e94560",
                  marginTop: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {entry.translatedText}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", color: "#aaa" }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(entry.id);
                  }}
                  style={{
                    background: "transparent",
                    color: "#999",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
