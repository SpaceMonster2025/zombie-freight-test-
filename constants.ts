import { SavedData } from './types';

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