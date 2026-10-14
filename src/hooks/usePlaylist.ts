import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Track } from '../types';
import { audioEngine } from '../audio/AudioEngine';
import { notify } from '../utils/notifications';

export interface UsePlaylist {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTrack: Track | null;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  loadFolder: (folderPath: string) => Promise<void>;
  addFile: (path: string) => void;
}

export function usePlaylist(): UsePlaylist {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack = tracks.length > 0 ? tracks[currentIndex] ?? null : null;

  const play = useCallback(() => {
    audioEngine.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioEngine.pause();
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  }, [tracks.length]);

  const prev = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const loadFolder = useCallback(async (folderPath: string) => {
    try {
      const result = await invoke<{ files: string[] }>('scan_folder', { folder: folderPath });
      const newTracks: Track[] = result.files.map(path => ({
        path,
        name: path.split(/[/\\]/).pop() || path,
      }));
      setTracks(prev => {
        const existingPaths = new Set(prev.map(t => t.path));
        const unique = newTracks.filter(t => !existingPaths.has(t.path));
        return [...prev, ...unique];
      });
    } catch (e) {
      console.error('Failed to load folder:', e);
      notify('MP3 Player', 'Failed to load music folder');
    }
  }, []);

  const addFile = useCallback((path: string) => {
    if (path.match(/\.(mp3|flac|wav|m4a|ogg)$/i)) {
      setTracks(prev => {
        if (prev.some(t => t.path === path)) return prev;
        return [...prev, { path, name: path.split(/[/\\]/).pop() || path }];
      });
    }
  }, []);

  // Listen for tray control events
  useEffect(() => {
    let cleanup: (() => void)[] = [];
    listen('tray-play-pause', () => {
      setIsPlaying(p => { if (p) { audioEngine.pause(); } else { audioEngine.play(); } return !p; });
    }).then(u => cleanup.push(u));
    listen('tray-next', () => next()).then(u => cleanup.push(u));
    listen('tray-prev', () => prev()).then(u => cleanup.push(u));
    return () => cleanup.forEach(fn => fn());
  }, [next, prev]);

  // Listen for folder file events
  useEffect(() => {
    const setupListeners = async () => {
      const unlistenAdd = await listen<string>('folder-file-added', (event) => {
        const path = event.payload;
        if (path.match(/\.(mp3|flac|wav|m4a|ogg)$/i)) {
          setTracks(prev => {
            if (prev.some(t => t.path === path)) return prev;
            return [...prev, { path, name: path.split(/[/\\]/).pop() || path }];
          });
        }
      });

      const unlistenRemove = await listen<string>('folder-file-removed', (event) => {
        setTracks(prev => prev.filter(t => t.path !== event.payload));
      });

      return () => {
        unlistenAdd();
        unlistenRemove();
      };
    };

    const cleanup = setupListeners();
    return () => {
      cleanup.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    if (currentTrack) {
      audioEngine.loadTrack(currentTrack);
      setIsPlaying(true);
    }
  }, [currentTrack]);

  useEffect(() => {
    audioEngine.onEnded(() => {
      next();
    });
  }, [next]);

  return {
    tracks,
    currentIndex,
    isPlaying,
    currentTrack,
    play,
    pause,
    next,
    prev,
    loadFolder,
    addFile,
  };
}
