use arboard::Clipboard;

/// Backup current clipboard content.
#[tauri::command]
pub async fn backup_clipboard() -> Result<Option<String>, String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    let content = clipboard.get_text().ok().map(|s| s.to_string());
    Ok(content)
}

/// Restore clipboard content from backup.
#[tauri::command]
pub async fn restore_clipboard(content: Option<String>) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;

    if let Some(text) = content {
        clipboard
            .set_text(&text)
            .map_err(|e| format!("Clipboard set error: {}", e))?;
    }
    Ok(())
}
