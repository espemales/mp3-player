import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Config {
  musicFolders: string[];
  volume: number;
  currentPreset: string;
  lastTrack: string | null;
  windowPosition: { x: number; y: number };
}

const defaultConfig: Config = {
  musicFolders: [],
  volume: 0.8,
  currentPreset: 'Flat',
  lastTrack: null,
  windowPosition: { x: 100, y: 100 },
};

export function useConfig() {
  const [config, setConfig] = useState<Config>(defaultConfig);

  useEffect(() => {
    invoke<Config>('get_config')
      .then(setConfig)
      .catch(() => setConfig(defaultConfig));
  }, []);

  // Only sends changed fields to avoid overwriting windowPosition
  const saveConfig = useCallback(async (newConfig: Partial<Config>) => {
    // Merge locally for React state
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    // Send only the fields that changed (not windowPosition)
    const partial: Partial<Config> = {};
    for (const key of Object.keys(newConfig) as Array<keyof Config>) {
      if (key !== 'windowPosition') {
        (partial as Record<string, unknown>)[key] = newConfig[key];
      }
    }
    try {
      // Rust-side merge: reads disk config, applies partial, writes back
      await invoke('save_config_partial', { partial });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }, [config]);

  return { config, saveConfig };
}
