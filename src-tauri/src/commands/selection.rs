use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::State;

/// Concurrency guard to prevent double-trigger corruption.
pub struct OperationGuard {
    pub is_running: AtomicBool,
}

impl OperationGuard {
    pub fn new() -> Self {
        Self {
            is_running: AtomicBool::new(false),
        }
    }
}

/// Capture selected text via clipboard simulation.
///
/// Flow:
/// 1. Backup current clipboard
/// 2. Simulate Ctrl+C (enigo 0.2+ API)
/// 3. Poll clipboard for change (~80ms, up to 200ms timeout)
/// 4. Read clipboard → this is the selected text
/// 5. Restore original clipboard
///
/// Returns error if no text was selected (clipboard didn't change).
#[tauri::command]
pub async fn get_selected_text(
    state: State<'_, OperationGuard>,
) -> Result<String, String> {
    // Concurrency guard
    if state
        .is_running
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("Operation already in progress".into());
    }

    let result = capture_selected_text();
    state.is_running.store(false, Ordering::SeqCst);
    result
}

fn capture_selected_text() -> Result<String, String> {
    // 1. Backup current clipboard
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    let old_content = clipboard.get_text().ok().map(|s| s.to_string());

    // 2. Simulate Ctrl+C (enigo 0.2+ API)
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo error: {}", e))?;
    enigo
        .key(Key::Control, Direction::Press)
        .map_err(|e| format!("Enigo key press error: {}", e))?;
    enigo
        .key(Key::Unicode('c'), Direction::Click)
        .map_err(|e| format!("Enigo key click error: {}", e))?;
    enigo
        .key(Key::Control, Direction::Release)
        .map_err(|e| format!("Enigo key release error: {}", e))?;

    // 3. Poll clipboard for change (~80ms, up to 200ms timeout)
    let start = std::time::Instant::now();
    loop {
        thread::sleep(Duration::from_millis(20));
        if start.elapsed() > Duration::from_millis(200) {
            break;
        }
        let current = clipboard.get_text().ok().map(|s| s.to_string());
        if current != old_content {
            // Clipboard changed → this is the selected text
            let selected = current.unwrap_or_default();
            // Restore original clipboard
            if let Some(old) = &old_content {
                let _ = clipboard.set_text(old.as_str());
            }
            return Ok(selected);
        }
    }

    // 4. Clipboard did NOT change → no text was selected
    // Restore original clipboard
    if let Some(old) = &old_content {
        let _ = clipboard.set_text(old.as_str());
    }
    Err("No text selected".into())
}
