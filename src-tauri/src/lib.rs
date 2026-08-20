mod commands;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Register Ctrl+Q global hotkey
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyQ);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = app_handle.emit("quick-translate", ());
                }
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::translate::translate_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
