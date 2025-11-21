export enum GameScreen {
  MENU = 'MENU',
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
  SUCCESS = 'SUCCESS'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INSANE = 'INSANE'
}

export interface SavedData {
  credits: number;
  highScoreZombies: number;
  totalDeliveries: number;
  upgrades: {
    cloning: number; // Level 1-5
    hull: number;    // Level 1-5
    fuel: number;    // Level 1-5
  };
}

export interface GameRunStats {
  zombiesDelivered: number;
  distanceTraveled: number;
  multiplier: number;
  reason?: string;
}

export enum ObjectType {
  ASTEROID = 'ASTEROID',
  FUEL = 'FUEL',
  REPAIR = 'REPAIR',
  BOOST = 'BOOST',
  PLANET = 'PLANET'
}

export interface GameObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  value?: number; // Amount of fuel/repair/multiplier
  label?: string; // For planets
  isDying?: boolean;
  flashTime?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}