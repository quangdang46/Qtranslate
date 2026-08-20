import React from "react";
import ReactDOM from "react-dom/client";
import { QuickTranslatePopup } from "./components/QuickTranslatePopup";
import "./styles/popup.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QuickTranslatePopup />
  </React.StrictMode>,
);
