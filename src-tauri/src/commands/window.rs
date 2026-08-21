use enigo::{Enigo, Mouse, Settings};
use tauri::{Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

/// Popup window dimensions, kept as named constants so `create_popup_window`
/// (actual initial window size) and the clamping math below can never drift
/// apart. Two sizes: a tiny pill shown immediately while translating (see
/// popup-loading-pill in QuickTranslatePopup.tsx), and the full result card
/// shown once translation completes. Sized to fit the title bar + body +
/// provider row.
const LOADING_WIDTH: f64 = 100.0;
const LOADING_HEIGHT: f64 = 32.0;
const RESULT_WIDTH: f64 = 380.0;
const RESULT_HEIGHT: f64 = 170.0;

/// Create the popup window at startup (hidden by default).
/// Borderless, small, always-on-top, skip taskbar.
pub fn create_popup_window(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let _popup = WebviewWindowBuilder::new(
        app,
        "popup",
        WebviewUrl::App("/popup.html".into()),
    )
    .title("")
    .inner_size(LOADING_WIDTH, LOADING_HEIGHT)
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

/// Resize + reposition the popup at the current cursor position (clamped to
/// the real monitor bounds) and show it. Shared by both the compact loading
/// pill and the full result card - only the target size differs.
fn position_and_show(app: &tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    let (cursor_x, cursor_y) = get_cursor_position()?;

    if let Some(window) = app.get_webview_window("popup") {
        window
            .set_size(PhysicalSize::new(width as u32, height as u32))
            .map_err(|e| e.to_string())?;

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
        if (pos_x as f64 + width) > screen_width as f64 {
            pos_x = screen_width - width as i32 - 10;
        }
        // Clamp bottom edge
        if (pos_y as f64 + height) > screen_height as f64 {
            pos_y = screen_height - height as i32 - 10;
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

/// Show the compact loading pill at the cursor position, immediately after
/// the hotkey fires - before selection capture / translation even starts.
#[tauri::command]
pub async fn show_popup_loading(app: tauri::AppHandle) -> Result<(), String> {
    position_and_show(&app, LOADING_WIDTH, LOADING_HEIGHT)
}

/// Grow/reposition the popup into the full result card once translation has
/// finished (success or error) and reveal it.
#[tauri::command]
pub async fn show_popup_result(app: tauri::AppHandle) -> Result<(), String> {
    position_and_show(&app, RESULT_WIDTH, RESULT_HEIGHT)
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
