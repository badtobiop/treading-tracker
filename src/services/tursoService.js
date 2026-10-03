// Turso (libSQL / SQLite) Cloud Database Service
// Security Architecture: Uses Secure Backend Proxy (/api/db) to protect tokens from client exposure
import { createClient } from '@libsql/client/web';

const rawTursoUrl = import.meta.env?.VITE_TURSO_DATABASE_URL || 'libsql://trad-badtobiop.aws-ap-south-1.turso.io';
const tursoAuthToken = import.meta.env?.VITE_TURSO_AUTH_TOKEN || '';

export const formatTursoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('libsql://')) {
    return url.replace('libsql://', 'https://');
  }
  return url;
};

export const tursoUrl = formatTursoUrl(rawTursoUrl);

export const isTursoConfigured = () => {
  // Always true if URL is set or server proxy is available
  return Boolean(tursoUrl || tursoAuthToken);
};

let tursoClient = null;
let tablesInitialized = false;

function getDirectClient() {
  if (!tursoAuthToken || tursoAuthToken.trim().length < 10) return null;
  if (!tursoClient) {
    try {
      tursoClient = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken.trim()
      });
    } catch (err) {
      console.warn('[Turso] Direct client init failed:', err);
      return null;
    }
  }
  return tursoClient;
}

/**
 * Ensures tables exist in database
 */
export async function ensureTursoTables() {
  const client = getDirectClient();
  if (!client || tablesInitialized) return;

  try {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar TEXT,
        capital REAL DEFAULT 10000,
        auth_provider TEXT DEFAULT 'email',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        asset TEXT NOT NULL,
        type TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL,
        stop_loss REAL,
        take_profit REAL,
        lot_size REAL DEFAULT 1.0,
        pnl REAL DEFAULT 0,
        risk_reward_ratio REAL,
        strategy TEXT,
        session TEXT,
        rules_followed INTEGER DEFAULT 1,
        notes TEXT,
        screenshot TEXT,
        emotion TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        initial_capital REAL DEFAULT 10000,
        currency TEXT DEFAULT '₹',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`
    ]);
    tablesInitialized = true;
  } catch (err) {
    console.warn('[Turso] Table init notice:', err.message);
  }
}

/**
 * Sync user profile to Turso database via Secure Proxy
 */
export async function syncUserProfileToTurso(user) {
  if (!user) return false;
  const userId = user.id || user.email;

  // 1. Try secure backend proxy /api/db first
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncProfile',
        userId,
        profile: {
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          capital: user.capital,
          authProvider: user.authProvider
        }
      })
    });
    if (res.ok) return true;
  } catch (e) {
    // Fall back to direct client if proxy is not serving locally
  }

  // 2. Direct client fallback
  const client = getDirectClient();
  if (!client) return false;

  try {
    await ensureTursoTables();
    await client.execute({
      sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              capital = excluded.capital,
              avatar = excluded.avatar,
              updated_at = CURRENT_TIMESTAMP`,
      args: [userId, (user.email || '').toLowerCase().trim(), user.name || 'Trader', user.avatar || '', Number(user.capital) || 10000, user.authProvider || 'email']
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Profile sync notice:', err);
    return false;
  }
}

/**
 * Fetch trades exclusively for the active user via Secure Proxy
 */
export async function fetchUserTradesFromTurso(user) {
  if (!user) return null;
  const userId = user.id || user.email;

  // 1. Try secure backend proxy /api/db first
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetchTrades', userId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.trades)) {
        return data.trades;
      }
    }
  } catch (e) {
    // Fall back to direct client if proxy is not serving locally
  }

  // 2. Direct client fallback
  const client = getDirectClient();
  if (!client) return null;

  try {
    await ensureTursoTables();
    const res = await client.execute({
      sql: `SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, created_at DESC`,
      args: [userId]
    });

    return (res.rows || []).map(row => {
      let rawNotes = String(row.notes || '');
      let parsedMistake = '';
      let parsedLesson = '';
      if (rawNotes.includes('[GALTI / MISTAKE]:')) {
        const parts = rawNotes.split('[GALTI / MISTAKE]:');
        rawNotes = parts[0].trim();
        const subParts = (parts[1] || '').split('[LESSON]:');
        parsedMistake = (subParts[0] || '').trim();
        if (subParts[1]) parsedLesson = subParts[1].trim();
      }

      return {
        id: String(row.id),
        date: String(row.date),
        time: String(row.time || ''),
        asset: String(row.asset),
        type: String(row.type),
        entryPrice: Number(row.entry_price),
        exitPrice: row.exit_price !== null ? Number(row.exit_price) : null,
        stopLoss: row.stop_loss !== null ? Number(row.stop_loss) : null,
        takeProfit: row.take_profit !== null ? Number(row.take_profit) : null,
        lotSize: Number(row.lot_size) || 1.0,
        pnl: Number(row.pnl) || 0,
        riskRewardRatio: row.risk_reward_ratio !== null ? Number(row.risk_reward_ratio) : null,
        strategy: String(row.strategy || ''),
        session: String(row.session || ''),
        rulesFollowed: Boolean(row.rules_followed),
        notes: rawNotes,
        mistakeNote: String(row.mistake_note || parsedMistake || ''),
        lessonLearned: String(row.lesson_learned || parsedLesson || ''),
        screenshot: row.screenshot ? String(row.screenshot) : null,
        emotion: String(row.emotion || 'neutral')
      };
    });
  } catch (err) {
    console.warn('[Turso] Fetch notice:', err);
    return null;
  }
}

