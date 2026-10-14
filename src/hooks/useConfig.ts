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

  const saveConfig = useCallback(async (newConfig: Partial<Config>) => {
    const updated = { ...config, ...newConfig };
    try {
      await invoke('save_config', { config: updated });
      setConfig(updated);
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }, [config]);

  return { config, saveConfig };
}
