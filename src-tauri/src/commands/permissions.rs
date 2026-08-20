/// Check macOS Accessibility permission.
///
/// On macOS, the app needs Accessibility permission to simulate keypresses.
/// Without it, all key simulation commands fail silently.
///
/// On Windows, this always returns true (no special permission needed).
#[tauri::command]
pub async fn check_accessibility_permission() -> Result<bool, String> {
    // On Windows, no special permission needed
    Ok(true)
}

/// Show guidance for enabling Accessibility permission on macOS.
#[tauri::command]
pub async fn show_accessibility_guide() -> Result<(), String> {
    // No-op on Windows; will be implemented for macOS later
    Ok(())
}
