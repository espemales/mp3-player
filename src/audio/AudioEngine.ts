import { Track } from '../types';
import { Equalizer } from './Equalizer';

class AudioEngine {
  private audio = new Audio();
  private _volume = 1;
  private _muted = false;
  private _lastVolume = 1;
  public readonly eq = new Equalizer(this.audio);

  play(): void {
    this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  loadTrack(track: Track): void {
    this.audio.src = track.path;
    this.eq.connect();
    this.audio.play();
  }

  getVolume(): number { return this._volume; }
  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this._volume;
    if (this._volume > 0) this._muted = false;
  }
  toggleMute(): void {
    if (this._muted) {
      this._muted = false;
      this.audio.volume = this._lastVolume;
    } else {
      this._lastVolume = this._volume;
      this._muted = true;
      this.audio.volume = 0;
    }
  }
  isMuted(): boolean { return this._muted; }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  set currentTime(t: number) {
    this.audio.currentTime = t;
  }

  get duration(): number {
    return this.audio.duration || 0;
  }

  onEnded(cb: () => void): void {
    this.audio.onended = cb;
  }
}

export const audioEngine = new AudioEngine();
