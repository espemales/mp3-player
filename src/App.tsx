import { usePlaylist } from './hooks/usePlaylist';
import { MiniPlayer } from './components/MiniPlayer';

function App() {
  const playlist = usePlaylist();

  return (
    <div>
      <MiniPlayer playlist={playlist} />
    </div>
  );
}

export default App;
