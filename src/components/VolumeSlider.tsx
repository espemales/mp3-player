import { useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';

export function VolumeSlider() {
  const [show, setShow] = useState(false);
  const [vol, setVol] = useState(audioEngine.getVolume());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVol(v);
    audioEngine.setVolume(v);
  };

  return (
    <div className="volume-wrap"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <button className="volume-btn" onClick={() => audioEngine.toggleMute()}>
        {vol === 0 ? '🔇' : vol < 0.5 ? '🔉' : '🔊'}
      </button>
      {show && (
        <div className="volume-popup">
          <input
            type="range" min="0" max="1" step="0.01"
            value={vol}
            onChange={handleChange}
            className="volume-slider"
          />
        </div>
      )}
    </div>
  );
}
