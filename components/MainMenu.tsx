import React from 'react';
import { SavedData, Difficulty } from '../types';
import { CLONING_RATES, FUEL_EFFICIENCY, HULL_CAPACITIES, UPGRADE_COSTS, DIFFICULTY_CONFIG } from '../constants';
import { Zap, Shield, Activity, Trophy, Play, Crosshair } from 'lucide-react';

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
  <div className="bg-gray-900/80 border border-gray-700 p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-2 text-xs text-gray-500 font-mono">
      LVL {level}/{maxLevel}
    </div>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-900/50 rounded-lg text-blue-400">{icon}</div>
      <div>
        <h3 className="font-bold text-gray-100">{title}</h3>
        <p className="text-xs text-gray-400">Current: {value}</p>
      </div>
    </div>
    <div className="mt-auto pt-4">
      {level < maxLevel ? (
        <button 
          onClick={onBuy}
          disabled={!canAfford}
          className={`w-full py-2 px-4 text-sm font-bold uppercase tracking-wider rounded transition-colors
            ${canAfford 
              ? 'bg-blue-600 hover:bg-blue-500 text-white' 
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
        >
          Upgrade ${cost.toLocaleString()}
        </button>
      ) : (
        <div className="w-full py-2 text-center text-green-400 font-bold border border-green-400/30 rounded bg-green-900/20">
          MAXED OUT
        </div>
      )}
    </div>
  </div>
);

export const MainMenu: React.FC<MainMenuProps> = ({ savedData, difficulty, setDifficulty, onStart, onUpgrade }) => {
  const upgrades = savedData.upgrades;

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative z-10 overflow-y-auto">
      <div className="max-w-4xl w-full bg-black/80 backdrop-blur-md border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 mb-2 tracking-tighter">
            ZOMBIE FREIGHT
          </h1>
          <p className="text-gray-400 text-lg font-mono tracking-widest">INTERSTELLAR CLONE DELIVERY SERVICE</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Stats Panel */}
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
               <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Pilot Credentials</h2>
               <div className="space-y-4">
                 <div>
                   <p className="text-sm text-gray-500">Available Credits</p>
                   <p className="text-3xl text-green-400 font-mono font-bold">${savedData.credits.toLocaleString()}</p>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500">Total Deliveries</p>
                   <p className="text-xl text-white font-mono">{savedData.totalDeliveries}</p>
                 </div>
                 <div>
                   <p className="text-sm text-gray-500">Max Horde Delivered</p>
                   <div className="flex items-center gap-2">
                     <Trophy className="w-4 h-4 text-yellow-500" />
                     <p className="text-xl text-white font-mono">{savedData.highScoreZombies.toLocaleString()}</p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Difficulty Selector */}
             <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
               <div className="flex items-center justify-between mb-3">
                 <h2 className="text-gray-400 text-xs uppercase tracking-widest">Mission Difficulty</h2>
                 <Crosshair className="w-4 h-4 text-gray-500" />
               </div>
               <div className="grid grid-cols-2 gap-2 mb-2">
                 {(Object.values(Difficulty) as Difficulty[]).map((d) => (
                   <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-2 py-2 text-xs font-bold rounded border transition-all ${
                      difficulty === d 
                        ? `${DIFFICULTY_CONFIG[d].color} border-current bg-white/10` 
                        : 'text-gray-500 border-gray-800 hover:border-gray-600'
                    }`}
                   >
                     {DIFFICULTY_CONFIG[d].label}
                   </button>
                 ))}
               </div>
               <p className={`text-center text-xs font-mono ${DIFFICULTY_CONFIG[difficulty].color}`}>
                 {DIFFICULTY_CONFIG[difficulty].desc}
               </p>
             </div>

             <button 
               onClick={onStart}
               className="w-full py-6 bg-red-600 hover:bg-red-500 text-white font-black text-2xl uppercase tracking-widest rounded-xl shadow-lg shadow-red-900/50 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
             >
               <Play className="fill-current" /> Launch Mission
             </button>
          </div>

          {/* Upgrade Shop */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-bold text-white">Engineering Bay</h2>
               <span className="text-sm text-gray-500">Upgrade ship systems</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <UpgradeCard 
                title="Cloning Vat"
                level={upgrades.cloning}
                maxLevel={5}
                cost={UPGRADE_COSTS[upgrades.cloning]}
                value={`+${CLONING_RATES[upgrades.cloning - 1]} / tick`}
                icon={<Activity className="w-6 h-6" />}
                onBuy={() => onUpgrade('cloning')}
                canAfford={savedData.credits >= UPGRADE_COSTS[upgrades.cloning]}
              />

              <UpgradeCard 
                title="Hull Capacity"
                level={upgrades.hull}
                maxLevel={5}
                cost={UPGRADE_COSTS[upgrades.hull]}
                value={`${HULL_CAPACITIES[upgrades.hull - 1]} Max Zombies`}
                icon={<Shield className="w-6 h-6" />}
                onBuy={() => onUpgrade('hull')}
                canAfford={savedData.credits >= UPGRADE_COSTS[upgrades.hull]}
              />

              <UpgradeCard 
                title="Fuel Injectors"
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
        </div>
      </div>
    </div>
  );
};