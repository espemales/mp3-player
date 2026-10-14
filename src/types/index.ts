export interface Track {
  path: string;
  name: string;
}

export const EQ_BANDS = [60, 170, 350, 1000, 3500, 7000, 12000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  'Flat':        [0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost':  [6, 4, 2, 0, 0, 0, 0, 0],
  'Treble Boost':[0, 0, 0, 0, 2, 4, 6, 6],
  'Rock':       [4, 3, 1, -1, -1, 2, 3, 4],
  'Electronic':  [5, 4, 1, 0, 2, 3, 3, 2],
  'Classical':   [2, 1, 0, -1, 0, 1, 2, 2],
  'Podcast':    [3, 4, 3, 2, 1, 0, 0, 0],
  'Loudness':   [4, 3, 1, 0, 0, 0, 1, 2],
};
