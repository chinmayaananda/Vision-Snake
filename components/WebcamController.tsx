import React, { useEffect, useRef, useState } from 'react';
import { Direction, Results } from '../types';
import { MOVEMENT_THRESHOLD, GESTURE_HISTORY_MS, GESTURE_COOLDOWN_MS } from '../constants';
import { isOppositeDirection } from '../utils/gameLogic';
import { VideoOff, Loader2 } from 'lucide-react';

interface WebcamControllerProps {
  onDirectionChange: (direction: Direction) => void;
  currentDirection: Direction;
  isGameRunning: boolean;
}

interface Point {
    x: number;
    y: number;
    time: number;
}

const WebcamController: React.FC<WebcamControllerProps> = ({ 
  onDirectionChange, 
  currentDirection,
  isGameRunning 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedDir, setDetectedDir] = useState<Direction | null>(null);
  
  // Gesture State
  const historyRef = useRef<Point[]>([]);
  const lastGestureTimeRef = useRef<number>(0);
  
  // Refs for closure access
  const onDirectionChangeRef = useRef(onDirectionChange);
  const currentDirectionRef = useRef(currentDirection);
  
  useEffect(() => {
    onDirectionChangeRef.current = onDirectionChange;
  }, [onDirectionChange]);

  useEffect(() => {
    currentDirectionRef.current = currentDirection;
  }, [currentDirection]);

  // Script Loading Check
  useEffect(() => {
    const checkScripts = setInterval(() => {
      if (window.Hands && window.Camera) {
        setScriptsLoaded(true);
        clearInterval(checkScripts);
      }
    }, 100);
    return () => clearInterval(checkScripts);
  }, []);

  // Camera & Hands Logic
  useEffect(() => {
    let isMounted = true;
    let cameraInstance: any = null;
    let handsInstance: any = null;

    if (!scriptsLoaded || !isGameRunning) {
        setCameraActive(false);
        return;
    }

    const onResults = (results: Results) => {
      if (!isMounted || !canvasRef.current) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // --- RENDER CAMERA FEED ---
      // Mirror the context so it feels natural (Right is Right)
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.translate(width, 0);
      canvasCtx.scale(-1, 1);
      
      canvasCtx.drawImage(results.image, 0, 0, width, height);
      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      canvasCtx.fillRect(0, 0, width, height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Track ONLY the Index Finger Tip (Landmark 8)
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const now = Date.now();

        // Convert to Visual Coordinates for Logic
        // Raw X is 0..1 (Left..Right in the video feed). 
        // Since we mirrored the canvas, Visual X = 1 - Raw X.
        const visualX = 1 - indexTip.x;
        const visualY = indexTip.y;

        // Draw Tracker (Visual feedback)
        // We draw at raw indexTip.x because context is flipped
        canvasCtx.beginPath();
        canvasCtx.arc(indexTip.x * width, indexTip.y * height, 12, 0, 2 * Math.PI);
        canvasCtx.fillStyle = '#4ade80';
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();

        // --- GESTURE ALGORITHM ---
        
        // 1. Update History
        historyRef.current.push({ x: visualX, y: visualY, time: now });
        
        // 2. Prune old history
        historyRef.current = historyRef.current.filter(p => now - p.time <= GESTURE_HISTORY_MS);

        // 3. Draw Trail
        if (historyRef.current.length > 1) {
            canvasCtx.beginPath();
            // Map visual history back to raw coords for drawing
            const startRaw = 1 - historyRef.current[0].x;
            canvasCtx.moveTo(startRaw * width, historyRef.current[0].y * height);
            
            for (let i = 1; i < historyRef.current.length; i++) {
                const p = historyRef.current[i];
                const rawX = 1 - p.x;
                canvasCtx.lineTo(rawX * width, p.y * height);
            }
            canvasCtx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
            canvasCtx.lineWidth = 4;
            canvasCtx.stroke();
        }

        // 4. Detect Swipe
        if (historyRef.current.length > 2 && (now - lastGestureTimeRef.current > GESTURE_COOLDOWN_MS)) {
            const start = historyRef.current[0];
            const end = historyRef.current[historyRef.current.length - 1];

            const dx = end.x - start.x;
            const dy = end.y - start.y;
            
            // Calculate distance squared to avoid sqrt
            const distSq = dx*dx + dy*dy;
            const thresholdSq = MOVEMENT_THRESHOLD * MOVEMENT_THRESHOLD;

            if (distSq > thresholdSq) {
                // Significant movement detected
                let newDir: Direction | null = null;
                
                // Dominant Axis
                if (Math.abs(dx) > Math.abs(dy)) {
                    newDir = dx > 0 ? Direction.RIGHT : Direction.LEFT;
                } else {
                    newDir = dy > 0 ? Direction.DOWN : Direction.UP;
                }

                // Check Validity
                const currentDir = currentDirectionRef.current;
                
                if (newDir && newDir !== currentDir && !isOppositeDirection(currentDir, newDir)) {
                    onDirectionChangeRef.current(newDir);
                    setDetectedDir(newDir);
                    lastGestureTimeRef.current = now;
                    historyRef.current = []; // Reset history after trigger
                }
            }
        }

      } else {
        // No hand detected
        historyRef.current = [];
      }
      
      canvasCtx.restore();
    };

    const initCamera = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });

        handsInstance = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        handsInstance.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handsInstance.onResults(onResults);

        cameraInstance = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsInstance && isMounted) {
              await handsInstance.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240,
        });

        await cameraInstance.start();
        if (isMounted) {
            setCameraActive(true);
            setError(null);
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (isMounted) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Permission denied. Please allow camera access.");
            } else {
                setError("Camera failed to start.");
            }
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (cameraInstance) {
          cameraInstance.stop();
      }
      if (handsInstance) {
          handsInstance.close();
      }
      setCameraActive(false);
    };
  }, [isGameRunning, scriptsLoaded]);

  const getDirectionIcon = () => {
    switch (detectedDir) {
      case Direction.UP: return "↑";
      case Direction.DOWN: return "↓";
      case Direction.LEFT: return "←";
      case Direction.RIGHT: return "→";
      default: return "";
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 bg-black w-full max-w-[320px]">
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 1, height: 1 }}
        playsInline
        autoPlay
        muted
      />
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-auto block transform bg-gray-900" 
      />
      
      {/* Status Overlay */}
      <div className="absolute top-2 left-2 flex flex-col items-start space-y-1 pointer-events-none">
          <div className="flex items-center space-x-2 bg-black/60 px-2 py-1 rounded-md text-xs font-mono text-green-400">
            {cameraActive ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>TRACKING FINGER</span>
              </>
            ) : (
              <span>{error || "INITIALIZING..."}</span>
            )}
          </div>
      </div>

      {detectedDir && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div key={Date.now()} className={`text-8xl font-black text-green-500/80 animate-ping`}>
            {getDirectionIcon()}
          </div>
        </div>
      )}
      
      {!cameraActive && !error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-center p-4">
             <Loader2 className="w-10 h-10 text-green-500 mb-2 animate-spin"/>
         </div>
      )}

      {error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-center p-4">
             <VideoOff className="w-10 h-10 text-red-500 mb-2"/>
             <p className="text-sm text-red-400 mb-2">{error}</p>
             <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white font-bold"
             >
                RELOAD PAGE
             </button>
         </div>
      )}
    </div>
  );
};

export default WebcamController;