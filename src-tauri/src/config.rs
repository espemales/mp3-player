use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    #[serde(rename = "musicFolders")]
    pub music_folders: Vec<String>,
    pub volume: f64,
    #[serde(rename = "currentPreset")]
    pub current_preset: String,
    #[serde(rename = "lastTrack")]
    pub last_track: Option<String>,
    #[serde(rename = "windowPosition")]
    pub window_position: WindowPosition,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowPosition {
    pub x: f64,
    pub y: f64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            music_folders: vec![],
            volume: 0.8,
            current_preset: "Flat".to_string(),
            last_track: None,
            window_position: WindowPosition { x: 100.0, y: 100.0 },
        }
    }
}

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

fn config_path() -> PathBuf {
    get_config_dir().join("config.json")
}

pub fn read_config() -> Config {
    let path = config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    Config::default()
}

pub fn write_config(config: &Config) -> std::io::Result<()> {
    let dir = ensure_config_dir()?;
    let path = dir.join("config.json");
    let content = serde_json::to_string_pretty(config).unwrap();
    fs::write(path, content)
}
