use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackEqEntry {
    pub preset: String,
    pub values: Vec<f64>,
}

pub type TrackEqMap = HashMap<String, TrackEqEntry>;

fn get_config_dir() -> PathBuf {
    let app_data = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    app_data.join("mp3-player")
}

fn ensure_config_dir() -> std::io::Result<PathBuf> {
    let dir = get_config_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

pub fn read_track_eq() -> TrackEqMap {
    let path = get_config_dir().join("track-eq.json");
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(map) = serde_json::from_str(&content) {
                return map;
            }
        }
    }
    TrackEqMap::new()
}

pub fn write_track_eq(map: &TrackEqMap) -> std::io::Result<()> {
    let dir = ensure_config_dir()?;
    let path = dir.join("track-eq.json");
    let content = serde_json::to_string_pretty(map).unwrap();
    fs::write(path, content)
}
