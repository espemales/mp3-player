import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useRef, useEffect, useState } from 'react';
import { UsePlaylist } from '../hooks/usePlaylist';
import { audioEngine } from '../audio/AudioEngine';
import { VolumeSlider } from './VolumeSlider';
import { EqualizerPopover } from './EqualizerPopover';

interface MiniPlayerProps {
  playlist: UsePlaylist;
  onVolumeChange?: (vol: number) => void;
}

export function MiniPlayer({ playlist, onVolumeChange }: MiniPlayerProps) {
  const { currentTrack, isPlaying, next, prev } = playlist;
  const titleRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEQPopover, setShowEQPopover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Grow/shrink window to accommodate open popups
  useEffect(() => {
    getCurrentWindow().setSize(new LogicalSize(400, showEQPopover ? 264 : 64));
  }, [showEQPopover]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (titleRef.current && containerRef.current) {
        setIsOverflowing(titleRef.current.scrollWidth > containerRef.current.offsetWidth);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const dur = audioEngine.duration;
      if (dur > 0) {
        setProgress((audioEngine.currentTime / dur) * 100);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Tauri native drag-drop events
  useEffect(() => {
    let ignore = false;
    let unlisten: (() => void) | undefined;
    (async () => {
      const webview = getCurrentWebview();
      unlisten = await webview.onDragDropEvent((event) => {
        if (ignore) return;
        if (event.payload.type === 'over') { setIsDragging(true); }
        else if (event.payload.type === 'drop') {
          setIsDragging(false);
          for (const path of event.payload.paths) {
            if (/\.(mp3|flac|wav|m4a|ogg)$/i.test(path)) playlist.addFile(path);
            else playlist.loadFolder(path);
          }
        } else if (event.payload.type === 'leave') { setIsDragging(false); }
      });
    })();
    return () => { ignore = true; unlisten?.(); };
  }, [playlist]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = audioEngine.duration;
    if (dur > 0) audioEngine.currentTime = pct * dur;
  };

  const handleClose = () => { getCurrentWindow().hide(); };
  const toggleEQ = () => setShowEQPopover(!showEQPopover);
  const handlePlayPause = () => { if (isPlaying) { audioEngine.pause(); } else { audioEngine.play(); } };

  return (
    <div
      className={`mini-player${isDragging ? ' dragging' : ''}`}
      data-tauri-drag-region
      ref={containerRef}
    >
      {/* drag handle */}
      <div
        className="drag-handle"
        onMouseDown={() => getCurrentWindow().startDragging()}
      >
        &#8942;&#8942;
      </div>

      <div className={`track-title${isOverflowing ? ' overflow' : ''}`}>
        <span ref={titleRef} onMouseDown={() => getCurrentWindow().startDragging()}>
          {currentTrack?.name || 'No track'}
        </span>
      </div>

      <button onClick={prev} title="Previous">&#9198;</button>
      <VolumeSlider onVolumeChange={onVolumeChange} />
      <button onClick={toggleEQ} className="eq-btn" title="EQ">EQ</button>
      {showEQPopover && (
        <EqualizerPopover
          currentTrackPath={currentTrack?.path ?? null}
          onClose={() => setShowEQPopover(false)}
        />
      )}
      <button onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={next} title="Next">⏭</button>
      <button onClick={handleClose} title="Hide to tray">✕</button>

      <div className="progress-bar" onClick={handleProgressClick}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
