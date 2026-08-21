import { useState } from "react";
import { historyService } from "@/services/history";
import { HistoryEntry } from "@/domain/history";
import { getLanguageName } from "@/domain/language";

export function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>(historyService.getEntries());
  const [isOpen, setIsOpen] = useState(false);

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
        width: "350px",
        maxHeight: "400px",
        background: "#ffffff",
        border: "1px solid #d0d0d0",
        borderRadius: "8px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        color: "#222",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #eee",
          background: "#f5f5f5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: "bold" }}>History ({entries.length})</span>
        <div>
          <button
            onClick={handleClearAll}
            style={{
              background: "transparent",
              color: "#ff6b6b",
              border: "none",
              cursor: "pointer",
              marginRight: "8px",
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
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ overflow: "auto", flex: 1 }}>
        {entries.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
            No history yet
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
              onClick={() => {
                navigator.clipboard.writeText(entry.translatedText);
              }}
            >
              <div style={{ fontSize: "12px", color: "#888" }}>
                {getLanguageName(entry.sourceLanguage)} →{" "}
                {getLanguageName(entry.targetLanguage)}
              </div>
              <div
                style={{
                  fontSize: "14px",
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
                  fontSize: "14px",
                  color: "#e94560",
                  marginTop: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.translatedText}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(entry.id);
                }}
                style={{
                  background: "transparent",
                  color: "#666",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
