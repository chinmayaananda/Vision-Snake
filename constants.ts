// Grid Config
export const GRID_SIZE = 20; // Size of the board (20x20)
export const CELL_SIZE = 25; // Pixel size of one cell (visual only, responsive via CSS)
export const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
export const GAME_SPEED_MS = 150;

// Gesture Config
export const MOVEMENT_THRESHOLD = 0.05; // Significant movement required to trigger
export const GESTURE_HISTORY_MS = 300; // Time window to detect a swipe
export const GESTURE_COOLDOWN_MS = 350; // Pause between swipes to prevent double turns