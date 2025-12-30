import { Direction, Point } from '../types';
import { GRID_SIZE } from '../constants';

export const getRandomPosition = (): Point => {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
};

export const getNextHeadPosition = (head: Point, direction: Direction): Point => {
  switch (direction) {
    case Direction.UP:
      return { x: head.x, y: head.y - 1 };
    case Direction.DOWN:
      return { x: head.x, y: head.y + 1 };
    case Direction.LEFT:
      return { x: head.x - 1, y: head.y };
    case Direction.RIGHT:
      return { x: head.x + 1, y: head.y };
  }
};

export const checkCollision = (head: Point, snake: Point[]): boolean => {
  // Wall collision
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }

  // Self collision (ignore tail as it will move)
  for (let i = 0; i < snake.length - 1; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true;
    }
  }

  return false;
};

export const isOppositeDirection = (current: Direction, next: Direction): boolean => {
  if (current === Direction.UP && next === Direction.DOWN) return true;
  if (current === Direction.DOWN && next === Direction.UP) return true;
  if (current === Direction.LEFT && next === Direction.RIGHT) return true;
  if (current === Direction.RIGHT && next === Direction.LEFT) return true;
  return false;
};