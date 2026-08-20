use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;
use tauri::State;

use super::selection::OperationGuard;

/// Simulate Ctrl+C to copy selected text.
fn simulate_copy() -> Result<(), String> {
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
    Ok(())
}

/// Simulate Ctrl+V to paste from clipboard.
fn simulate_paste() -> Result<(), String> {
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

/// Full replace flow: capture selection → translate → paste → restore clipboard.
///
/// Flow:
/// 1. Concurrency guard
/// 2. Backup clipboard
/// 3. Capture selection (Ctrl+C + poll clipboard)
/// 4. Translate via Google API
/// 5. Set clipboard = translated text
/// 6. Simulate Ctrl+V
/// 7. Wait 150ms for paste to complete
/// 8. Restore original clipboard
#[tauri::command]
pub async fn replace_with_translation(
    source_lang: String,
    target_lang: String,
    state: State<'_, OperationGuard>,
) -> Result<String, String> {
    // Concurrency guard
    if state
        .is_running
        .compare_exchange(false, true, std::sync::atomic::Ordering::SeqCst, std::sync::atomic::Ordering::SeqCst)
        .is_err()
    {
        return Err("Operation already in progress".into());
    }

    let result = do_replace(&source_lang, &target_lang).await;
    state.is_running.store(false, std::sync::atomic::Ordering::SeqCst);
    result
}

async fn do_replace(source_lang: &str, target_lang: &str) -> Result<String, String> {
    // 1. Backup clipboard
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    let old_content = clipboard.get_text().ok().map(|s| s.to_string());

    // 2. Capture selection
    simulate_copy().map_err(|e| format!("Copy simulation error: {}", e))?;

    let start = std::time::Instant::now();
    let mut selected = None;
    loop {
        thread::sleep(Duration::from_millis(20));
        if start.elapsed() > Duration::from_millis(200) {
            break;
        }
        let current = clipboard.get_text().ok().map(|s| s.to_string());
        if current != old_content {
            selected = current;
            break;
        }
    }

    let selected = match selected {
        Some(text) if !text.is_empty() => text,
        _ => {
            // No selection - restore clipboard
            if let Some(old) = &old_content {
                let _ = clipboard.set_text(old.as_str());
            }
            return Err("No text selected".into());
        }
    };

    // 3. Translate
    let translated = translate_via_google(&selected, source_lang, target_lang).await?;

    // 4. Set clipboard = translated text
    clipboard
        .set_text(&translated)
        .map_err(|e| format!("Clipboard set error: {}", e))?;

    // 5. Simulate Ctrl+V
    simulate_paste().map_err(|e| format!("Paste simulation error: {}", e))?;

    // 6. Wait for paste to complete
    thread::sleep(Duration::from_millis(150));

    // 7. Restore original clipboard
    if let Some(old) = &old_content {
        let _ = clipboard.set_text(old.as_str());
    }

    Ok(translated)
}

async fn translate_via_google(text: &str, source_lang: &str, target_lang: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        source_lang,
        target_lang,
        urlencoding::encode(text)
    );

    let response = client
        .get(&url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if response.status().as_u16() == 429 {
        return Err("Rate limited".into());
    }

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    // Parse nested array response
    let sentences = body.get(0).ok_or("Invalid response")?;
    let mut result = String::new();
    for item in sentences.as_array().ok_or("Invalid response")? {
        if let Some(text) = item.get(0).and_then(|v| v.as_str()) {
            result.push_str(text);
        }
    }

    if result.is_empty() {
        return Err("Empty translation result".into());
    }

    Ok(result)
}
