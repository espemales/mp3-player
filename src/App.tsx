import { usePlaylist } from './hooks/usePlaylist';
import { MiniPlayer } from './components/MiniPlayer';
import './styles/player.css';

function App() {
  const playlist = usePlaylist();

  return (
    <div>
      <MiniPlayer playlist={playlist} />
    </div>
  );
}

export default App;
