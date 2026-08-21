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

            // Create dictionary window at startup (hidden)
            commands::window::create_dictionary_window(app)?;

            // Create options window at startup (hidden)
            commands::window::create_options_window(app)?;

            // Register Ctrl+Q global hotkey
            // TEMP: Ctrl+Q occupied by ShareX on this machine, using Ctrl+Shift+Q
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ);
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                eprintln!("Ctrl+Q hotkey triggered, state: {:?}", event.state);
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    eprintln!("Emitting quick-translate event");
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
                eprintln!("Ctrl+Alt+W hotkey triggered, state: {:?}", event.state);
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    eprintln!("Emitting replace-translate event");
                    let _ = app_handle.emit("replace-translate", ());
                }
            })?;

            // Register Ctrl+Shift+D global hotkey for dictionary
            let dict_shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::KeyD,
            );
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(dict_shortcut, move |_app, _shortcut, event| {
                eprintln!("Ctrl+Shift+Q hotkey triggered, state: {:?}", event.state);
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    // Capture selected text and show dictionary with it
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        // Release stray modifiers so Ctrl+C works
                        use enigo::{Direction, Enigo, Key, Keyboard, Settings};
                        use std::thread;
                        use std::time::Duration;
                        if let Ok(mut enigo) = Enigo::new(&Settings::default()) {
                            let _ = enigo.key(Key::Alt, Direction::Release);
                            let _ = enigo.key(Key::Shift, Direction::Release);
                            let _ = enigo.key(Key::Meta, Direction::Release);
                            thread::sleep(Duration::from_millis(30));
                            // Simulate Ctrl+C
                            let _ = enigo.key(Key::Control, Direction::Press);
                            let _ = enigo.key(Key::Unicode('c'), Direction::Click);
                            let _ = enigo.key(Key::Control, Direction::Release);
                        }

                        // Small delay for clipboard to update
                        thread::sleep(Duration::from_millis(100));

                        // Read clipboard
                        let selected = if let Ok(mut cb) = arboard::Clipboard::new() {
                            cb.get_text().ok().map(|s| s.to_string()).unwrap_or_default()
                        } else {
                            String::new()
                        };

                        let _ = handle.emit("show-dictionary", selected);
                    });
                }
            })?;

            // Setup system tray with context menu
            #[cfg(desktop)]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let menu = MenuBuilder::new(app)
                    .item(&MenuItemBuilder::new("Open QTranslate").id("open").build(app)?)
                    .separator()
                    .item(&MenuItemBuilder::new("Quick Translate (Ctrl+Shift+Q) [TEMP]").id("quick_translate").build(app)?)
                    .item(&MenuItemBuilder::new("Replace (Ctrl+Alt+W)").id("replace").build(app)?)
                    .item(&MenuItemBuilder::new("Dictionary (Ctrl+Shift+D)").id("dictionary").build(app)?)
                    .separator()
                    .item(&MenuItemBuilder::new("Options").id("options").build(app)?)
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
                            "quick_translate" => {
                                let _ = app.emit("quick-translate", ());
                            }
                            "replace" => {
                                let _ = app.emit("replace-translate", ());
                            }
                            "dictionary" => {
                                let _ = commands::window::show_dictionary_window(app);
                            }
                            "options" => {
                                let _ = commands::window::show_options_window(app);
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
            commands::dictionary::lookup_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
