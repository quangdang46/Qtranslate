mod commands;

use commands::selection::OperationGuard;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(OperationGuard::new())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Create popup window at startup (hidden)
            commands::window::create_popup_window(app)?;

            // Register Ctrl+Q global hotkey
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyQ);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = app_handle.emit("quick-translate", ());
                }
            })?;

            // Register Ctrl+Alt+W global hotkey for replace
            let replace_shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::ALT),
                Code::KeyW,
            );
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(replace_shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = app_handle.emit("replace-translate", ());
                }
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::translate::translate_text,
            commands::selection::get_selected_text,
            commands::clipboard::backup_clipboard,
            commands::clipboard::restore_clipboard,
            commands::input::paste_text,
            commands::input::replace_with_translation,
            commands::window::show_popup,
            commands::window::hide_popup,
            commands::permissions::check_accessibility_permission,
            commands::permissions::show_accessibility_guide,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
