import React from "react";
import ReactDOM from "react-dom/client";
import { DictionaryPanel } from "./components/DictionaryPanel";
import "./styles/dictionary.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DictionaryPanel />
  </React.StrictMode>,
);
