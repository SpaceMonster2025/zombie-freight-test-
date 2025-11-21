import React from 'react';
import { Battery, Heart, Skull, Zap, AlertTriangle, Rocket } from 'lucide-react';

interface HUDProps {
  fuel: number;
  hull: number;
  zombies: number;
  maxZombies: number;
  credits: number;
  multiplier: number;
  boostCharge: number;
  nearestPlanet: string | null;
}

export const HUD: React.FC<HUDProps> = ({ 
  fuel, hull, zombies, maxZombies, credits, multiplier, boostCharge, nearestPlanet 
}) => {
  const zombiePercentage = (zombies / maxZombies) * 100;
  
  // Determine warning colors
  let zombieColor = "text-green-400";
  let zombieBarColor = "bg-green-500";
  if (zombiePercentage > 60) { zombieColor = "text-yellow-400"; zombieBarColor = "bg-yellow-500"; }
  if (zombiePercentage > 85) { zombieColor = "text-red-500 animate-pulse"; zombieBarColor = "bg-red-600"; }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        {/* Left: Resources */}
        <div className="space-y-2 w-64 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10">
          {/* Fuel */}
          <div className="flex items-center gap-2">
            <Battery className={`w-5 h-5 ${fuel < 20 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${fuel < 20 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                style={{ width: `${Math.max(0, Math.min(100, fuel))}%` }} 
              />
            </div>
            <span className="text-xs w-8 text-right font-mono">{Math.floor(fuel)}%</span>
          </div>

          {/* Hull */}
          <div className="flex items-center gap-2">
            <Heart className={`w-5 h-5 ${hull < 30 ? 'text-red-500 animate-pulse' : 'text-rose-500'}`} />
            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${hull < 30 ? 'bg-red-500' : 'bg-rose-500'}`} 
                style={{ width: `${Math.max(0, Math.min(100, hull))}%` }} 
              />
            </div>
            <span className="text-xs w-8 text-right font-mono">{Math.floor(hull)}%</span>
          </div>

           {/* Boost */}
           <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${boostCharge < 100 ? 'text-yellow-600' : 'text-yellow-400'}`} />
            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 transition-all duration-200"
                style={{ width: `${Math.min(100, boostCharge)}%` }} 
              />
            </div>
            <span className="text-xs w-8 text-right font-mono">BST</span>
          </div>
        </div>

        {/* Center: Alerts */}
        <div className="flex flex-col items-center gap-2">
           <div className="text-xl font-bold tracking-widest text-white/80 bg-black/40 px-4 py-1 rounded">
             MULT: x{multiplier.toFixed(1)}
           </div>
           {nearestPlanet && (
             <div className="animate-bounce bg-blue-900/80 border border-blue-400 text-blue-100 px-4 py-2 rounded-lg flex flex-col items-center">
               <span className="text-sm font-bold">APPROACHING {nearestPlanet}</span>
               <span className="text-xs flex gap-4 mt-1">
                 <span>[Y] LAND</span>
                 <span>[N] BYPASS</span>
               </span>
             </div>
           )}
        </div>

        {/* Right: Zombies & Credits */}
        <div className="flex flex-col items-end gap-2 w-64">
          <div className="bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-white/10 w-full">
             <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Skull className={`w-5 h-5 ${zombieColor}`} />
                  <span className={`hud-font font-bold ${zombieColor}`}>CONTAINMENT</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {Math.floor(zombies)} / {maxZombies}
                </span>
             </div>
             <div className="h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-700 relative">
                <div 
                  className={`h-full transition-all duration-200 ${zombieBarColor}`} 
                  style={{ width: `${Math.min(100, zombiePercentage)}%` }}
                />
                {/* Scanline overlay on bar */}
                <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-30"></div>
             </div>
             {zombiePercentage > 90 && (
               <div className="flex items-center justify-center gap-2 mt-1 text-red-500 text-xs font-bold animate-pulse">
                 <AlertTriangle className="w-3 h-3" /> CRITICAL MASS IMMINENT
               </div>
             )}
          </div>
          
          <div className="text-right">
             <span className="text-gray-400 text-xs uppercase tracking-wider">Projected Credits</span>
             <div className="text-2xl font-mono text-green-400">
               ${Math.floor(zombies * multiplier).toLocaleString()}
             </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Hint */}
      <div className="text-center opacity-50 text-xs pb-2 font-mono">
        WASD: THRUST | SHIFT: BOOST | AVOID DEBRIS | COLLECT PARTICLES
      </div>
    </div>
  );
};