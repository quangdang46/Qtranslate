import { QuickTranslatePopup } from "./components/QuickTranslatePopup";

function App() {
  return (
    <div className="app">
      <h1>QTranslate</h1>
      <p>Select text anywhere and press Ctrl+Q to translate</p>
      <QuickTranslatePopup />
    </div>
  );
}

export default App;
