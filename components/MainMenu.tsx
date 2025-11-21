
import React from 'react';
import { SavedData, Difficulty } from '../types';
import { CLONING_RATES, FUEL_EFFICIENCY, HULL_CAPACITIES, UPGRADE_COSTS, DIFFICULTY_CONFIG } from '../constants';
import { Zap, Shield, Activity, Trophy, Play, Crosshair, Star } from 'lucide-react';

interface MainMenuProps {
  savedData: SavedData;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onUpgrade: (type: 'cloning' | 'hull' | 'fuel') => void;
}

const UpgradeCard: React.FC<{
  title: string;
  level: number;
  maxLevel: number;
  cost: number;
  value: string;
  icon: React.ReactNode;
  onBuy: () => void;
  canAfford: boolean;
}> = ({ title, level, maxLevel, cost, value, icon, onBuy, canAfford }) => (
  <div className="bg-yellow-50 border-2 border-black p-3 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group transform transition-transform hover:-translate-y-1">
    <div className="absolute -top-3 -right-2 bg-red-600 text-white border-2 border-black px-2 py-0.5 text-xs font-comic rotate-3">
      LVL {level}/{maxLevel}
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-blue-500 border-2 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{icon}</div>
      <div>
        <h3 className="font-comic text-xl leading-none text-black uppercase">{title}</h3>
        <p className="text-xs font-mono font-bold text-gray-600">{value}</p>
      </div>
    </div>
    <div className="mt-auto pt-2">
      {level < maxLevel ? (
        <button 
          onClick={onBuy}
          disabled={!canAfford}
          className={`w-full py-1 px-2 text-sm font-comic uppercase tracking-wider border-2 border-black transition-all
            ${canAfford 
              ? 'bg-green-500 hover:bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px]' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          Buy ${cost.toLocaleString()}
        </button>
      ) : (
        <div className="w-full py-1 text-center text-red-600 font-comic border-2 border-red-600 bg-red-100 -rotate-2">
          SOLD OUT!
        </div>
      )}
    </div>
  </div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ savedData, difficulty, setDifficulty, onStart, onUpgrade }) => {
  const upgrades = savedData.upgrades;

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative z-10 overflow-y-auto">
      {/* Comic Book Cover Container */}
      <div className="max-w-5xl w-full bg-[#e8dcc5] relative shadow-2xl overflow-hidden border-4 border-black">
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
        {/* Halftone Overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none halftone"></div>
        
        {/* Comic Header Bar */}
        <div className="flex justify-between items-start border-b-4 border-black bg-yellow-400 p-2 relative z-10">
           <div className="flex flex-col pl-4">
              <span className="font-comic text-xl leading-none">OCTOBER 194X</span>
              <span className="font-mono text-xs font-bold">SPACE CORP. ISSUE #1</span>
           </div>
           
           {/* Price Box */}
           <div className="border-2 border-black bg-white px-4 py-1 transform -rotate-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
             <span className="font-comic text-2xl text-black">25 CENTS</span>
           </div>
        </div>

        <div className="p-6 md:p-12 relative z-10">
          
          {/* Title Section */}
          <div className="text-center mb-8 transform -rotate-1">
            <h2 className="font-comic text-3xl text-yellow-400 text-shadow-comic stroke-black absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-0 blur-sm opacity-50">
              THE ZOMBIE DELIVERY
            </h2>
            <h1 className="font-horror text-8xl md:text-9xl text-red-600 text-shadow-comic leading-none mb-2 relative z-10 tracking-wider">
              GALAXY<br/>
              <span className="text-6xl md:text-7xl text-black/80 absolute top-1 left-1 -z-10 blur-none">of</span>
              <span className="text-5xl md:text-6xl text-white mx-4 align-middle font-comic transform rotate-12 inline-block text-shadow-comic">of</span>
              TERROR
            </h1>
            <div className="inline-block bg-yellow-400 border-4 border-black px-8 py-2 transform rotate-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-4">
              <p className="text-black text-2xl font-comic tracking-widest uppercase">
                The Zombie Delivery
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Pilot Stats (styled as an ad) */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                 <div className="absolute -top-4 -left-4 bg-blue-500 text-white font-comic px-3 py-1 border-2 border-black -rotate-6">
                   PILOT LOG
                 </div>
                 
                 <div className="space-y-3 mt-2">
                   <div className="flex justify-between items-end border-b-2 border-dashed border-gray-400 pb-1">
                     <span className="font-comic text-gray-600 text-lg">CREDITS</span>
                     <span className="font-mono text-2xl font-bold text-green-600">${savedData.credits.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-end border-b-2 border-dashed border-gray-400 pb-1">
                     <span className="font-comic text-gray-600 text-lg">DELIVERIES</span>
                     <span className="font-mono text-xl font-bold">{savedData.totalDeliveries}</span>
                   </div>
                   <div className="flex justify-between items-end">
                     <span className="font-comic text-gray-600 text-lg">BEST HAUL</span>
                     <div className="flex items-center gap-1">
                       <Trophy className="w-4 h-4 text-yellow-500" />
                       <span className="font-mono text-xl font-bold">{savedData.highScoreZombies.toLocaleString()}</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Difficulty (styled as a warning label) */}
               <div className="bg-red-100 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                 <div className="flex items-center justify-between mb-2">
                   <h2 className="font-comic text-xl text-black uppercase">DANGER LEVEL</h2>
                   <Crosshair className="w-6 h-6 text-red-600" />
                 </div>
                 <div className="grid grid-cols-2 gap-2 mb-2">
                   {(Object.values(Difficulty) as Difficulty[]).map((d) => (
                     <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-1 py-1 text-sm font-bold border-2 border-black transition-all font-comic uppercase ${
                        difficulty === d 
                          ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                          : 'bg-white text-gray-500 hover:bg-gray-100'
                      }`}
                     >
                       {DIFFICULTY_CONFIG[d].label}
                     </button>
                   ))}
                 </div>
                 <p className="text-center font-mono text-xs font-bold text-red-800 border-t-2 border-black pt-2 mt-2">
                   {DIFFICULTY_CONFIG[difficulty].desc}
                 </p>
               </div>
            </div>

            {/* Right Column: Upgrades & Play */}
            <div className="lg:col-span-8 flex flex-col justify-between gap-6">
              
              {/* Upgrade Shop (styled as 'X-RAY SPECS' style ads) */}
              <div className="bg-white/80 border-4 border-black p-4 relative">
                 <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-300 px-6 py-1 border-4 border-black font-comic text-xl uppercase rotate-1 z-10 whitespace-nowrap">
                    Super Science Upgrades!
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                    <UpgradeCard 
                      title="Cloning Vat"
                      level={upgrades.cloning}
                      maxLevel={5}
                      cost={UPGRADE_COSTS[upgrades.cloning]}
                      value={`+${CLONING_RATES[upgrades.cloning - 1]}/tick`}
                      icon={<Activity className="w-6 h-6" />}
                      onBuy={() => onUpgrade('cloning')}
                      canAfford={savedData.credits >= UPGRADE_COSTS[upgrades.cloning]}
                    />
                    <UpgradeCard 
                      title="Hull Plating"
                      level={upgrades.hull}
                      maxLevel={5}
                      cost={UPGRADE_COSTS[upgrades.hull]}
                      value={`${HULL_CAPACITIES[upgrades.hull - 1]} Max`}
                      icon={<Shield className="w-6 h-6" />}
                      onBuy={() => onUpgrade('hull')}
                      canAfford={savedData.credits >= UPGRADE_COSTS[upgrades.hull]}
                    />
                    <UpgradeCard 
                      title="Fuel Injector"
                      level={upgrades.fuel}
                      maxLevel={5}
                      cost={UPGRADE_COSTS[upgrades.fuel]}
                      value={`${Math.round((1 - FUEL_EFFICIENCY[upgrades.fuel - 1])*100)}% Eff.`}
                      icon={<Zap className="w-6 h-6" />}
                      onBuy={() => onUpgrade('fuel')}
                      canAfford={savedData.credits >= UPGRADE_COSTS[upgrades.fuel]}
                    />
                 </div>
              </div>

              {/* Play Button (styled as 'Start Adventure') */}
              <button 
                onClick={onStart}
                className="w-full py-6 bg-red-600 hover:bg-red-500 text-white border-4 border-black font-horror text-5xl uppercase tracking-widest shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-4 group"
              >
                <span className="group-hover:animate-pulse">LAUNCH MISSION</span>
                <Star className="w-10 h-10 fill-yellow-400 text-black animate-spin-slow" />
              </button>

            </div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-red-600 border-t-4 border-black p-3 text-center relative z-10">
           <div className="flex justify-center gap-8 font-comic text-3xl text-yellow-400 text-shadow-retro uppercase tracking-widest">
             <span>Thrills!</span>
             <span className="text-white">Chills!</span>
             <span>Pixels!</span>
           </div>
        </div>
      </div>
    </div>
  );
};
