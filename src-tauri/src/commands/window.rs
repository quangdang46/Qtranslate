use enigo::{Enigo, Mouse, Settings};
use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

/// Create the popup window at startup (hidden by default).
/// Borderless, small, always-on-top, skip taskbar.
pub fn create_popup_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _popup = WebviewWindowBuilder::new(
        app,
        "popup",
        WebviewUrl::App("/popup.html".into()),
    )
    .title("")
    .inner_size(320.0, 120.0)
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

/// Show the popup window near the cursor position.
#[tauri::command]
pub async fn show_popup(app: tauri::AppHandle) -> Result<(), String> {
    let (cursor_x, cursor_y) = get_cursor_position()?;

    if let Some(window) = app.get_webview_window("popup") {
        // Offset popup slightly below and to the right of cursor
        let offset_x = 15;
        let offset_y = 15;
        let popup_width = 320.0;
        let popup_height = 120.0;

        // Clamp to screen bounds (assume primary monitor is at 0,0 for now)
        let screen_width = 1920; // TODO: get actual monitor size
        let screen_height = 1080;

        let mut pos_x = cursor_x + offset_x;
        let mut pos_y = cursor_y + offset_y;

        // Clamp right edge
        if (pos_x as f64 + popup_width) > screen_width as f64 {
            pos_x = screen_width - popup_width as i32 - 10;
        }
        // Clamp bottom edge
        if (pos_y as f64 + popup_height) > screen_height as f64 {
            pos_y = screen_height - popup_height as i32 - 10;
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
        // window.set_focus() is intentionally NOT called here
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
