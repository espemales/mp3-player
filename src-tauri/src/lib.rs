mod config;
use config::{read_config, write_config, Config};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

#[tauri::command]
fn get_config() -> Config {
    read_config()
}

#[tauri::command]
fn save_config(config: Config) -> Result<(), String> {
    write_config(&config).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting MP3 Player");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let play_pause_item = MenuItem::with_id(app, "play-pause", "Play/Pause", true, None::<&str>)?;
            let next_item = MenuItem::with_id(app, "next", "Next Track", true, None::<&str>)?;
            let prev_item = MenuItem::with_id(app, "prev", "Previous Track", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let show_item = MenuItem::with_id(app, "show", "Open Player", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &play_pause_item,
                    &next_item,
                    &prev_item,
                    &separator,
                    &show_item,
                    &quit_item,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let window = app.get_webview_window("main");
                    match event.id.as_ref() {
                        "play-pause" => {
                            if let Some(w) = window {
                                let _ = w.emit("tray-play-pause", ());
                            }
                        }
                        "next" => {
                            if let Some(w) = window {
                                let _ = w.emit("tray-next", ());
                            }
                        }
                        "prev" => {
                            if let Some(w) = window {
                                let _ = w.emit("tray-prev", ());
                            }
                        }
                        "show" => {
                            if let Some(w) = window {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Handle window close -> hide to tray instead of exiting
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_config, save_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
