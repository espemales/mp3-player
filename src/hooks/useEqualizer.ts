import { useState, useCallback } from 'react';
import { EQ_PRESETS } from '../types';
import { audioEngine } from '../audio/AudioEngine';

const presetNames = Object.keys(EQ_PRESETS);

export function useEqualizer() {
  const [currentPreset, setCurrentPreset] = useState('Flat');
  const [bands, setBands] = useState<number[]>([...EQ_PRESETS['Flat']]);

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

  return { bands, currentPreset, presetNames, applyPreset, setBand };
}
