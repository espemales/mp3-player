import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types';
import { audioEngine } from '../audio/AudioEngine';

export interface UsePlaylist {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTrack: Track | null;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
}

export function usePlaylist(): UsePlaylist {
  const [tracks] = useState<Track[]>([]);
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
  };
}
