import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EQ_PRESETS } from '../types';
import { audioEngine } from '../audio/AudioEngine';

const presetNames = Object.keys(EQ_PRESETS);

export function useEqualizer() {
  const [currentPreset, setCurrentPreset] = useState('Flat');
  const [bands, setBands] = useState<number[]>([...EQ_PRESETS['Flat']]);
  const [customPresets, setCustomPresets] = useState<Record<string, number[]>>({});

  // Load custom presets on mount
  useEffect(() => {
    invoke<{ 0: Record<string, number[]> }>('get_custom_presets')
      .then(m => setCustomPresets(m[0] || m))
      .catch(() => {});
  }, []);

  const applyPreset = useCallback((name: string, values: number[]) => {
    setCurrentPreset(name);
    setBands([...values]);
    audioEngine.eq.applyPreset(values);
  }, []);

  const setBand = useCallback((band: number, gain: number) => {
    const newBands = [...bands];
    newBands[band] = gain;
    setBands(newBands);
    audioEngine.eq.setBand(band, gain);
    setCurrentPreset('Custom');
  }, [bands]);

  const loadTrackEq = useCallback(async (trackPath: string) => {
    try {
      const map = await invoke<Record<string, { preset: string; values: number[] }>>('get_track_eq');
      const entry = map[trackPath];
      if (entry && entry.values) {
        setCurrentPreset('Custom');
        setBands(entry.values);
        audioEngine.eq.applyPreset(entry.values);
        return true;
      }
    } catch {}
    return false;
  }, []);

  const saveTrackEq = useCallback(async (trackPath: string, values: number[]) => {
    try {
      await invoke('save_track_eq', {
        trackPath,
        entry: { preset: 'Custom', values },
      });
    } catch (e) {
      console.error('Failed to save track EQ:', e);
    }
  }, []);

  const saveCustomPreset = useCallback(async (name: string, values: number[]) => {
    try {
      await invoke('save_custom_preset', { name, values });
      setCustomPresets(prev => ({ ...prev, [name]: values }));
    } catch (e) {
      console.error('Failed to save custom preset:', e);
    }
  }, []);

  return { bands, currentPreset, presetNames, applyPreset, setBand, loadTrackEq, saveTrackEq, saveCustomPreset, customPresets };
}
