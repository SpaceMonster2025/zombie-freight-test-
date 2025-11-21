import { SavedData } from '../types';
import { INITIAL_SAVE_DATA } from '../constants';

const STORAGE_KEY = 'zombie_freight_save_v1';

export const getSavedData = (): SavedData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Merge with initial to ensure new fields exist if updated
      return { ...INITIAL_SAVE_DATA, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load save data", e);
  }
  return INITIAL_SAVE_DATA;
};

export const saveGameData = (data: SavedData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save game data", e);
  }
};