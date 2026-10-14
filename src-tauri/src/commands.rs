use crate::file_watcher::{self, WatcherMap};
use crate::track_eq;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

// Global watcher state
pub struct Watchers(pub WatcherMap);

impl Default for Watchers {
    fn default() -> Self {
        Watchers(Arc::new(Mutex::new(HashMap::new())))
    }
}

// -- Folder Scanning --

#[tauri::command]
pub fn scan_folder(folder: String) -> file_watcher::ScanResult {
    file_watcher::scan_folder(&folder)
}

#[tauri::command]
pub fn start_watching(
    path: String,
    app: tauri::AppHandle,
    watchers: tauri::State<'_, Watchers>,
) -> Result<(), String> {
    file_watcher::start_watching_impl(path, &watchers.0, app)
}

#[tauri::command]
pub fn stop_watching(path: String, watchers: tauri::State<'_, Watchers>) -> Result<(), String> {
    file_watcher::stop_watching_impl(&path, &watchers.0)
}

// -- Track EQ --

#[tauri::command]
pub fn get_track_eq() -> track_eq::TrackEqMap {
    track_eq::read_track_eq()
}

#[tauri::command]
pub fn save_track_eq(entry: track_eq::TrackEqEntry, track_path: String) -> Result<(), String> {
    let mut map = track_eq::read_track_eq();
    map.insert(track_path, entry);
    track_eq::write_track_eq(&map).map_err(|e| e.to_string())
}

// -- Custom EQ Presets --

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomPresetMap(pub HashMap<String, Vec<f64>>);

#[tauri::command]
pub fn get_custom_presets() -> CustomPresetMap {
    let path = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("mp3-player")
        .join("eq-presets.json");
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(map) = serde_json::from_str(&content) {
                return CustomPresetMap(map);
            }
        }
    }
    CustomPresetMap(HashMap::new())
}

#[tauri::command]
pub fn save_custom_preset(name: String, values: Vec<f64>) -> Result<(), String> {
    let mut map = get_custom_presets().0;
    map.insert(name, values);
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("mp3-player");
    let _ = fs::create_dir_all(&dir);
    let path = dir.join("eq-presets.json");
    let content = serde_json::to_string_pretty(&map).unwrap();
    fs::write(path, content).map_err(|e| e.to_string())
}
