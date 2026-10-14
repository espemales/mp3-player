import { getCurrentWindow } from '@tauri-apps/api/window';
import { useRef, useEffect, useState } from 'react';
import { UsePlaylist } from '../hooks/usePlaylist';
import { VolumeSlider } from './VolumeSlider';
import { EqualizerPopover } from './EqualizerPopover';

interface MiniPlayerProps {
  playlist: UsePlaylist;
  onVolumeChange?: (vol: number) => void;
}

export function MiniPlayer({ playlist, onVolumeChange }: MiniPlayerProps) {
  const { currentTrack, isPlaying, play, pause, next, prev } = playlist;
  const titleRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [progress] = useState(0);
  const [showEQPopover, setShowEQPopover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const toggleEQPopover = () => {
    setShowEQPopover(!showEQPopover);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = Array.from(e.dataTransfer.files);
    for (const item of items) {
      const path = (item as any).path as string;
      if (!path) continue;
      // Check if it's a directory by trying to scan it
      if (path.match(/\.(mp3|flac|wav|m4a|ogg)$/i)) {
        // Single audio file
        playlist.addFile(path);
      } else {
        // Assume folder - scan it
        playlist.loadFolder(path);
      }
    }
  };

  return (
    <div className={`mini-player${isDragging ? ' dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="drag-handle" onMouseDown={handleDragStart}>
        ⋮⋮
      </div>
      <div className={`track-title ${isOverflowing ? 'overflow' : ''}`}>
        <span ref={titleRef}>
          {currentTrack?.name || 'No track'}
        </span>
      </div>
      <button onClick={prev} title="Previous">⏮</button>
      <VolumeSlider onVolumeChange={onVolumeChange} />
      <button onClick={toggleEQPopover} className="eq-btn" title="EQ">EQ</button>
      {showEQPopover && (
        <EqualizerPopover
          currentTrackPath={currentTrack?.path ?? null}
          onClose={() => setShowEQPopover(false)}
        />
      )}
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
