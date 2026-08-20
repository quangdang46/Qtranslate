# QTranslate

A fast translation utility inspired by QTranslate. Built with Tauri 2 + React + TypeScript + Rust.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Rust (Tauri 2)
- **State:** Zustand (MVI pattern)
- **Translation:** Google Translate unofficial API (Rust-side, avoids CORS)
- **Input simulation:** enigo 0.2+ (NOT old API)
- **Clipboard:** arboard
- **Hotkeys:** tauri-plugin-global-shortcut

## Architecture
- Translation API calls run in Rust (NOT React) — Google endpoints have no CORS headers
- TypeScript is a thin wrapper calling `invoke()` to Rust backend
- MVI pattern: State → Intent → Reducer → New State

## Key Design Decisions
- **enigo 0.2+ API** — old `key_sequence_parse()` is removed
- **Clipboard backup/restore mandatory** — every clipboard op must restore original
- **No-selection detection** — if clipboard doesn't change after Ctrl+C, user didn't select anything
- **Concurrency guard** — AtomicBool prevents double-trigger corruption
- **Popup created once at startup** — not per hotkey press
- **Hotkeys:** Ctrl+Q (Quick Translate), Ctrl+Alt+W (Replace)

## Build
```bash
# Dev
cargo build --manifest-path src-tauri/Cargo.toml  # Rust
npx vite build                                     # Frontend

# Full app
npx tauri build                                    # Produces .exe/.app
```

## Testing
```bash
npx vitest run        # TypeScript tests
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests
```

## Common Issues
- Tauri 2 capabilities: `capabilities/default.json` must list all permissions (deny-all by default)
- `window:default` → must be `core:window:default` in Tauri 2
- Icons: need `src-tauri/icons/icon.ico` for Windows builds
