mod commands;
mod config;
mod file_watcher;
mod track_eq;
use commands::Watchers;
use config::{read_config, write_config, Config as AppConfig};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, WindowEvent,
};

#[tauri::command]
fn get_config() -> AppConfig {
    read_config()
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    write_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config_partial(partial: serde_json::Value) -> Result<(), String> {
    let mut cfg = read_config();
    if let Some(v) = partial.get("musicFolders").and_then(|v| v.as_array()) {
        cfg.music_folders = v.iter().filter_map(|s| s.as_str().map(String::from)).collect();
    }
    if let Some(v) = partial.get("volume").and_then(|v| v.as_f64()) {
        cfg.volume = v;
    }
    if let Some(v) = partial.get("currentPreset").and_then(|v| v.as_str()) {
        cfg.current_preset = v.to_string();
    }
    if let Some(v) = partial.get("lastTrack") {
        cfg.last_track = if v.is_null() { None } else { v.as_str().map(String::from) };
    }
    // windowPosition intentionally not merged
    write_config(&cfg).map_err(|e| e.to_string())
}

struct Debouncer {
    last_write: Mutex<Instant>,
    pending: Mutex<Option<(i32, i32)>>,
}

impl Debouncer {
    fn new() -> Self {
        Debouncer {
            last_write: Mutex::new(Instant::now() - Duration::from_secs(1)),
            pending: Mutex::new(None),
        }
    }

    /// Record a new position. Writes immediately if 500ms has passed since last write,
    /// otherwise queues it for the next call.
    fn record(&self, x: i32, y: i32) {
        let now = Instant::now();
        let elapsed = now.duration_since(*self.last_write.lock().unwrap());
        let mut pending = self.pending.lock().unwrap();
        if elapsed >= Duration::from_millis(500) {
            let _ = pending;
            self.do_write(x, y);
        } else {
            *pending = Some((x, y));
        }
    }

    /// Call on window close to flush any pending position.
    fn flush(&self) {
        let pending = self.pending.lock().unwrap().take();
        if let Some((x, y)) = pending {
            let _ = pending;
            self.do_write(x, y);
        }
    }

    fn do_write(&self, x: i32, y: i32) {
        *self.last_write.lock().unwrap() = Instant::now();
        let mut cfg = read_config();
        cfg.window_position.x = x as f64;
        cfg.window_position.y = y as f64;
        let _ = write_config(&cfg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting MP3 Player");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Initialize watchers state
            let watchers = Watchers::default();
            app.manage(watchers);

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

            // Restore window position from config
            let cfg = read_config();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_position(PhysicalPosition {
                    x: cfg.window_position.x as i32,
                    y: cfg.window_position.y as i32,
                });
            }

            // Handle window close -> hide to tray instead of exiting
            // and debounced position save
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                let debouncer = Debouncer::new();
                let debouncer2 = Debouncer::new();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                        debouncer2.flush();
                    }
                    if let WindowEvent::Moved(pos) = event {
                        debouncer.record(pos.x, pos.y);
                    }
                });
                // flush any pending position when the user releases the mouse
                // (the window may not fire Moved on release, so we flush on close too)
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config, save_config, save_config_partial,
            commands::get_track_eq,
            commands::save_track_eq,
            commands::get_custom_presets,
            commands::save_custom_preset,
            commands::scan_folder,
            commands::start_watching,
            commands::stop_watching
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
