import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Direction, Point, GameStatus } from './types';
import { GRID_SIZE, INITIAL_SNAKE, GAME_SPEED_MS } from './constants';
import { getNextHeadPosition, checkCollision, getRandomPosition, isOppositeDirection } from './utils/gameLogic';
import { useInterval } from './hooks/useInterval';
import SnakeBoard from './components/SnakeBoard';
import WebcamController from './components/WebcamController';
import { Play, RotateCcw, Keyboard as KeyboardIcon, Hand } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(getRandomPosition());
  const [direction, setDirection] = useState<Direction>(Direction.UP);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [controlMode, setControlMode] = useState<'camera' | 'keyboard'>('camera');

  // Input Buffer to prevent multi-turn in one tick
  const [nextDirection, setNextDirection] = useState<Direction>(Direction.UP);

  // Ref to hold current direction for stable callbacks without re-triggering effects
  const directionRef = useRef(Direction.UP);

  // Keep Ref in sync with state
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setFood(getRandomPosition());
    setDirection(Direction.UP);
    directionRef.current = Direction.UP; // Immediate update for logic
    setNextDirection(Direction.UP);
    setScore(0);
    setStatus(GameStatus.PLAYING);
  };

  const handleGameOver = () => {
    setStatus(GameStatus.GAME_OVER);
    if (score > highScore) setHighScore(score);
  };

  // Direction Handler (Stable reference)
  const changeDirection = useCallback((newDir: Direction) => {
    // Check against the Ref instead of state to avoid dependency changes
    if (!isOppositeDirection(directionRef.current, newDir)) {
      setNextDirection(newDir);
    }
  }, []);

  // Keyboard Fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      
      switch (e.key) {
        case 'ArrowUp': changeDirection(Direction.UP); break;
        case 'ArrowDown': changeDirection(Direction.DOWN); break;
        case 'ArrowLeft': changeDirection(Direction.LEFT); break;
        case 'ArrowRight': changeDirection(Direction.RIGHT); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, changeDirection]);

  // Game Loop
  useInterval(() => {
    if (status !== GameStatus.PLAYING) return;

    const currentHead = snake[0];
    // Commit the buffered direction
    setDirection(nextDirection);
    const newHead = getNextHeadPosition(currentHead, nextDirection);

    if (checkCollision(newHead, snake)) {
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...snake];
    
    // Check Food
    if (newHead.x === food.x && newHead.y === food.y) {
      setScore(s => s + 10);
      setFood(getRandomPosition());
      // Don't pop tail, so it grows
    } else {
      newSnake.pop(); // Remove tail
    }

    setSnake(newSnake);
  }, status === GameStatus.PLAYING ? GAME_SPEED_MS : null);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center py-8 px-4 font-sans relative overflow-y-auto">
      <div className="scanlines"></div>
      
      <div className="z-20 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-4">
        
        {/* Left Column: Game Info & Controls */}
        <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
           <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-2">
                VISION SNAKE
              </h1>
              <p className="text-gray-400 text-sm mb-6">
                Control the snake by swiping your index finger in the air.
              </p>

              <div className="flex justify-between items-center mb-6">
                 <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Score</p>
                    <p className="text-3xl font-bold text-white">{score}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Best</p>
                    <p className="text-3xl font-bold text-yellow-500">{highScore}</p>
                 </div>
              </div>

              <div className="space-y-3">
                 <div className="flex bg-gray-800 rounded-lg p-1">
                    <button 
                       onClick={() => setControlMode('camera')}
                       className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors ${controlMode === 'camera' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                       <Hand className="w-4 h-4 mr-2" />
                       Gestures
                    </button>
                    <button 
                       onClick={() => setControlMode('keyboard')}
                       className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-medium transition-colors ${controlMode === 'keyboard' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                       <KeyboardIcon className="w-4 h-4 mr-2" />
                       Keyboard
                    </button>
                 </div>
              </div>
           </div>

           {/* Webcam View */}
           <div className={`transition-opacity duration-500 ${controlMode === 'camera' ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
              <WebcamController 
                onDirectionChange={(d) => {
                  if (controlMode === 'camera') changeDirection(d);
                }}
                currentDirection={direction}
                isGameRunning={status === GameStatus.PLAYING || status === GameStatus.IDLE}
              />
              <div className="mt-2 text-xs text-gray-500 text-center">
                <span className="font-bold text-green-400">TIP:</span> Make quick, clear swipes with your index finger.
              </div>
           </div>
        </div>

        {/* Center/Right Column: Game Board */}
        <div className="lg:col-span-2 order-1 lg:order-2 flex flex-col items-center justify-start w-full">
           <div className="relative group w-full max-w-[500px] aspect-square bg-gray-900 rounded-lg shadow-2xl">
              <SnakeBoard snake={snake} food={food} score={score} />
              
              {/* Overlays */}
              {status === GameStatus.IDLE && (
                 <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg backdrop-blur-sm z-20">
                    <button 
                       onClick={startGame}
                       className="group relative px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-black text-xl rounded-full transition-all hover:scale-105 active:scale-95 flex items-center shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                    >
                       <Play className="w-6 h-6 mr-2 fill-black" />
                       START GAME
                    </button>
                 </div>
              )}

              {status === GameStatus.GAME_OVER && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg backdrop-blur-md z-20 animate-in fade-in duration-300">
                    <h2 className="text-5xl font-black text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">GAME OVER</h2>
                    <p className="text-gray-300 text-lg mb-8">Final Score: {score}</p>
                    <button 
                       onClick={startGame}
                       className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors flex items-center"
                    >
                       <RotateCcw className="w-5 h-5 mr-2" />
                       PLAY AGAIN
                    </button>
                 </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;