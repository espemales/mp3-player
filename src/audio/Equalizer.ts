import { EQ_BANDS } from '../types';

export class Equalizer {
  private ctx: AudioContext;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode;
  private audioEl: HTMLAudioElement;
  private _bands: number[] = new Array(8).fill(0);
  private _ready = false;

  constructor(audioEl: HTMLAudioElement) {
    this.audioEl = audioEl;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
  }

  /** Must be called after AudioEngine has set the audio element src */
  connect(): void {
    if (this._ready) return;
    this.source = this.ctx.createMediaElementSource(this.audioEl);
    this.filters = EQ_BANDS.map((freq, i) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = this._bands[i];
      return filter;
    });
    // Chain: source -> filter[0] -> ... -> filter[7] -> gainNode -> dest
    let last: AudioNode = this.source;
    for (const f of this.filters) {
      last.connect(f);
      last = f;
    }
    last.connect(this.gainNode);
    this._ready = true;
  }

  setBand(band: number, gainDb: number): void {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this._bands[band] = clamped;
    if (this.filters[band]) {
      this.filters[band].gain.value = clamped;
    }
  }

  applyPreset(values: number[]): void {
    for (let i = 0; i < Math.min(values.length, 8); i++) {
      this.setBand(i, values[i]);
    }
  }

  getBands(): number[] {
    return [...this._bands];
  }

  reset(): void {
    this.applyPreset([0, 0, 0, 0, 0, 0, 0, 0]);
  }

  getContext(): AudioContext {
    return this.ctx;
  }
}
