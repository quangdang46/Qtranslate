use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;

/// Simulate Ctrl+V to paste from clipboard.
pub fn simulate_paste() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo error: {}", e))?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| format!("Enigo key press error: {}", e))?;
    enigo
        .key(Key::Unicode('v'), Direction::Click)
        .map_err(|e| format!("Enigo key click error: {}", e))?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| format!("Enigo key release error: {}", e))?;
    Ok(())
}

/// Set clipboard content and paste it.
#[tauri::command]
pub async fn paste_text(text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    clipboard
        .set_text(&text)
        .map_err(|e| format!("Clipboard set error: {}", e))?;

    // Small delay to ensure clipboard is ready
    thread::sleep(Duration::from_millis(50));

    simulate_paste()
}
