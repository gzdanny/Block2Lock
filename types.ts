export interface Vehicle {
  x: number;
  y: number;
  length: number;
  hz: boolean; // true for horizontal, false for vertical
}

export type Level = Vehicle[];
