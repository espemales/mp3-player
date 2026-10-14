import { getCurrentWindow } from '@tauri-apps/api/window';
import { useRef, useEffect, useState } from 'react';
import { UsePlaylist } from '../hooks/usePlaylist';
import { VolumeSlider } from './VolumeSlider';

interface MiniPlayerProps {
  playlist: UsePlaylist;
}

export function MiniPlayer({ playlist }: MiniPlayerProps) {
  const { currentTrack, isPlaying, play, pause, next, prev } = playlist;
  const titleRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [progress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if (titleRef.current && containerRef.current) {
        const titleWidth = titleRef.current.scrollWidth;
        const containerWidth = containerRef.current.offsetWidth;
        setIsOverflowing(titleWidth > containerWidth);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDragStart = () => {
    getCurrentWindow().startDragging();
  };

  const handleClose = () => {
    getCurrentWindow().hide();
  };

  return (
    <div className="mini-player" ref={containerRef}>
      <div className="drag-handle" onMouseDown={handleDragStart}>
        ⋮⋮
      </div>
      <div className={`track-title ${isOverflowing ? 'overflow' : ''}`}>
        <span ref={titleRef}>
          {currentTrack?.name || 'No track'}
        </span>
      </div>
      <button onClick={prev} title="Previous">⏮</button>
      <VolumeSlider />
      <button onClick={isPlaying ? pause : play} title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={next} title="Next">⏭</button>
      <button onClick={handleClose} title="Hide to tray">✕</button>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
