# QTranslate Clone — Detailed Implementation Plan (v2)

## Context

**Goal:** Build a desktop translation utility similar to QTranslate with fast workflows: `Ctrl+Q` → translation popup, `Alt+W` → replace text with translation. Reference sources:
- **UX/Product:** Original QTranslate by QuestSoft (https://qtranslate.en.softonic.com/)
- **Architecture/Design Patterns:** ahatem/QTranslate on GitHub (Kotlin, Clean Architecture + MVI + Plugin system)

**Chosen stack:** Tauri 2 + React + TypeScript + Rust + pnpm
**Platforms:** Windows + macOS
**Build output:** `.exe` (Windows), `.app` (macOS)

**Current state:** Project is nearly empty — only `.gitignore`, `.beads/`, and the reference repo in `.tmp/QTranslate/`. No `src/`, `src-tauri/`, `package.json`, or `Cargo.toml` yet.

**Environment ready:** Node.js v24.14.1, pnpm 11.9.0, Rust 1.97.1, Cargo 1.97.1, Git 2.53.0, VS Code 1.134.0 — all installed, nothing extra needed.

---

## Reference Architecture from ahatem/QTranslate

### Pattern 1: Clean Architecture (Dependency Inversion)
```
UI (React) → Application (use cases) → Domain (models) → Infrastructure (providers)
```
React must never know about Windows APIs or specific translation providers.

### Pattern 2: Plugin/Provider Boundary (⭐ Most important)
```
React → TranslationService → TranslationProvider → Google/DeepL/AI
```
Core never depends on a specific provider. Plugins depend only on API contracts.

### Pattern 3: MVI (Model-View-Intent)
```
User Action → Intent → Store → State → UI render
```
Centralized React state management, no scattered state.

### Pattern 4: Configuration-driven behavior
```
behavior → config, instead of hardcoding
```

### Pattern 5: Cross-platform abstraction
```
React → Tauri command → Rust → Tauri plugins + enigo → OS
```
Prefer cross-platform plugins/crates over writing per-OS code.

---

## Key Rust Crates & Tauri Plugins

| Crate/Plugin | Purpose | Used in |
|---|---|---|
| `tauri-plugin-global-shortcut` | Cross-platform global hotkeys | M2, M3 |
| `enigo` (0.2+) | Cross-platform keyboard input simulation (Ctrl+C/Ctrl+V) | M2, M3 |
| `arboard` | Cross-platform clipboard read/write | M2, M3 |
| `reqwest` | HTTP client for translation API calls (avoids CORS) | M1 |

**Note:** Do NOT write custom `RegisterHotKey`/`CGEventTap`/`SendInput`. Use existing plugins/crates to minimize platform-specific bugs.

**Critical: enigo version** — The `enigo` crate changed its API completely in 0.2+. The old API (`Enigo::new()`, `key_sequence_parse("{CTRL}c")`) no longer works. Current API (0.2+/0.5+/0.6+):
```rust
let mut enigo = Enigo::new(&Settings::default())?;
enigo.key(Key::Control, Direction::Press)?;
enigo.key(Key::Unicode('c'), Direction::Click)?;
enigo.key(Key::Control, Direction::Release)?;
```
Pin the version explicitly in `Cargo.toml` to avoid surprise breakage.

---

## Selection Capture Technique (Critical issue #1)

**No OS API can directly "read text selected in another app."** Neither `UI Automation` (Windows) nor `NSPasteboard` (macOS) can read selections universally.

**Technique used by all clipboard-translators:**
```
backup current clipboard (arboard)
    ↓
simulate Ctrl+C (enigo) sent to the focused app
    ↓
wait for clipboard update (~50-100ms poll or delay)
    ↓
read clipboard (arboard) → this is the "selected text"
    ↓
(for Alt+W): translate
    ↓
simulate Ctrl+V (enigo) to paste result
    ↓
restore original clipboard (arboard)
```

**Platform notes:**
- **macOS:** App requires Accessibility permission (System Settings → Privacy & Security → Accessibility) to simulate keypresses. Without it, all key simulation commands fail silently.
- **Windows:** `SendInput` is blocked if the target app runs with higher privilege (UIPI). The app should not run elevated (to avoid UAC prompts), accepting this limitation with elevated apps.

---

## "Non-focus-stealing" Popup (Critical issue #5)

`WS_EX_NOACTIVATE` (Windows) is not exposed through Tauri's high-level `WindowBuilder`. Requires `raw-window-handle` to set the extended style after window creation. This detail needs extra time budget, especially in M2a.4.

---

## Project Directory Structure (updated)

```
QTranslate/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── Header.tsx            # Title bar + settings icon
│   │   ├── SourcePanel.tsx       # Source text input area
│   │   ├── TranslationToolbar.tsx # Source/target language + translate button
│   │   ├── ResultPanel.tsx       # Translation result display
│   │   ├── ProviderBar.tsx       # Provider tabs (Google/DeepL/...)
│   │   ├── QuickTranslatePopup.tsx # Popup for Ctrl+Q
│   │   ├── LanguageSelector.tsx  # Language dropdown
│   │   └── LoadingSpinner.tsx    # Loading animation
│   │
│   ├── services/
│   │   ├── translation.ts        # TranslationService (contract)
│   │   ├── clipboard.ts          # Clipboard backup/restore + replace
│   │   ├── selectionCapture.ts   # Simulate Ctrl+C → read clipboard
│   │   ├── history.ts            # Translation history
│   │   └── settings.ts           # Settings persistence
│   │
│   ├── stores/
│   │   ├── translationStore.ts   # MVI store for translation
│   │   └── settingsStore.ts      # Settings state
│   │
│   ├── domain/
│   │   ├── language.ts           # LanguageCode model
│   │   ├── translation.ts        # TranslationRequest/Response/Error
│   │   └── settings.ts           # QuickTranslateConfig, ReplaceConfig
│   │
│   ├── providers/
│   │   ├── google.ts             # Google Translate provider
│   │   ├── deepl.ts              # DeepL provider
│   │   ├── microsoft.ts          # Microsoft Translator provider
│   │   └── openai.ts             # OpenAI provider
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── styles/
│       ├── app.css               # Global styles
│       ├── popup.css             # Quick translate popup styles
│       └── themes.css            # Dark/light themes
│
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs               # Tauri app entry + plugin init
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── clipboard.rs      # Clipboard backup/restore/read/write
│   │   │   ├── selection.rs      # Selection capture (Ctrl+C sim + clipboard read)
│   │   │   ├── input.rs          # Input simulation (Ctrl+C, Ctrl+V via enigo)
│   │   │   ├── translate.rs      # Translation API calls (Rust-side, avoids CORS)
│   │   │   ├── window.rs         # Window management + popup positioning
│   │   │   └── settings.rs       # Settings persistence
│   │   └── permissions.rs        # macOS Accessibility permission check
│   │
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   ├── build.rs                  # Tauri build script
│   └── capabilities/             # Tauri 2 permissions
│       └── default.json
│
├── package.json                  # Node.js dependencies
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .gitignore
├── CLAUDE.md                     # Project instructions
└── README.md
```

**Note:** `hotkey/`, `selection/`, `platform/` directories have been removed — not needed since we use `tauri-plugin-global-shortcut` + `enigo` cross-platform. Much cleaner structure.

---

## Detailed Milestones

---

### M0 — Foundation (1 day)

**Goal:** Scaffold the project, get `pnpm tauri dev` running on Windows.

#### Tasks:

**M0.1 — Scaffold Tauri 2 project**
- Run `pnpm create tauri-app` with React + TypeScript template
- Verify `pnpm tauri dev` runs and shows an empty window
- Verify `pnpm tauri build` produces an artifact

**M0.2 — Setup dependencies & project structure**
- Install Rust crates: `cargo add tauri-plugin-global-shortcut enigo arboard reqwest`
- Install npm packages: `pnpm add zustand @tauri-apps/plugin-global-shortcut`
- Create directory structure `src/`, `src-tauri/src/`
- Setup ESLint, Prettier, Vitest
- Create `CLAUDE.md` with project instructions
- Setup `.gitignore` correctly (node_modules, dist, target, .tmp, etc.)

**⚠️ M0.2b — Tauri 2 Capabilities/Permissions (critical, commonly forgotten)**
- Tauri 2 defaults to **deny-all** — if permissions are not declared, every command/window/shortcut call fails with "not allowed" even if Rust code is correct. This is the #1 debugging time-waster for new Tauri 2 projects.
- File: `src-tauri/capabilities/default.json` — must declare:
  - `core:default` — base Tauri permissions
  - `global-shortcut:allow-register` — for `tauri-plugin-global-shortcut`
  - `global-shortcut:allow-unregister`
  - `window:default` — for creating popup window
  - Any custom `#[tauri::command]` you write (e.g. `translate-text`, `get-selected-text`, `replace-with-translation`, etc.) must be added to the permissions list
- Also: `tauri-plugin-global-shortcut` requires its own plugin registration in `tauri.conf.json` plugins section
- Do this in M0.2 so M2a commands work immediately when you start testing

**M0.3 — Verify build pipeline**
- `pnpm tauri dev` — dev server runs
- `pnpm tauri build` — produces `.exe` on Windows
- `cargo test` — Rust tests pass
- `pnpm test` — TypeScript tests pass

**Done condition:**
- `pnpm tauri dev` shows empty window
- `pnpm tauri build` produces `.exe` file

---

### M1 — Translation Core (1-2 days)

**Goal:** Have a working translation service, no UI needed yet.

**Critical architecture decision:** Translation API calls MUST run in Rust (`src-tauri`), NOT in React TypeScript. Reason: Google's unofficial translation endpoints (`translate.googleapis.com`) do not provide CORS headers — calling them from `fetch()` inside Tauri's webview will be blocked. Rust `reqwest` HTTP client is not subject to CORS restrictions. The TypeScript layer remains a thin wrapper calling `invoke('translate_text', ...)`.

#### Tasks:

**M1.1 — Domain models (TypeScript)**
- File: `src/domain/language.ts`
  - `LanguageCode` type with constants (AUTO, ENGLISH, VIETNAMESE, JAPANESE, etc.)
  - Regex validation for BCP-47 tags
- File: `src/domain/translation.ts`
  - `TranslationRequest { text, sourceLanguage, targetLanguage }`
  - `TranslationResponse { translatedText, detectedLanguage?, alternatives? }`
  - `TranslationError { code, message, retryable }`

**M1.2 — Rust: Translation command**
- File: `src-tauri/src/commands/translate.rs`
  - Tauri command that performs the actual HTTP call:
  ```rust
  #[tauri::command]
  async fn translate_text(
      text: String,
      source_lang: String,
      target_lang: String,
  ) -> Result<TranslationResult, String> {
      // Use reqwest to call Google's unofficial API
      // Parse response, return structured result
  }
  ```
  - Use `reqwest` (already in Cargo.toml) — no CORS restrictions
  - **2 separate endpoints, separate parser for each:**
    - Primary: `https://translate.googleapis.com/translate_a/single` — response is nested array `[[["translated","source",...],...],...,"en"]`
    - Fallback: `https://clients5.google.com/translate_a/t` — response is `{sentences:[{text:"..."}], src:"en"}`
  - **No simple fallback** between endpoints because schemas differ — needs separate parsers
  - Free endpoints may be **rate-limited/IP-blocked** → treat as "quick test only", not a production solution
  - Handle errors, timeouts, rate limits
  - **⚠️ Response parsing:** Do NOT use `#[derive(Deserialize)]` structs for `translate_a/single` response — the response is a nested array with inconsistent types (`[[["text","src",...],...],...,"en"]`) that serde structs cannot handle. Use `serde_json::Value` and traverse manually:
  ```rust
  // Example: extract translated text from google response
  fn parse_google_response(json: &serde_json::Value) -> Option<String> {
      // response[0] = array of sentence groups
      // response[0][n][0] = translated text for sentence n
      let sentences = json.get(0)?;
      let mut result = String::new();
      for item in sentences.as_array()? {
          if let Some(text) = item.get(0)?.as_str() {
              result.push_str(text);
          }
      }
      Some(result)
  }
  fn parse_detected_language(json: &serde_json::Value) -> Option<String> {
      // response[2] = detected source language code
      json.get(2)?.as_str().map(|s| s.to_string())
  }
  ```
  - For the fallback endpoint (`translate_a/t`), response is simpler JSON (`{sentences:[{text:"..."}], src:"en"}`) — struct parsing works here, but `serde_json::Value` is fine too for consistency.
  - Rust response model (returned to TypeScript):
  ```rust
  #[derive(Serialize)]
  struct TranslationResult {
      translated_text: String,
      detected_language: Option<String>,
  }
  ```

**M1.3 — TranslationProvider contract (TypeScript)**
- File: `src/providers/translation-provider.ts`
  - Interface defines the contract; implementation calls Rust via `invoke`:
  ```typescript
  interface TranslationProvider {
    readonly key: string;
    readonly name: string;
    readonly supportedLanguages: LanguageCode[];
    translate(request: TranslationRequest): Promise<TranslationResponse>;
    validate(): Promise<boolean>;
  }
  ```

**M1.4 — Google Translate provider (TypeScript thin wrapper)**
- File: `src/providers/google.ts`
  - Implements `TranslationProvider`
  - **Does NOT call `fetch()` directly** — calls Rust backend:
  ```typescript
  import { invoke } from '@tauri-apps/api/core';

  class GoogleProvider implements TranslationProvider {
    async translate(request: TranslationRequest): Promise<TranslationResponse> {
      const result = await invoke<TranslationResult>('translate_text', {
        text: request.text,
        sourceLang: request.sourceLanguage,
        targetLang: request.targetLanguage,
      });
      return {
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage,
      };
    }
  }
  ```

**M1.5 — TranslationService**
- File: `src/services/translation.ts`
  - `translate(request, provider?)` — translate with default or specified provider
  - `getAvailableProviders()` — list of providers
  - `setActiveProvider(key)` — switch provider

**M1.6 — Unit tests**
- Rust: `cargo test` — test response parsing for both endpoints
- TypeScript: `pnpm test` — test provider wrapper, service orchestration

**Done condition:**
```typescript
const result = await translate({ text: "Hello", source: "auto", target: "vi" });
// result.translatedText === "Xin chào"
```

---

### M2a — Ctrl+Q Quick Translate — Windows (3-4 days) ⭐ Core MVP

**Goal:** Select text in any app on Windows → Ctrl+Q → popup shows translation.

**Timeline note:** Split M2a (Windows-only) first, M2b (macOS port) later — avoid debugging 2 OS simultaneously. Windows is usually simpler because `enigo` and `arboard` are stable there.

#### Tasks:

**M2a.1 — Rust: Global Hotkey (Ctrl+Q)**
- Use `tauri-plugin-global-shortcut` (cross-platform, stable)
- File: `src-tauri/src/main.rs` — init plugin + register shortcut
  ```rust
  // Use tauri_plugin_global_shortcut::Builder instead of manual registration
  app.plugin(tauri_plugin_global_shortcut::Builder::new()
      .with_handler(|app, shortcut, event| {
          if shortcut == "CmdOrCtrl+Q" {
              app.emit("quick-translate", ()).ok();
          }
      })
      .build())?;
  ```
- **Check register result** — if shortcut is taken by another app (browser, IDE), `register()` may fail silently. Must:
  - Log warning on register failure
  - Show notification suggesting hotkey change (later in M4)
  - `Ctrl+Q` commonly conflicts (many apps use Ctrl+Q for quit/quick action)

**M2a.2 — Rust: Selection Capture (clipboard simulation)**
- File: `src-tauri/src/commands/selection.rs`
- **Do NOT use `UI Automation` or `GetClipboardOwner`** — not universal
- **No-selection detection:** If user presses Ctrl+Q without selecting anything, the clipboard won't change after Ctrl+C. Must detect this — otherwise the app would "translate" the user's old clipboard content, giving a false positive that looks like it works but is actually garbage.
- **⚠️ Concurrency guard (double-trigger protection):** If user presses Ctrl+Q twice quickly while the first translation is still in-flight, two backup/simulate-copy/restore flows run concurrently → can corrupt clipboard or return wrong text. Add an `AtomicBool` or `Mutex<bool>` in Tauri managed state:
  ```rust
  // In Tauri state:
  struct OperationGuard {
      is_running: AtomicBool,
  }
  // At start of get_selected_text / replace_with_translation:
  if !guard.is_running.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok() {
      return Err("Operation already in progress".to_string());
  }
  // In finally/drop: guard.is_running.store(false, Ordering::SeqCst);
  ```
- Actual flow:
  ```rust
  use enigo::{Enigo, Settings, Key, Direction};
  use arboard::Clipboard;
  use std::thread;
  use std::time::Duration;

  #[tauri::command]
  async fn get_selected_text() -> Result<String, String> {
      // 1. Backup current clipboard
      let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
      let old_content = clipboard.get_text().ok().map(|s| s.to_string());

      // 2. Simulate Ctrl+C (enigo 0.2+ API — NOT the old key_sequence_parse)
      let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
      enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
      enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| e.to_string())?;
      enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;

      // 3. Poll clipboard for change (~80ms, up to 200ms timeout)
      let start = std::time::Instant::now();
      loop {
          thread::sleep(Duration::from_millis(20));
          if start.elapsed() > Duration::from_millis(200) { break; }
          let current = clipboard.get_text().ok().map(|s| s.to_string());
          if current != old_content {
              // Clipboard changed → this is the selected text
              let selected = current.unwrap_or_default();
              // Restore original clipboard
              if let Some(old) = &old_content {
                  clipboard.set_text(old.as_str()).ok();
              }
              return Ok(selected);
          }
      }

      // 4. Clipboard did NOT change → no text was selected
      // Restore original clipboard (in case Ctrl+C did something unexpected)
      if let Some(old) = &old_content {
          clipboard.set_text(old.as_str()).ok();
      }
      Err("No text selected".to_string())
  }
  ```
- File: `src-tauri/src/commands/input.rs` — separate input simulation
- **Note:** `enigo` API used above is for version 0.2+/0.5+/0.6+. Do NOT use old `Enigo::new()` or `key_sequence_parse()` — these are removed.

**M2a.3 — Rust: Clipboard Backup/Restore**
- File: `src-tauri/src/commands/clipboard.rs`
  ```rust
  #[tauri::command]
  async fn backup_clipboard() -> Result<Option<String>, String>

  #[tauri::command]
  async fn restore_clipboard(content: Option<String>) -> Result<(), String>
  ```
- **Must** backup before capture, restore after — otherwise user loses their clipboard content when they paste elsewhere

**M2a.4 — Rust: Popup Window (non-focus-stealing, create once at startup)**
- File: `src-tauri/src/commands/window.rs`
- **⚠️ Create popup window ONCE at app startup, hidden by default.** Do NOT create a new window on every Ctrl+Q — that would spawn a native window each time (slow, ruins "instant translate" UX) and require re-applying `WS_EX_NOACTIVATE` every time.
- Flow: app start → create hidden popup window → Ctrl+Q → update content + reposition + show → Escape/click outside → hide (do NOT destroy)
- **Non-focus-stealing:** Requires `WS_EX_NOACTIVATE` (Windows) — Tauri's high-level `WindowBuilder` doesn't expose this directly, needs `raw-window-handle` to set extended style after window creation (only once, at startup)
- Position near text selection (if cursor position can be detected)
- Click outside → hide popup
- Escape → hide popup
- Store popup window handle in Tauri managed state for reuse

**M2a.5 — React: QuickTranslatePopup**
- File: `src/components/QuickTranslatePopup.tsx`
  ```
  ┌─────────────────────────────┐
  │ English → Vietnamese        │
  ├─────────────────────────────┤
  │                             │
  │ Xin chào thế giới           │
  │                             │
  │                     Copy    │
  └─────────────────────────────┘
  ```
  - Loading state (spinner)
  - Success state (show translation)
  - Error state (error message + retry)
  - Copy button
  - Auto-size based on content

**M2a.6 — React: Translation Store (MVI)**
- File: `src/stores/translationStore.ts`
  - State: `{ inputText, translatedText, isLoading, error, sourceLang, targetLang }`
  - Intents: `TRANSLATE`, `SHOW_POPUP`, `HIDE_POPUP`, `COPY_RESULT`
  - Reducer handles state transitions

**M2a.7 — End-to-end wiring (Windows)**
- Ctrl+Q → tauri-plugin-global-shortcut emits event → React receives → capture text (clipboard sim) → translate → show popup
- Popup dismisses on click outside or Escape
- **Clipboard backup/restore:** backup before capture, restore after reading

**M2a.8 — Test on multiple apps (Windows)**
- Chrome: select text → Ctrl+Q → popup
- VS Code: select text → Ctrl+Q → popup
- Notepad: select text → Ctrl+Q → popup
- Word: select text → Ctrl+Q → popup

**Done condition (Windows):**
- Chrome: select "Hello world" → Ctrl+Q → popup shows "Xin chào thế giới"
- Popup loading → result → copy
- Escape/click outside → dismiss
- User's original clipboard is restored after capture

---

### M2b — Ctrl+Q Quick Translate — macOS Port (2-3 days)

**Goal:** Port M2a to macOS, handle Accessibility permission.

#### Tasks:

**M2b.1 — macOS Accessibility Permission**
- File: `src-tauri/src/commands/permissions.rs`
- Detect Accessibility permission:
  ```rust
  // macOS: AXIsProcessTrusted() from ApplicationServices framework
  // Returns true/false
  #[tauri::command]
  async fn check_accessibility_permission() -> Result<bool, String>
  ```
- If not granted:
  - Show user guidance: "App needs Accessibility permission to read text selection. Go to System Settings → Privacy & Security → Accessibility → add this app."
  - **No silent fail** — must clearly tell the user why the app isn't working
- Link to open System Settings: `open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"`

**M2b.2 — macOS hotkey + selection capture**
- `tauri-plugin-global-shortcut` already supports macOS (uses `CGEventTap` internally) — no extra code needed
- `enigo` supports macOS key simulation — no extra code needed
- `arboard` supports macOS clipboard — no extra code needed
- Verify Ctrl+Q works on macOS
- Verify selection capture works on macOS

**M2b.3 — macOS popup**
- Verify popup doesn't steal focus on macOS
- Verify positioning on macOS

**Done condition (macOS):**
- Ctrl+Q works on macOS
- Permission dialog appears if Accessibility not granted
- Popup doesn't steal focus

---

### M3a — Alt+W Replace Translation — Windows (2-3 days) ⭐ Core MVP

**Goal:** Select text → Alt+W → replace selection with translation.

#### Tasks:

**M3a.1 — Rust: Alt+W Hotkey**
- Use `tauri-plugin-global-shortcut` (same as M2a.1)
- **Chosen hotkey: `Ctrl+Alt+W`** — NOT `Ctrl+W` (universal close-tab), NOT `Alt+W` (Windows menu accelerator, would hijack Window menu in all apps with menu bars). `Ctrl+Alt+W` is uncommon enough to avoid conflicts while still comfortable to press.
- Register as `"CmdOrCtrl+Alt+W"` in the shortcut string
- Emit event `replace-hotkey-pressed`
- **Note:** If even `Ctrl+Alt+W` conflicts in practice, move hotkey customization to M4 (sooner than originally planned) — the pattern is already there, just needs a settings UI.

**M3a.2 — Rust: Full Replace Flow (capture → translate → paste → restore)**
- File: `src-tauri/src/commands/input.rs` (extended) + `src-tauri/src/commands/translate.rs`
- **⚠️ Same concurrency guard as M2a.2** — `AtomicBool` or `Mutex<bool>` to skip if another operation is running. Without this, rapid Ctrl+Alt+W presses corrupt clipboard state.
- This is the **complete end-to-end flow**, not just the paste step:
  ```rust
  #[tauri::command]
  async fn replace_with_translation(
      source_lang: String,
      target_lang: String,
      state: State<'_, OperationGuard>,
  ) -> Result<String, String> {
      // 0. Concurrency guard
      if !state.is_running.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok() {
          return Err("Operation already in progress".to_string());
      }
      // 1. Backup clipboard
      let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
      let old_content = clipboard.get_text().ok().map(|s| s.to_string());

      // 2. Capture selection (Ctrl+C sim + clipboard read)
      let selected = get_selected_text_from_clipboard(&mut clipboard, &old_content)?;

      // 3. Translate
      let translated = translate_via_google(&selected, &source_lang, &target_lang).await?;

      // 4. Set clipboard = translated text
      clipboard.set_text(translated.as_str()).map_err(|e| e.to_string())?;

      // 5. Simulate Ctrl+V (enigo 0.2+ API)
      let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
      enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
      enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
      enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;

      // 6. Restore original clipboard (poll to confirm paste happened)
      // Delay is longer than M2a because some apps process paste asynchronously
      // (autoformat, spellcheck). 100-150ms is safer than 50ms for long text.
      let start = std::time::Instant::now();
      loop {
          thread::sleep(Duration::from_millis(25));
          if start.elapsed() > Duration::from_millis(150) { break; }
      }
      if let Some(old) = &old_content {
          clipboard.set_text(old.as_str()).ok();
      }

      Ok(translated)
  }
  ```
- **Clipboard delay note:** 150ms is a starting point. For very long text (paragraphs) or apps with heavy paste processing (Word autoformat, spellcheck), may need 200ms+. Test with long text and adjust. Polling the clipboard state is safer than a fixed sleep.

**M3a.3 — Safety flow (already implemented in M3a.2 snippet)**
- The full flow is implemented as a single Tauri command in M3a.2 — no need for separate orchestration
- If translation fails at any step → `Err` is returned, clipboard is restored, no text is lost
- **Read-only field handling:** If the field is disabled/read-only (PDF viewer, disabled input), `Ctrl+V` will fail silently. Must:
  - Detect: after paste, re-read clipboard — if it still contains translated text (wasn't pasted), log warning
  - No crash, no error shown to user — just graceful silent fail
  - Document this limitation in README

**M3a.4 — React: Replace handler**
- File: `src/services/clipboard.ts`
  - `replaceSelection(translatedText)` — invoke Tauri commands

**M3a.5 — Test on multiple apps (Windows)**
- Chrome textarea
- VS Code editor
- Notepad
- Word
- contenteditable elements
- Multiline text
- Unicode (Vietnamese, Japanese, Korean, Chinese)
- **Read-only fields:** PDF viewer, disabled input → graceful fail

**Done condition (Windows):**
- "Hello world" → Alt+W → replaced with "Xin chào thế giới"
- Translation fails → original text preserved
- Original clipboard restored after replace
- Read-only field → graceful fail, no crash

---

### M3b — Alt+W Replace Translation — macOS Port (1-2 days)

**Goal:** Port M3a to macOS.

#### Tasks:

**M3b.1 — macOS permission check**
- If Accessibility permission not granted → show guidance (same as M2b.1)
- Alt+W requires same permission as Ctrl+Q

**M3b.2 — Verify Alt+W on macOS**
- Test on Chrome, VS Code, TextEdit, Notes
- Verify clipboard restore
- Verify read-only handling

**Done condition (macOS):**
- Alt+W works on macOS
- Clipboard restore works
- Permission dialog appears if needed

---

### M4 — Independent Language Config (1 day)

**Goal:** Ctrl+Q and Alt+W have independent language configurations.

#### Tasks:

**M4.1 — Domain models**
- File: `src/domain/settings.ts`
  ```typescript
  interface QuickTranslateConfig {
    sourceLanguage: LanguageCode;
    targetLanguage: LanguageCode;
  }

  interface ReplaceConfig {
    sourceLanguage: LanguageCode;
    targetLanguage: LanguageCode;
  }

  interface AppSettings {
    quickTranslate: QuickTranslateConfig;
    replace: ReplaceConfig;
    activeProvider: string;
  }
  ```

**M4.2 — Rust: Settings Persistence**
- File: `src-tauri/src/commands/settings.rs`
  ```rust
  #[tauri::command]
  async fn load_settings() -> Result<AppSettings, String>

  #[tauri::command]
  async fn save_settings(settings: AppSettings) -> Result<(), String>
  ```
  - Store in app data directory
  - JSON format
  - Default values when no file exists

**M4.3 — React: Settings Store**
- File: `src/stores/settingsStore.ts`
  - Load settings on app start
  - Update settings when user changes them

**Done condition:**
- Ctrl+Q uses its own config (source: auto, target: Vietnamese)
- Alt+W uses its own config (source: auto, target: English)
- Settings persist to file, reload on restart

---

### M5 — Persistence (0.5 day)

**Goal:** Settings survive restart.

#### Tasks:

**M5.1 — Implement settings file**
- File: `settings.json` in app data directory
- Auto-create when missing
- Migration on version upgrade

**M5.2 — Load on startup**
- App start → load settings → apply to hotkey handlers

**Done condition:**
- Change settings → restart app → settings retained

---

### M6 — Popup/UI Polish (1-2 days)

**Goal:** Beautiful, smooth popup resembling QTranslate.

#### Tasks:

**M6.1 — Popup positioning**
- Display near text selection
- Multi-monitor support
- DPI scaling
- Stay within screen bounds

**M6.2 — UI styling**
- Compact popup
- Dark/light theme
- Loading animation
- Copy button with feedback
- Source/target language indicator
- Retry on error

**M6.3 — Keyboard interaction**
- Escape → dismiss
- Ctrl+C → copy result
- Arrow keys → navigate (if alternatives exist)

**Done condition:**
- Popup positions correctly on multi-monitor
- DPI scaling works
- Dark/light theme
- Smooth, no lag

---

### M7 — Native Desktop Reliability (2-3 days)

**Goal:** Hotkeys, clipboard, selection work reliably on Windows + macOS.

#### Tasks:

**M7.1 — Hotkey conflict handling**
- Detect conflict on register failure
- Show notification suggesting hotkey change
- Fallback: use alternative hotkey if conflict

**M7.2 — Clipboard edge cases**
- Handle clipboard lock (another app holding clipboard)
- Handle clipboard change detection
- Handle binary content in clipboard (non-text)

**M7.3 — Selection capture robustness**
- Test on many apps
- Handle protected content (DRM, security software blocking Ctrl+C)
- Handle different text encodings
- Handle empty selection gracefully

**M7.4 — System tray**
- Tray icon
- Right-click menu
- Minimize to tray

**M7.5 — Single instance**
- Only one instance running
- Second instance → focus existing

**Done condition:**
- Ctrl+Q and Alt+W work reliably on Windows + macOS
- System tray works
- Single instance guard

---

### M8 — Multiple Providers (2-3 days)

**Goal:** Expand from Google → add DeepL, Microsoft, OpenAI.

#### Tasks:

**M8.1 — DeepL provider**
- File: `src/providers/deepl.ts`
- Free API or web scraping

**M8.2 — Microsoft Translator**
- File: `src/providers/microsoft.ts`
- Free tier available

**M8.3 — OpenAI/GPT**
- File: `src/providers/openai.ts`
- API key required

**M8.4 — Provider registry**
- File: `src/services/provider-registry.ts`
  ```typescript
  class ProviderRegistry {
    private providers: Map<string, TranslationProvider>;
    register(provider: TranslationProvider): void;
    get(key: string): TranslationProvider;
    getAll(): TranslationProvider[];
  }
  ```

**Done condition:**
- User can select Google/DeepL/Microsoft/OpenAI
- Each provider works independently

---

### M9 — History (1-2 days)

**Goal:** Save translation history.

#### Tasks:

**M9.1 — History model**
- File: `src/domain/history.ts`
  ```typescript
  interface HistoryEntry {
    sourceText: string;
    sourceLanguage: LanguageCode;
    targetLanguage: LanguageCode;
    translatedText: string;
    provider: string;
    timestamp: number;
  }
  ```

**M9.2 — History storage**
- File: `src/services/history.ts`
  - Store in localStorage or file
  - Load/save/delete/clear

**M9.3 — History UI**
- File: `src/components/HistoryPanel.tsx`
  - Display history
  - Click to restore
  - Delete entry
  - Clear all

**Done condition:**
- Ctrl+Q → translate → save to history
- History panel displays correctly
- Restart app → history preserved

---

### M10 — Extended Features (3-5 days)

**Goal:** OCR, TTS, Dictionary, Summarize, Rewrite.

#### Tasks:

**M10.1 — OCR**
- Rust: screen capture → image
- Tesseract.js or native OCR
- Extract text → translate

**M10.2 — TTS**
- Web Speech API or native TTS
- Play translated text audio

**M10.3 — Dictionary**
- Word lookup
- Definitions, examples
- Wiktionary API

**M10.4 — Summarize/Rewrite**
- OpenAI/GPT integration
- Summarize long text
- Rewrite in different style

**Done condition:**
- OCR: capture screen → extract text → translate
- TTS: hear pronunciation
- Dictionary: word lookup
- Summarize: condense long text

---

## Design Decisions

### 1. Frontend: React + TypeScript + CSS Modules
- No large UI framework (Material UI, Ant Design)
- CSS Modules for scoped styles
- Custom components matching QTranslate desktop UI

### 2. State Management: Zustand
- MVI pattern: State → Intent → Reducer → New State
- No Redux or MobX needed
- Zustand is lightweight, TypeScript-first
- **Added to M0.2 dependencies**

### 3. Backend: Rust minimal + cross-platform crates
- **No custom hotkey/input/clipboard code per OS**
- `tauri-plugin-global-shortcut` for hotkeys
- `enigo` for input simulation
- `arboard` for clipboard
- Only write glue code + permission checks

### 4. Translation API: Rust-side calls (CORS avoidance)
- Translation HTTP calls run in Rust (`src-tauri/src/commands/translate.rs`), NOT in React TypeScript
- Reason: Google's unofficial endpoints do not provide CORS headers — `fetch()` in Tauri webview gets blocked
- Rust `reqwest` HTTP client is not subject to CORS restrictions
- TypeScript layer is a thin wrapper: `invoke('translate_text', ...)` → Rust → `reqwest` → Google API
- No API key needed for P0 (unofficial endpoint)
- **2 separate endpoints, separate parsers, NO simple fallback** (different response schemas)
- Treat as "quick test only", not a long-term production solution — rate-limiting/IP blocking may occur

### 5. Build: Tauri CLI
- `pnpm tauri dev` — development
- `pnpm tauri build` — production
- Auto-generates `.exe` / `.app`

---

## Platform-specific Notes

### macOS — Accessibility Permission (from M2b)
- App **requires** Accessibility permission to simulate keypresses (Ctrl+C/V)
- System Settings → Privacy & Security → Accessibility
- If not granted: show clear guidance, do NOT fail silently
- Detect permission status: `AXIsProcessTrusted()` from ApplicationServices framework

### Windows — UIPI Limitation
- `SendInput` is blocked if target app runs with higher privilege (admin)
- Our app should not run elevated (to avoid UAC prompts)
- Accept limitation: Alt+W won't work with elevated apps
- Document in README

### Windows — Popup Focus
- `WS_EX_NOACTIVATE` requires `raw-window-handle` to set after window creation
- Budget extra time for M2a.4

---

## Verification Plan

### Manual Testing Checklist

**M2a (Windows) — Ctrl+Q:**
- [ ] Chrome: select "Hello" → Ctrl+Q → popup shows "Xin chào"
- [ ] VS Code: select text → Ctrl+Q → popup
- [ ] Notepad: select text → Ctrl+Q → popup
- [ ] Word: select text → Ctrl+Q → popup
- [ ] Long text: select paragraph → Ctrl+Q → popup shows full content
- [ ] Vietnamese text: select "Xin chào" → Ctrl+Q → popup
- [ ] Japanese text: select "こんにちは" → Ctrl+Q → popup
- [ ] Error state: disconnect internet → Ctrl+Q → error message
- [ ] Clipboard restore: copy something → Ctrl+Q → paste original elsewhere → OK

**M3a (Windows) — Alt+W:**
- [ ] Chrome: select "Hello" → Alt+W → replaced
- [ ] VS Code: select text → Alt+W → replaced
- [ ] Notepad: select text → Alt+W → replaced
- [ ] Word: select text → Alt+W → replaced
- [ ] Multiline: select multi-line → Alt+W → replaced correctly
- [ ] Unicode: select Vietnamese → Alt+W → replaced
- [ ] Fail case: disconnect internet → Alt+W → original text preserved
- [ ] Clipboard restore: copy something → Alt+W → paste original elsewhere → OK
- [ ] Read-only field: PDF viewer → Alt+W → graceful fail, no crash

**M2b/M3b (macOS):**
- [ ] Permission dialog appears when Accessibility not granted
- [ ] Ctrl+Q works on macOS
- [ ] Alt+W works on macOS
- [ ] Clipboard restore works on macOS

**Cross-platform:**
- [ ] Windows: Ctrl+Q + Alt+W works
- [ ] macOS: Ctrl+Q + Alt+W works

### Automated Testing
- Unit tests for translation service
- Unit tests for domain models
- Integration tests for Tauri commands (if possible)

---

## Reference Files (ahatem/QTranslate)

| Concept | File Reference | What to learn |
|---------|---------------|---------------|
| Translation interface | `api/.../translator/Translator.kt` | Request/Response/Error model |
| Language model | `api/.../language/LanguageCode.kt` | BCP-47 validation, constants |
| Plugin boundary | `api/.../plugin/Plugin.kt` | Plugin lifecycle, settings |
| Service contract | `api/.../plugin/Service.kt` | Service key, metadata, options |
| MVI Store | `core/.../mvi/MainStore.kt` | State management pattern |
| MVI State | `core/.../mvi/MainState.kt` | Immutable state model |
| MVI Intent | `core/.../mvi/MainIntent.kt` | User action modeling |
| Google provider | `plugins/.../GoogleTranslatorService.kt` | API call pattern, fallback |
| Google plugin | `plugins/.../GooglePlugin.kt` | Plugin registration |
| Quick Translate | `ui-swing/.../QuickTranslateDialog.kt` | Popup behavior |
| Settings | `core/.../settings/data/Configuration.kt` | Config model |
| History | `core/.../history/HistoryRepository.kt` | Persistence pattern |

---

## Timeline Estimates (updated)

| Milestone | Duration | Cumulative |
|-----------|----------|------------|
| M0 Foundation | 1 day | 1 day |
| M1 Translation Core | 1-2 days | 2-3 days |
| M2a Ctrl+Q Windows ⭐ | 3-4 days | 5-7 days |
| M2b Ctrl+Q macOS | 2-3 days | 7-10 days |
| M3a Alt+W Windows ⭐ | 2-3 days | 9-13 days |
| M3b Alt+W macOS | 1-2 days | 10-15 days |
| M4 Language Config | 1 day | 11-16 days |
| M5 Persistence | 0.5 day | 11.5-16.5 days |
| M6 UI Polish | 1-2 days | 12.5-18.5 days |
| M7 Native Reliability | 2-3 days | 14.5-21.5 days |
| M8 Multiple Providers | 2-3 days | 16.5-24.5 days |
| M9 History | 1-2 days | 17.5-26.5 days |
| M10 Extended Features | 3-5 days | 20.5-31.5 days |

**Windows MVP (M0-M3a):** 9-13 days → Ctrl+Q + Alt+W working on Windows
**Cross-platform MVP (M0-M3b):** 10-15 days → working on Windows + macOS
**Full product (M0-M10):** 20.5-31.5 days

---

## Important Notes

1. **DO NOT over-engineer** — P0 only needs TRANSLATION SERVICE + POPUP + REPLACE. No DI, event bus, plugin runtime, CQRS yet.

2. **Do not clone 100%** — Learn architectural ideas, don't copy implementation. ahatem/QTranslate is Kotlin/Swing, ours is TypeScript/Rust.

3. **M2a + M3a are the absolute focus** — If Ctrl+Q and Alt+W work on Windows, the project has proven its product.

4. **Hotkey: `Ctrl+Q` + `Ctrl+Alt+W`** — Locked in advance. `Ctrl+W` = universal close, `Alt+W` = Windows menu accelerator. If `Ctrl+Alt+W` still conflicts, move hotkey customization to M4.

5. **Build/test loop must be fast** — `pnpm tauri dev` → edit React → save → see changes immediately. No full app rebuild for CSS edits.

6. **Clipboard backup/restore is mandatory** — No backup = user loses their clipboard content. This is a serious UX bug.

7. **macOS Accessibility is a blocking requirement** — No permission = app doesn't work. MUST show guidance, never fail silently.

8. **Google unofficial API is temporary only** — May get blocked/rate-limited. Plan to switch to official API or other providers in M8.

9. **Windows first, macOS second** — Avoid debugging 2 OS at once. M2a/M3a Windows → M2b/M3b macOS.

10. **Translation calls run in Rust, NOT React** — Google's unofficial endpoints have no CORS headers. `fetch()` in Tauri webview will be blocked. All HTTP translation calls go through `src-tauri/src/commands/translate.rs` using `reqwest`.

11. **enigo 0.2+ API required** — Old `Enigo::new()` / `key_sequence_parse("{CTRL}c")` is removed. Use `Enigo::new(&Settings::default())` + `Key::Control` / `Key::Unicode('c')` / `Direction::Press/Click/Release`. Pin version in `Cargo.toml`.

12. **No-selection detection is mandatory from M2a** — If user presses Ctrl+Q without selecting anything, clipboard won't change. Must detect `clipboard_after == clipboard_before` → show "No text selected" message. Otherwise the app silently translates the user's old clipboard content.

13. **Clipboard restore delay: 150ms+** — 50ms is too short for long text or apps with async paste processing (Word, autoformat). Start at 150ms, test with long paragraphs, increase if needed.

14. **Tauri 2 permissions must be declared explicitly** — `capabilities/default.json` must list every plugin and custom command permission. Tauri 2 defaults to deny-all. Missing permissions cause "not allowed" errors that look like logic bugs. Do this in M0.2.

15. **Popup window: create once at startup, show/hide on trigger** — Do NOT create a new window per Ctrl+Q. Create the popup once (hidden), then update content + reposition + show on each trigger. Only set `WS_EX_NOACTIVATE` once.

16. **Concurrency guard (AtomicBool) for hotkey operations** — Rapid double-press of Ctrl+Q or Ctrl+Alt+W while the first operation is in-flight will corrupt clipboard state. Use `AtomicBool` or `Mutex<bool>` in Tauri managed state to skip overlapping operations.

17. **Google Translate response: use `serde_json::Value`, not derive structs** — The `translate_a/single` response has inconsistent nested types. `#[derive(Deserialize)]` will fail. Traverse manually with `value[0][n][0].as_str()` etc.
