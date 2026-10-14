import { usePlaylist } from './hooks/usePlaylist';
import { useConfig } from './hooks/useConfig';
import { MiniPlayer } from './components/MiniPlayer';
import { audioEngine } from './audio/AudioEngine';
import './styles/player.css';
import { useEffect } from 'react';

function App() {
  const playlist = usePlaylist();
  const { config, saveConfig } = useConfig();

  useEffect(() => {
    if (config.volume !== undefined) {
      audioEngine.setVolume(config.volume);
    }
  }, [config.volume]);

  return (
    <div>
      <MiniPlayer
        playlist={playlist}
        onVolumeChange={(vol) => saveConfig({ volume: vol })}
      />
    </div>
  );
}

export default App;
