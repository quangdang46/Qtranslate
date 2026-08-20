use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Create the popup window at startup (hidden by default).
/// This window will be reused for each Ctrl+Q trigger.
pub fn create_popup_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _popup = WebviewWindowBuilder::new(
        app,
        "popup",
        WebviewUrl::App("/popup.html".into()),
    )
    .title("QTranslate Popup")
    .inner_size(350.0, 150.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .visible(false)
    .skip_taskbar(true)
    .build()?;

    Ok(())
}

/// Show the popup window.
#[tauri::command]
pub async fn show_popup(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("popup") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the popup window.
#[tauri::command]
pub async fn hide_popup(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("popup") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
