# MP3 Player — Design Specification

**Date:** 2024-10-14
**Platform:** Tauri 2.x + React + TypeScript + Web Audio API

---

## 1. Overview

A lightweight background MP3 player that runs as a single .exe (~20MB) via Tauri. It lives in the system tray with a minimal floating mini-player overlay. Includes built-in EQ presets plus per-song custom EQ saved to disk.

**Success criteria:**
- Single-file executable, no installer required
- Mini-player: 64px height, 400px wide, frameless, always-on-top
- Background playback continues when mini-player is hidden
- EQ presets apply in real-time with no audio glitches
- Per-song EQ overrides persist across restarts

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Tauri 2.x |
| Frontend | React 18 + TypeScript |
| Bundler | Vite |
| Styling | CSS Modules or plain CSS |
| Audio | Web Audio API (BiquadFilterNode) |
| Persistence | JSON files via Tauri fs API |
| File watching | notify-rs (Rust) |
| Config store | tauri-plugin-store |

**Output:** Single `.exe` via `tauri build`. No installer.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Rust Backend (Tauri)                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ FileWatcher  │  │ ConfigStore  │  │ Tray/Menu        │ │
│  │ (notify-rs)  │  │ (JSON)       │  │ (tauri-plugin)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Tauri Commands (IPC)
┌──────────────────────────▼──────────────────────────────────┐
│  Frontend (WebView2)                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │ AudioEngine│  │ Equalizer  │  │ TrayController     │    │
│  │ (<audio>)  │──│ (8-band)   │──│ (show/hide)       │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Audio signal chain:**
```
<audio> → MediaElementSource → BiquadFilter×8 → GainNode → Destination
```

---

## 4. EQ Bands

**8 bands (Hz):** 60, 170, 350, 1000, 3500, 7000, 12000, 16000

**Gain range:** -12dB to +12dB per band

### Built-in Presets

| Name | 60 | 170 | 350 | 1000 | 3500 | 7000 | 12000 | 16000 |
|------|-----|-----|-----|------|------|------|-------|-------|
| Flat | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Bass Boost | 6 | 4 | 2 | 0 | 0 | 0 | 0 | 0 |
| Treble Boost | 0 | 0 | 0 | 0 | 2 | 4 | 6 | 6 |
| Rock | 4 | 3 | 1 | -1 | -1 | 2 | 3 | 4 |
| Electronic | 5 | 4 | 1 | 0 | 2 | 3 | 3 | 2 |
| Classical | 2 | 1 | 0 | -1 | 0 | 1 | 2 | 2 |
| Podcast | 3 | 4 | 3 | 2 | 1 | 0 | 0 | 0 |
| Loudness | 4 | 3 | 1 | 0 | 0 | 0 | 1 | 2 |

---

## 5. Data Persistence

All files stored in the app data directory (`%APPDATA%/mp3-player/` on Windows).

### config.json — Global Settings
```json
{
  "musicFolders": ["C:/Users/apple/Music"],
  "volume": 0.8,
  "currentPreset": "Rock",
  "lastTrack": "C:/Users/apple/Music/test.mp3",
  "windowPosition": { "x": 100, "y": 100 }
}
```

### eq-presets.json — User Custom Presets
```json
{
  "my-custom-1": [2, 3, -1, 0, 1, 4, 3, 2],
  "song-specific": [5, 3, 0, -2, 0, 1, 2, 3]
}
```

### track-eq.json — Per-Track Overrides
```json
{
  "C:/Users/apple/Music/Song.mp3": {
    "preset": "custom",
    "values": [5, 3, 0, -2, 0, 1, 2, 3]
  }
}
```

---

## 6. UI Design

### Mini-Player Window
```
┌────────────────────────────────────────────────────────────┐
│ [≡]  Song Title That Might Scroll...  [EQ] [🔊] [▶/⏸] [✕] │
└────────────────────────────────────────────────────────────┘
  64px height × 400px width
  Frameless, transparent background, rounded corners
  Always-on-top
```

| Element | Behavior |
|---------|----------|
| Drag handle `[≡]` | Drag to reposition window anywhere on screen |
| Track title | Marquee scroll if text exceeds width |
| `[EQ]` button | Opens EQ preset popover below button |
| `[🔊]` icon | Click to mute/unmute. Hover shows vertical volume slider |
| `[▶/⏸]` button | Toggle playback |
| `[✕]` button | Hide mini-player to tray (playback continues) |

