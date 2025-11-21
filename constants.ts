import { SavedData, Difficulty } from './types';

export const INITIAL_SAVE_DATA: SavedData = {
  credits: 0,
  highScoreZombies: 0,
  totalDeliveries: 0,
  upgrades: {
    cloning: 1,
    hull: 1,
    fuel: 1
  }
};

// Difficulty Config
export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: { maxShots: 5, label: "Recruit", color: "text-green-400", desc: "Max Shots: 5" },
  [Difficulty.MEDIUM]: { maxShots: 3, label: "Veteran", color: "text-blue-400", desc: "Max Shots: 3" },
  [Difficulty.HARD]: { maxShots: 2, label: "Hardcore", color: "text-orange-400", desc: "Max Shots: 2" },
  [Difficulty.INSANE]: { maxShots: 1, label: "Psychopath", color: "text-red-600", desc: "Max Shots: 1" }
};

// Collector Ability Config
export const COLLECTOR_CONFIG = {
  [Difficulty.EASY]: { uses: 5, radius: 450, duration: 300, pullSpeed: 0.8 },    // 5 uses, 5s each, 450px range
  [Difficulty.MEDIUM]: { uses: 3, radius: 350, duration: 240, pullSpeed: 0.6 },  // 3 uses, 4s each, 350px range
  [Difficulty.HARD]: { uses: 2, radius: 250, duration: 180, pullSpeed: 0.5 },    // 2 uses, 3s each, 250px range
  [Difficulty.INSANE]: { uses: 1, radius: 180, duration: 120, pullSpeed: 0.4 }   // 1 use, 2s each, 180px range
};

// Upgrade Config
export const UPGRADE_COSTS = [0, 500, 1500, 4000, 10000];
export const CLONING_RATES = [0.2, 0.5, 1.0, 1.8, 3.0]; // Zombies per tick
export const HULL_CAPACITIES = [1000, 2500, 5000, 10000, 25000]; // Max zombies
export const FUEL_EFFICIENCY = [1.0, 0.8, 0.6, 0.5, 0.4]; // Consumption multiplier

// Physics Config
export const SHIP_SPEED = 5;
export const SHIP_FRICTION = 0.92;
export const SHIP_THRUST = 0.4;
export const BOOST_MULTIPLIER = 2.5;
export const SCROLL_SPEED_BASE = 2;
export const SCROLL_SPEED_MAX = 12;

// Resource Config
export const FUEL_MAX = 100;
export const HULL_MAX = 100;
export const FUEL_CONSUMPTION_BASE = 0.05;
export const COLLISION_DAMAGE = 20;
export const COLLISION_FUEL_LEAK = 10;

export const PLANET_NAMES = [
  "Kepler-186f", "Proxima B", "Trappist-1e", "Gliese 667", 
  "Titan Prime", "Zeta Reticuli", "Omicron Persei 8", "LV-426"
];