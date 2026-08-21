import React from "react";
import ReactDOM from "react-dom/client";
import { OptionsPanel } from "./components/OptionsPanel";
import "./styles/options.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OptionsPanel />
  </React.StrictMode>,
);
