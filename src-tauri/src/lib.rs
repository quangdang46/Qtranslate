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

            // Register Alt+W global hotkey for replace
            let replace_shortcut = Shortcut::new(
                Some(Modifiers::ALT),
                Code::KeyW,
            );
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(replace_shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = app_handle.emit("replace-translate", ());
                }
            })?;

            // Setup system tray with context menu
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let menu = MenuBuilder::new(app)
                    .item(&MenuItemBuilder::new("Open QTranslate").id("open").build(app)?)
                    .separator()
                    .item(&MenuItemBuilder::new("Quick Translate (Ctrl+Q)").id("quick_translate").build(app)?)
                    .item(&MenuItemBuilder::new("Replace (Alt+W)").id("replace").build(app)?)
                    .separator()
                    .item(&MenuItemBuilder::new("Exit").id("quit").build(app)?)
                    .build()?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .tooltip("QTranslate")
                    .menu(&menu)
                    .on_menu_event(move |app, event| {
                        match event.id.as_ref() {
                            "open" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray_icon, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray_icon.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::translate::translate_text,
            commands::selection::get_selected_text,
            commands::clipboard::backup_clipboard,
            commands::clipboard::restore_clipboard,
            commands::input::paste_text,
            commands::input::replace_with_translation,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::window::show_popup,
            commands::window::hide_popup,
            commands::permissions::check_accessibility_permission,
            commands::permissions::show_accessibility_guide,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
