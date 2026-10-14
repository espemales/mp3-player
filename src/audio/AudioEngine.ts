import { Track } from '../types';

class AudioEngine {
  private audio = new Audio();

  play(): void {
    this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  loadTrack(track: Track): void {
    this.audio.src = track.path;
    this.audio.play();
  }

  setVolume(vol: number): void {
    this.audio.volume = vol;
  }

  onEnded(cb: () => void): void {
    this.audio.onended = cb;
  }
}

export const audioEngine = new AudioEngine();
