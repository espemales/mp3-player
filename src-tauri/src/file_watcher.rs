use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use walkdir::WalkDir;

const AUDIO_EXTENSIONS: [&str; 5] = ["mp3", "flac", "wav", "m4a", "ogg"];

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub files: Vec<String>,
}

pub fn scan_folder(folder: &str) -> ScanResult {
    let folder_path = Path::new(folder);
    let mut files = Vec::new();

    if folder_path.is_dir() {
        for entry in WalkDir::new(folder_path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if AUDIO_EXTENSIONS.contains(&ext.to_str().unwrap_or("").to_lowercase().as_str()) {
                        if let Some(p) = path.to_str() {
                            files.push(p.to_string());
                        }
                    }
                }
            }
        }
    }

    ScanResult { files }
}

// Per-watcher state: receiver is stored so the watcher thread can send to it
#[allow(dead_code)]
pub struct WatcherState {
    pub watcher: Option<RecommendedWatcher>,
    pub watch_path: String,
}

pub type WatcherMap = Arc<Mutex<HashMap<String, WatcherState>>>;

pub fn start_watching_impl(
    path: String,
    watchers: &WatcherMap,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let path_clone = path.clone();
    let app = app_handle.clone();
    let watchers_clone = watchers.clone();

    // Check if already watching this path
    {
        let guard = watchers_clone.lock().unwrap();
        if guard.contains_key(&path) {
            return Err("Already watching this folder".to_string());
        }
    }

    // Create watcher
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                match event.kind {
                    EventKind::Create(_) | EventKind::Modify(_) => {
                        for p in &event.paths {
                            if let Some(ext) = p.extension() {
                                let ext_str = ext.to_str().unwrap_or("").to_lowercase();
                                if AUDIO_EXTENSIONS.contains(&ext_str.as_str()) {
                                    if let Some(path_str) = p.to_str() {
                                        let _ = app.emit("folder-file-added", path_str);
                                    }
                                }
                            }
                        }
                    }
                    EventKind::Remove(_) => {
                        for p in &event.paths {
                            if let Some(path_str) = p.to_str() {
                                let _ = app.emit("folder-file-removed", path_str);
                            }
                        }
                    }
                    _ => {}
                }
            }
        },
        Config::default(),
    ).map_err(|e| e.to_string())?;

    // Start watching
    watcher.watch(Path::new(&path_clone), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store the watcher
    let state = WatcherState {
        watcher: Some(watcher),
        watch_path: path.clone(),
    };

    let mut guard = watchers_clone.lock().unwrap();
    guard.insert(path.clone(), state);

    Ok(())
}

pub fn stop_watching_impl(path: &str, watchers: &WatcherMap) -> Result<(), String> {
    let mut guard = watchers.lock().unwrap();
    guard.remove(path);
    Ok(())
}
