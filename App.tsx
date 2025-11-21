import React, { useState, useEffect } from 'react';
import { GameScreen, GameRunStats, SavedData, Difficulty } from './types';
import { getSavedData, saveGameData } from './services/storageService';
import { UPGRADE_COSTS } from './constants';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { Starfield } from './components/Starfield';

function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
  const [savedData, setSavedData] = useState<SavedData>(getSavedData());
  const [lastRunStats, setLastRunStats] = useState<GameRunStats | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);

  // Persist data whenever it changes
  useEffect(() => {
    saveGameData(savedData);
  }, [savedData]);

  const handleStartGame = () => {
    setScreen(GameScreen.GAME);
  };

  const handleUpgrade = (type: 'cloning' | 'hull' | 'fuel') => {
    const currentLevel = savedData.upgrades[type];
    const cost = UPGRADE_COSTS[currentLevel];

    if (savedData.credits >= cost && currentLevel < 5) {
      setSavedData(prev => ({
        ...prev,
        credits: prev.credits - cost,
        upgrades: {
          ...prev.upgrades,
          [type]: currentLevel + 1
        }
      }));
    }
  };

  const handleGameOver = (stats: { zombies: number; credits: number; reason: string }) => {
    setLastRunStats({
      zombiesDelivered: 0,
      distanceTraveled: 0, // Not tracking in simplified state, could add
      multiplier: 1,
      reason: stats.reason
    });
    setScreen(GameScreen.GAME_OVER);
  };

  const handleSuccess = (stats: { zombies: number; credits: number; multiplier: number }) => {
    setSavedData(prev => ({
      ...prev,
      credits: prev.credits + stats.credits,
      totalDeliveries: prev.totalDeliveries + 1,
      highScoreZombies: Math.max(prev.highScoreZombies, stats.zombies)
    }));

    setLastRunStats({
      zombiesDelivered: stats.zombies,
      distanceTraveled: 0,
      multiplier: stats.multiplier,
      reason: "MISSION SUCCESSFUL"
    });
    setScreen(GameScreen.SUCCESS);
  };

  return (
    <div className="w-full h-screen relative overflow-hidden text-white select-none">
      <div className="scanlines fixed inset-0 z-50 pointer-events-none"></div>
      
      {screen === GameScreen.MENU && (
        <>
          <Starfield speedMultiplier={0.2} />
          <MainMenu 
            savedData={savedData} 
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onStart={handleStartGame} 
            onUpgrade={handleUpgrade}
          />
        </>
      )}

      {screen === GameScreen.GAME && (
        <GameCanvas 
          saveData={savedData}
          difficulty={difficulty}
          onGameOver={handleGameOver}
          onSuccess={handleSuccess}
        />
      )}

      {(screen === GameScreen.GAME_OVER || screen === GameScreen.SUCCESS) && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur flex items-center justify-center p-4">
           <div className={`max-w-md w-full p-8 rounded-2xl border-2 text-center ${screen === GameScreen.SUCCESS ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
              <h2 className="text-4xl font-black mb-2 font-mono">
                {screen === GameScreen.SUCCESS ? 'DELIVERY COMPLETE' : 'MISSION FAILED'}
              </h2>
              <p className="text-gray-300 mb-6 font-mono">{lastRunStats?.reason}</p>
              
              <div className="space-y-4 mb-8 bg-black/50 p-4 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-400">Zombies</span>
                  <span className="font-bold font-mono">{lastRunStats?.zombiesDelivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Multiplier</span>
                  <span className="font-bold font-mono">x{lastRunStats?.multiplier.toFixed(1)}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between text-xl">
                  <span className="text-gray-400">Credits Earned</span>
                  <span className={`font-bold font-mono ${screen === GameScreen.SUCCESS ? 'text-green-400' : 'text-red-400'}`}>
                    ${screen === GameScreen.SUCCESS ? Math.floor((lastRunStats?.zombiesDelivered || 0) * (lastRunStats?.multiplier || 1)) : 0}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setScreen(GameScreen.MENU)}
                className="w-full py-4 bg-white text-black font-bold uppercase hover:bg-gray-200 rounded transition-colors"
              >
                Return to Hangar
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;