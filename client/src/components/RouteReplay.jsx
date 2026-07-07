import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, SkipForward, Landmark, Battery, Wifi, Navigation } from 'lucide-react';

export default function RouteReplay({ path = [], stops = [], onPositionChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  
  const timerRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update map marker when index changes
  useEffect(() => {
    if (path.length > 0 && currentIndex < path.length) {
      onPositionChange(path[currentIndex]);
    }
  }, [currentIndex, path]);

  // Handle playback loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(1000 / playbackSpeed, 100); // minimum 100ms
      
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= path.length - 1) {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, path]);

  if (path.length === 0) {
    return (
      <div className="glass-card p-4 rounded-xl text-center text-slate-400">
        No location logs available to replay for this date.
      </div>
    );
  }

  const activePoint = path[currentIndex] || {};
  const dateObj = activePoint.timestamp ? new Date(activePoint.timestamp) : null;
  const timeStr = dateObj ? dateObj.toLocaleTimeString() : 'N/A';

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value);
    setCurrentIndex(idx);
  };

  const jumpToStop = (stop) => {
    // Find closest index in path to this stop coordinate
    let closestIdx = 0;
    let minDist = Infinity;
    
    path.forEach((pt, i) => {
      const dist = Math.abs(pt.latitude - stop.lat) + Math.abs(pt.longitude - stop.lng);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    setCurrentIndex(closestIdx);
    setIsPlaying(false);
  };

  return (
    <div className="glass-card p-4 rounded-xl border border-slate-700 bg-slate-900/60 shadow-xl space-y-4">
      {/* Playback Progress Telemetry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-800/40 rounded-lg border border-slate-800">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Time</span>
          <div className="text-sm font-semibold text-sky-400 font-mono">{timeStr}</div>
        </div>
        <div className="flex items-center space-x-2">
          <Battery className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Battery</span>
            <div className="text-sm font-semibold">{activePoint.battery ?? '--'}%</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-sky-400" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Network</span>
            <div className="text-sm font-semibold uppercase">{activePoint.network || 'Online'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">GPS Accuracy</span>
            <div className="text-sm font-semibold font-mono">±{activePoint.accuracy ? Math.round(activePoint.accuracy) : '--'}m</div>
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-1">
        <input 
          type="range" 
          min="0" 
          max={path.length - 1} 
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>09:00 AM (Start)</span>
          <span>Point {currentIndex + 1} of {path.length}</span>
          <span>06:00 PM (End)</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Play/Pause */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition shadow-md"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          {/* Speed Selector */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            {[1, 2, 5, 10].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${playbackSpeed === s ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Status Indicator */}
        <div className="text-xs text-slate-400 italic">
          {isPlaying ? 'Replaying route...' : 'Paused'}
        </div>
      </div>

      {/* Quick Jump Stops */}
      {stops.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jump to Visit Stops:</span>
          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
            {stops.map((stop, idx) => (
              <button
                key={idx}
                onClick={() => jumpToStop(stop)}
                className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700"
              >
                <Landmark className="w-3 h-3 text-sky-400" />
                <span>Stop {stop.index}: {stop.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
