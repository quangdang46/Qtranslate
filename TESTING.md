# Manual Testing Checklist

## Prerequisites

### Windows
1. Build: `cargo build --manifest-path src-tauri/Cargo.toml`
2. Run: `cargo run --manifest-path src-tauri/Cargo.toml`

### macOS
1. Build: `cargo build --manifest-path src-tauri/Cargo.toml`
2. Run: `cargo run --manifest-path src-tauri/Cargo.toml`
3. Grant Accessibility permission when prompted

---

## Windows Tests (M2a)

### Basic functionality
- [ ] Chrome: select text → Ctrl+Q → popup shows translation
- [ ] VS Code: select text → Ctrl+Q → popup shows translation
- [ ] Notepad: select text → Ctrl+Q → popup shows translation
- [ ] Word: select text → Ctrl+Q → popup shows translation

### Edge cases
- [ ] Long text: select paragraph → Ctrl+Q → popup shows full translation
- [ ] Vietnamese text: select "Xin chao" → Ctrl+Q → popup shows English translation
- [ ] Japanese text: select text → Ctrl+Q → popup shows translation

### Error handling
- [ ] Disconnect internet → Ctrl+Q → error message shown
- [ ] Press Ctrl+Q with nothing selected → "No text selected" message

### Clipboard
- [ ] Copy something to clipboard → Ctrl+Q → paste original elsewhere → original still there
- [ ] Select text → Ctrl+Q → clipboard restored after capture

---

## macOS Tests (M2b)

### Accessibility permission
- [ ] First run shows permission dialog
- [ ] Granting permission allows hotkey to work
- [ ] Denying permission shows error message

### Basic functionality
- [ ] Chrome: select text → Ctrl+Q → popup shows translation
- [ ] VS Code: select text → Ctrl+Q → popup shows translation
- [ ] Safari: select text → Ctrl+Q → popup shows translation

---

## Expected Behavior
- Popup appears near cursor position
- Loading state shows during translation
- Translation result displays correctly
- Copy button works
- Escape dismisses popup
- Click outside dismisses popup

## Notes
- First run may require allowing the app through Windows Firewall
- Ctrl+Q may conflict with other apps (e.g., VS Code uses Ctrl+Q for quick open)
- macOS requires Accessibility permission for key simulation
