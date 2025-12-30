export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export interface Point {
  x: number;
  y: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

// MediaPipe Type Definitions (simplified for what we need)
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Results {
  multiHandLandmarks: NormalizedLandmark[][];
  multiHandedness: any[];
  image: any;
}

export interface HandsInterface {
  setOptions: (options: any) => void;
  onResults: (callback: (results: Results) => void) => void;
  send: (input: { image: HTMLVideoElement | HTMLCanvasElement }) => Promise<void>;
  close: () => void;
}

export interface CameraInterface {
  start: () => Promise<void>;
  stop: () => void;
}

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => HandsInterface;
    Camera: new (element: HTMLVideoElement, config: { onFrame: () => Promise<void>, width: number, height: number }) => CameraInterface;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}