**System tray icon:**
- Right-click menu: Play/Pause, Next Track, Previous Track, Open Player, Quit

### EQ Preset Popover
```
┌─────────────────────────────────────────┐
│ EQ Presets                             │
│ ○ Flat                                 │
│ ● Bass Boost  ← active                 │
│ ○ Rock                                │
│ ○ Electronic                          │
│ ○ Podcast                             │
│ ─────────────────────────────────────  │
│ Custom: [▁▂▅▇▅▃▂▁]  [Save to Track]  │
│ (Per-track override shown if set)      │
└─────────────────────────────────────────┘
```

- Clicking a preset applies it immediately
- "Save to Track" saves current EQ values to `track-eq.json` keyed by the current track path
- Clicking outside closes the popover

### Volume Control
- Appears on hover over 🔊 icon
- Vertical slider (0–100%)
- Click 🔊 to toggle mute (remembers last volume level)

---

## 7. File Structure

```
C:/Users/apple/Documents/mp3-player/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component
│   ├── components/
│   │   ├── MiniPlayer.tsx         # Main mini-player
│   │   ├── EqualizerPopover.tsx   # EQ preset selector
│   │   └── VolumeSlider.tsx       # Volume control
│   ├── audio/
│   │   ├── AudioEngine.ts    # Playback via <audio> element
│   │   └── Equalizer.ts      # Web Audio API EQ chain
│   ├── hooks/
│   │   ├── useConfig.ts      # Global config state + Tauri IPC
│   │   ├── usePlaylist.ts    # Track list + playback queue
│   │   └── useEqualizer.ts   # EQ state + presets
│   ├── styles/
│   │   └── player.css
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri entry + tray setup
│   │   ├── commands.rs       # IPC command handlers
│   │   ├── file_watcher.rs  # Folder watching (notify-rs)
│   │   └── config.rs        # JSON file I/O
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── SPEC.md                   # This file
└── README.md
```

---

## 8. Tauri IPC Commands

| Command | Direction | Purpose |
|---------|----------|---------|
| `get_config` | Frontend → Rust | Load config.json |
| `save_config` | Frontend → Rust | Write config.json |
| `get_track_eq` | Frontend → Rust | Load track-eq.json |
| `save_track_eq` | Frontend → Rust | Write track-eq.json |
| `get_eq_presets` | Frontend → Rust | Load eq-presets.json |
| `save_eq_presets` | Frontend → Rust | Write eq-presets.json |
| `scan_folder` | Frontend → Rust | Recursively find MP3s in folder |
| `start_watching` | Frontend → Rust | Begin watching folder for changes |
| `show_player` | Rust → Frontend | Tray icon click → show window |

---

## 9. Drag & Drop

- Accept MP3 files and folder drops on the mini-player window
- Files → add to current playlist
- Folders → scan recursively for MP3s, add to playlist
- Supported formats: `.mp3`, `.flac`, `.wav`, `.m4a`, `.ogg`

---

## 10. Error Handling

| Scenario | Behavior |
|----------|----------|
| File not found / corrupted | Skip to next track, brief tray notification |
| Folder deleted | Remove from config, notify user |
| EQ value out of range | Clamp to ±12dB silently |
| Audio decode error | Log error, skip track |
| Tray icon click | Toggle mini-player visibility |
| Mini-player close button | Hide window to tray (keep playing) |
| Quit from tray menu | Stop playback, exit app |

---

## 11. Out of Scope (v1)

- Streaming from URLs / internet radio
- Album art fetching
- Lyrics display
- Playlist management / saving playlists
- Sleep timer
- Keyboard shortcuts (global hotkeys)
- Multiple audio outputs (selecting device)
- Crossfade / gapless playback

---

## 12. Implementation Order

1. **Scaffold** — Tauri + React + Vite setup, empty shell builds to .exe
2. **Tray** — System tray icon + right-click menu (show/hide, controls, quit)
3. **Audio engine** — Basic <audio> playback: play, pause, next, prev
4. **Mini-player UI** — Frameless window, draggable, all controls
5. **Volume control** — Mute/unmute, slider
6. **EQ core** — 8-band Web Audio API chain, built-in presets
7. **EQ popover** — Preset selection UI, real-time application
8. **Config persistence** — Load/save config.json via Tauri commands
9. **Track EQ persistence** — Per-song overrides in track-eq.json
10. **Folder watching** — notify-rs, auto-load MP3s on startup
11. **Drag & drop** — File/folder drop onto mini-player
12. **Polish** — Marquee text, hover states, window position memory
