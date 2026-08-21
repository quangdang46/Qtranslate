use enigo::{Enigo, Mouse, Settings};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

/// Popup window size — always the full result card size. The popup is shown
/// at this fixed size; loading/error/success states all render inside it via
/// React. This avoids resize timing issues between Rust and WebView2.
const POPUP_WIDTH: f64 = 380.0;
const POPUP_HEIGHT: f64 = 170.0;

/// Create the popup window at startup (hidden by default).
/// Borderless, small, always-on-top, skip taskbar.
pub fn create_popup_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _popup = WebviewWindowBuilder::new(
        app,
        "popup",
        WebviewUrl::App("/popup.html".into()),
    )
    .title("")
    .inner_size(POPUP_WIDTH, POPUP_HEIGHT)
    .resizable(false)
    .decorations(false)      // No title bar
    .transparent(true)       // Allow CSS to handle background
    .always_on_top(true)
    .visible(false)
    .skip_taskbar(true)
    .build()?;

    Ok(())
}

/// Get current mouse cursor position using enigo.
fn get_cursor_position() -> Result<(i32, i32), String> {
    let enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Enigo error: {}", e))?;
    let (x, y) = enigo.location().map_err(|e| format!("Cursor location error: {}", e))?;
    Ok((x as i32, y as i32))
}

/// Position the popup at the current cursor position (clamped to the real
/// monitor bounds) and show it. Always uses the fixed POPUP_WIDTH/HEIGHT.
#[tauri::command]
pub async fn show_popup(app: tauri::AppHandle) -> Result<(), String> {
    let (cursor_x, cursor_y) = get_cursor_position()?;

    if let Some(window) = app.get_webview_window("popup") {
        // Offset popup slightly below and to the right of cursor
        let offset_x = 15;
        let offset_y = 15;

        // Clamp to the real monitor size (falls back to 1920x1080 if it
        // can't be determined, e.g. no monitor detected).
        let (screen_width, screen_height) = window
            .current_monitor()
            .ok()
            .flatten()
            .map(|m| (m.size().width as i32, m.size().height as i32))
            .unwrap_or((1920, 1080));

        let mut pos_x = cursor_x + offset_x;
        let mut pos_y = cursor_y + offset_y;

        // Clamp right edge
        if (pos_x as f64 + POPUP_WIDTH) > screen_width as f64 {
            pos_x = screen_width - POPUP_WIDTH as i32 - 10;
        }
        // Clamp bottom edge
        if (pos_y as f64 + POPUP_HEIGHT) > screen_height as f64 {
            pos_y = screen_height - POPUP_HEIGHT as i32 - 10;
        }
        // Clamp left edge
        if pos_x < 0 {
            pos_x = 10;
        }
        // Clamp top edge
        if pos_y < 0 {
            pos_y = 10;
        }

        let _ = window.set_position(PhysicalPosition::new(pos_x, pos_y));
        window.show().map_err(|e| e.to_string())?;
        // Don't steal focus from the source app
    }
    Ok(())
}

/// Hide the popup window.
///
/// On Windows, plain `window.hide()` on a `transparent(true)` WebView2
/// window is known to leave a "ghost" frame of the last rendered content
/// visible on screen until something else forces a repaint of that screen
/// region (a long-standing WebView2/DWM compositing bug, not something we
/// can fix from app code - see tauri-apps/tauri#14515, #14764, #14831).
/// The documented workaround is to move the window off-screen *before*
/// hiding it, so there's nothing left over that region for DWM to fail to
/// repaint.
#[tauri::command]
pub async fn hide_popup(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("popup") {
        let _ = window.set_position(PhysicalPosition::new(-10_000, -10_000));
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Create the dictionary window at startup (hidden by default).
/// Decorated, resizable, normal-sized — like a regular app window.
pub fn create_dictionary_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _window = WebviewWindowBuilder::new(
        app,
        "dictionary",
        WebviewUrl::App("/dictionary.html".into()),
    )
    .title("Dictionary — QTranslate")
    .inner_size(480.0, 520.0)
    .resizable(true)
    .decorations(true)
    .visible(false)
    .build()?;

    Ok(())
}

/// Show the dictionary window (create-on-demand fallback).
pub fn show_dictionary_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("dictionary") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Create the options window at startup (hidden by default).
/// Decorated, resizable, normal-sized.
pub fn create_options_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _window = WebviewWindowBuilder::new(
        app,
        "options",
        WebviewUrl::App("/options.html".into()),
    )
    .title("Options — QTranslate")
    .inner_size(520.0, 480.0)
    .resizable(true)
    .decorations(true)
    .visible(false)
    .build()?;

    Ok(())
}

/// Show the options window.
pub fn show_options_window(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("options") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
