// Turso (libSQL / SQLite) Cloud Database Service
import { createClient } from '@libsql/client/web';

const rawTursoUrl = import.meta.env?.VITE_TURSO_DATABASE_URL || 'libsql://trad-badtobiop.aws-ap-south-1.turso.io';
const tursoAuthToken = import.meta.env?.VITE_TURSO_AUTH_TOKEN || '';

// Format URL for web client (converts libsql:// to https://)
export const formatTursoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('libsql://')) {
    return url.replace('libsql://', 'https://');
  }
  return url;
};

export const tursoUrl = formatTursoUrl(rawTursoUrl);

export const isTursoConfigured = () => {
  return Boolean(tursoUrl && tursoAuthToken && tursoAuthToken.trim().length > 10);
};

let tursoClient = null;
let tablesInitialized = false;

export function getTursoClient() {
  if (!isTursoConfigured()) return null;
  if (!tursoClient) {
    try {
      tursoClient = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken.trim()
      });
    } catch (err) {
      console.warn('[Turso] Failed to initialize client:', err);
      return null;
    }
  }
  return tursoClient;
}

/**
 * Automatically creates all required tables on first connection
 */
export async function ensureTursoTables() {
  const client = getTursoClient();
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
    console.log('[Turso] Database tables initialized successfully.');
  } catch (err) {
    console.warn('[Turso] Auto-table initialization warning:', err.message);
  }
}

/**
 * Sync user profile to Turso database
 */
export async function syncUserProfileToTurso(user) {
  const client = getTursoClient();
  if (!client || !user) return null;

  try {
    await ensureTursoTables();
    const id = user.id || user.email;
    const email = (user.email || '').toLowerCase().trim();
    const name = user.name || 'Trader';
    const avatar = user.avatar || '';
    const capital = Number(user.capital) || 10000;
    const authProvider = user.authProvider || 'email';

    await client.execute({
      sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              capital = excluded.capital,
              avatar = excluded.avatar,
              updated_at = CURRENT_TIMESTAMP`,
      args: [id, email, name, avatar, capital, authProvider]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error syncing user profile:', err);
    return false;
  }
}

/**
 * Fetch trades exclusively for the active user from Turso
 */
export async function fetchUserTradesFromTurso(user) {
  const client = getTursoClient();
  if (!client || !user) return null;

  try {
    await ensureTursoTables();
    const userId = user.id || user.email;
    const res = await client.execute({
      sql: `SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, created_at DESC`,
      args: [userId]
    });

    return (res.rows || []).map(row => ({
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
      notes: String(row.notes || ''),
      screenshot: row.screenshot ? String(row.screenshot) : null,
      emotion: String(row.emotion || 'neutral')
    }));
  } catch (err) {
    console.warn('[Turso] Error fetching trades:', err);
    return null;
  }
}

/**
 * Insert or update trade for a user in Turso
 */
export async function insertUserTradeToTurso(trade, user) {
  const client = getTursoClient();
  if (!client || !user || !trade) return false;

  try {
    await ensureTursoTables();
    const userId = user.id || user.email;

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
        trade.notes || '',
        trade.screenshot || null,
        trade.emotion || 'neutral'
      ]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error inserting trade:', err);
    return false;
  }
}

/**
 * Delete a trade from Turso
 */
export async function deleteUserTradeFromTurso(tradeId, user) {
  const client = getTursoClient();
  if (!client || !user || !tradeId) return false;

  try {
    const userId = user.id || user.email;
    await client.execute({
      sql: `DELETE FROM trades WHERE id = ? AND user_id = ?`,
      args: [tradeId, userId]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error deleting trade:', err);
    return false;
  }
}

/**
 * Reset all trades for a user in Turso
 */
export async function resetUserTradesInTurso(user) {
  const client = getTursoClient();
  if (!client || !user) return false;

  try {
    const userId = user.id || user.email;
    await client.execute({
      sql: `DELETE FROM trades WHERE user_id = ?`,
      args: [userId]
    });
    return true;
  } catch (err) {
    console.warn('[Turso] Error resetting trades in Turso:', err);
    return false;
  }
}
