import { UsePlaylist } from '../hooks/usePlaylist';

interface MiniPlayerProps {
  playlist: UsePlaylist;
}

export function MiniPlayer({ playlist }: MiniPlayerProps) {
  const { currentTrack, isPlaying, play, pause, next, prev } = playlist;

  return (
    <div style={{ padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <div style={{ marginBottom: '8px' }}>
        {currentTrack?.name || 'No track'}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={prev}>Prev</button>
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={next}>Next</button>
      </div>
    </div>
  );
}
