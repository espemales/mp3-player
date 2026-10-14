import { useEffect, useRef, useState } from 'react';
import { useEqualizer } from '../hooks/useEqualizer';
import { EQ_PRESETS } from '../types';

interface Props {
  currentTrackPath: string | null;
  onClose: () => void;
}

export function EqualizerPopover({ currentTrackPath, onClose }: Props) {
  const { bands, currentPreset, presetNames, applyPreset, saveTrackEq } = useEqualizer();
  const ref = useRef<HTMLDivElement>(null);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    if (!currentTrackPath) return;
    const stored = localStorage.getItem(`eq:${currentTrackPath}`);
    setHasCustom(!!stored);
  }, [currentTrackPath]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSaveToTrack = async () => {
    if (!currentTrackPath) return;
    await saveTrackEq(currentTrackPath, bands);
    setHasCustom(true);
  };

  return (
    <div ref={ref} className="eq-popover">
      <div className="eq-popover-title">EQ Presets</div>
      {presetNames.map(name => (
        <div
          key={name}
          className={`eq-preset-item ${currentPreset === name ? 'active' : ''}`}
          onClick={() => applyPreset(name, EQ_PRESETS[name])}
        >
          {name === currentPreset ? '●' : '○'} {name}
        </div>
      ))}
      {currentTrackPath && (
        <>
          <div className="eq-popover-divider" />
          <div className="eq-preset-item" onClick={handleSaveToTrack}>
            Save to Track {hasCustom ? '(overwritten)' : ''}
          </div>
          {hasCustom && (
            <div className="eq-popover-hint">Custom EQ saved for this track</div>
          )}
        </>
      )}
    </div>
  );
}