/**
 * Insert or update trade for a user via Secure Proxy
 */
export async function insertUserTradeToTurso(trade, user) {
  if (!trade || !user) return false;
  const userId = user.id || user.email;

  // 1. Try secure backend proxy /api/db first
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveTrade', userId, trade })
    });
    if (res.ok) return true;
  } catch (e) {
    // Fall back to direct client
  }

  // 2. Direct client fallback
  const client = getDirectClient();
  if (!client) return false;

  try {
    let serializedNotes = trade.notes || '';
    if (trade.mistakeNote && !serializedNotes.includes('[GALTI / MISTAKE]:')) {
      serializedNotes = serializedNotes 
        ? `${serializedNotes}\n\n[GALTI / MISTAKE]: ${trade.mistakeNote}` 
        : `[GALTI / MISTAKE]: ${trade.mistakeNote}`;
    }
    if (trade.lessonLearned && !serializedNotes.includes('[LESSON]:')) {
      serializedNotes = `${serializedNotes}\n[LESSON]: ${trade.lessonLearned}`;
    }

    await client.execute({
      sql: `INSERT INTO trades (
              id, user_id, date, time, asset, type, 
              entry_price, exit_price, stop_loss, take_profit, 
              lot_size, pnl, risk_reward_ratio, strategy, session, 
              rules_followed, notes, screenshot, emotion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              date = excluded.date,
              time = excluded.time,
              asset = excluded.asset,
              type = excluded.type,
              entry_price = excluded.entry_price,
              exit_price = excluded.exit_price,
              stop_loss = excluded.stop_loss,
              take_profit = excluded.take_profit,
              lot_size = excluded.lot_size,
              pnl = excluded.pnl,
              risk_reward_ratio = excluded.risk_reward_ratio,
              strategy = excluded.strategy,
              session = excluded.session,
              rules_followed = excluded.rules_followed,
              notes = excluded.notes,
              screenshot = excluded.screenshot,
              emotion = excluded.emotion`,
      args: [
        trade.id,
        userId,
        trade.date,
        trade.time || '',
        trade.asset,
        trade.type,
        Number(trade.entryPrice) || 0,
        trade.exitPrice !== null && trade.exitPrice !== undefined ? Number(trade.exitPrice) : null,
        trade.stopLoss !== null && trade.stopLoss !== undefined ? Number(trade.stopLoss) : null,
        trade.takeProfit !== null && trade.takeProfit !== undefined ? Number(trade.takeProfit) : null,
        Number(trade.lotSize) || 1.0,
        Number(trade.pnl) || 0,
        trade.riskRewardRatio !== null && trade.riskRewardRatio !== undefined ? Number(trade.riskRewardRatio) : null,
        trade.strategy || '',
        trade.session || '',
        trade.rulesFollowed ? 1 : 0,
        serializedNotes,
        trade.screenshot || null,
        trade.emotion || 'neutral'
      ]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Insert notice:', err);
    return false;
  }
}

/**
 * Delete a trade from Turso via Secure Proxy
 */
export async function deleteUserTradeFromTurso(tradeId, user) {
  if (!tradeId || !user) return false;
  const userId = user.id || user.email;

  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteTrade', userId, tradeId })
    });
    if (res.ok) return true;
  } catch (e) {
    // Fall back to direct client
  }

  const client = getDirectClient();
  if (!client) return false;

  try {
    await client.execute({
      sql: `DELETE FROM trades WHERE id = ? AND user_id = ?`,
      args: [tradeId, userId]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Delete notice:', err);
    return false;
  }
}

/**
 * Reset all trades for a user in Turso via Secure Proxy
 */
export async function resetUserTradesInTurso(user) {
  if (!user) return false;
  const userId = user.id || user.email;

  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetTrades', userId })
    });
    if (res.ok) return true;
  } catch (e) {
    // Fall back to direct client
  }

  const client = getDirectClient();
  if (!client) return false;

  try {
    await client.execute({
      sql: `DELETE FROM trades WHERE user_id = ?`,
      args: [userId]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Reset notice:', err);
    return false;
  }
}
