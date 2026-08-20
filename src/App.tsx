import { QuickTranslatePopup } from "./components/QuickTranslatePopup";
import { HistoryPanel } from "./components/HistoryPanel";

function App() {
  return (
    <div className="app">
      <h1>QTranslate</h1>
      <p>Select text anywhere and press Ctrl+Q to translate</p>
      <p>Press Ctrl+Alt+W to replace selected text</p>
      <QuickTranslatePopup />
      <HistoryPanel />
    </div>
  );
}

export default App;
