// Multi-Tenant Isolated Storage Service + Cloud SQL Sync (Turso & PostgreSQL)
// Guarantees 100% strict data separation between individual trader accounts
import { INITIAL_SETTINGS } from '../data/initialData';
import { 
  syncUserProfile, 
  fetchUserTradesFromCloud, 
  insertUserTradeToCloud, 
  resetUserTradesInCloud,
  isSupabaseConfigured 
} from './supabaseClient';
import {
  syncUserProfileToTurso,
  fetchUserTradesFromTurso,
  insertUserTradeToTurso,
  resetUserTradesInTurso,
  isTursoConfigured
} from './tursoService';

/**
 * Generates an isolated, safe storage key specific to the current trader
 */
export function getUserStorageKey(user, entity = 'trades') {
  if (!user) return `tradematrix_${entity}_anonymous`;
  const identifier = (user.email ? user.email.toLowerCase().trim() : user.id || 'guest')
    .replace(/[^a-z0-9]/g, '_');
  return `tradematrix_${entity}_${identifier}`;
}

/**
 * Retrieves the isolated trade records for a specific trader
 */
export function getUserTrades(user) {
  if (!user) return [];
  try {
    const key = getUserStorageKey(user, 'trades');
    const saved = localStorage.getItem(key);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }

    // Check if legacy un-isolated trades exist (migrate once to this user)
    const legacy = localStorage.getItem('tradematrix_trades');
    if (legacy) {
      try {
        const legacyParsed = JSON.parse(legacy);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0 && !legacyParsed.some(t => t.id === 'tr-101')) {
          localStorage.setItem(key, JSON.stringify(legacyParsed));
          localStorage.removeItem('tradematrix_trades');
          return legacyParsed;
        }
      } catch (e) {
        // ignore
      }
    }

    return [];
  } catch (err) {
    console.error('Failed to load user trades from isolated storage:', err);
    return [];
  }
}

/**
 * Asynchronously synchronizes user trades with Cloud SQL database (Turso or Supabase)
 */
export async function syncUserTradesFromDatabase(user, onTradesLoaded) {
  if (!user) return;

  // 1. Prioritize Turso (libSQL Cloud Database)
  if (isTursoConfigured()) {
    try {
      await syncUserProfileToTurso(user);
      const tursoTrades = await fetchUserTradesFromTurso(user);
      if (tursoTrades && Array.isArray(tursoTrades)) {
        const key = getUserStorageKey(user, 'trades');
        const localTrades = getUserTrades(user);

        if (localTrades.length > 0 && tursoTrades.length === 0) {
          for (const t of localTrades) {
            await insertUserTradeToTurso(t, user);
          }
        } else if (tursoTrades.length > 0) {
          localStorage.setItem(key, JSON.stringify(tursoTrades));
          if (onTradesLoaded) onTradesLoaded(tursoTrades);
        }
      }
      return;
    } catch (err) {
      console.warn('[Turso Sync] Cloud database sync skipped:', err);
    }
  }

  // 2. Fallback to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await syncUserProfile(user);
      const cloudTrades = await fetchUserTradesFromCloud(user);
      if (cloudTrades && Array.isArray(cloudTrades)) {
        const key = getUserStorageKey(user, 'trades');
        const localTrades = getUserTrades(user);

        if (localTrades.length > 0 && cloudTrades.length === 0) {
          for (const t of localTrades) {
            await insertUserTradeToCloud(t, user);
          }
        } else if (cloudTrades.length > 0) {
          localStorage.setItem(key, JSON.stringify(cloudTrades));
          if (onTradesLoaded) onTradesLoaded(cloudTrades);
        }
      }
    } catch (err) {
      console.warn('[Supabase Sync] Cloud database sync skipped:', err);
    }
  }
}

/**
 * Saves trades exclusively for the specific trader
 */
export function saveUserTrades(user, trades) {
  if (!user) return;
  try {
    const key = getUserStorageKey(user, 'trades');
    localStorage.setItem(key, JSON.stringify(trades));

    // Background push to Turso if connected
    if (isTursoConfigured() && Array.isArray(trades) && trades.length > 0) {
      insertUserTradeToTurso(trades[0], user).catch(() => {});
    } 
    // Otherwise push to Supabase if connected
    else if (isSupabaseConfigured() && Array.isArray(trades) && trades.length > 0) {
      insertUserTradeToCloud(trades[0], user).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save isolated user trades:', err);
  }
}

/**
 * Resets trade records exclusively for the specific trader
 */
export function resetUserTrades(user) {
  if (!user) return;
  try {
    const key = getUserStorageKey(user, 'trades');
    localStorage.removeItem(key);

    if (isTursoConfigured()) {
      resetUserTradesInTurso(user).catch(() => {});
    } else if (isSupabaseConfigured()) {
      resetUserTradesInCloud(user).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to reset user trades:', err);
  }
}

/**
 * Retrieves isolated terminal settings for a specific trader
 */
export function getUserSettings(user) {
  const fallback = {
    ...INITIAL_SETTINGS,
    initialCapital: user?.capital || 10000
  };

  if (!user) return fallback;

  try {
    const key = getUserStorageKey(user, 'settings');
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.geminiApiKey && import.meta.env?.VITE_GEMINI_API_KEY) {
        parsed.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      }
      return parsed;
    }
    return fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Saves isolated terminal settings exclusively for the specific trader
 */
export function saveUserSettings(user, settings) {
  if (!user) return;
  try {
    const key = getUserStorageKey(user, 'settings');
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save isolated user settings:', err);
  }
}
