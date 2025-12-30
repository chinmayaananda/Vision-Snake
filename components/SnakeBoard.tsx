import React from 'react';
import { Point } from '../types';
import { GRID_SIZE } from '../constants';

interface SnakeBoardProps {
  snake: Point[];
  food: Point;
  score: number;
}

const SnakeBoard: React.FC<SnakeBoardProps> = ({ snake, food, score }) => {
  return (
    <div className="block w-full h-full relative overflow-hidden rounded-lg border-4 border-gray-700 bg-gray-900 shadow-inner">
        {/* Background Grid */}
        <div 
            className="absolute inset-0 opacity-10"
            style={{
                backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
                backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
            }}
        />

        {/* Game Area */}
        <svg 
            viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} 
            className="absolute inset-0 w-full h-full p-1 block"
            preserveAspectRatio="xMidYMid meet"
        >
            {/* Food */}
            <circle
                cx={food.x + 0.5}
                cy={food.y + 0.5}
                r={0.35}
                className="fill-red-500 animate-pulse"
                style={{ filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))' }}
            />

            {/* Snake Body */}
            {snake.map((segment, i) => {
                const isHead = i === 0;
                return (
                    <rect
                        key={`${segment.x}-${segment.y}-${i}`}
                        x={segment.x + 0.05}
                        y={segment.y + 0.05}
                        width={0.9}
                        height={0.9}
                        rx={0.3}
                        className={`${isHead ? 'fill-green-400' : 'fill-green-600'} transition-all duration-100`}
                        style={{ filter: isHead ? 'drop-shadow(0 0 6px rgba(74, 222, 128, 0.6))' : 'none' }}
                    />
                );
            })}
        </svg>

        {/* Score Overlay */}
        <div className="absolute top-4 right-4 text-4xl font-black text-gray-800/50 select-none z-0 pointer-events-none">
            {score.toString().padStart(3, '0')}
        </div>
    </div>
  );
};

export default SnakeBoard;