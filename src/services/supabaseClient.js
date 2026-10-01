// Supabase PostgreSQL Client & Cloud SQL Service
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sync user profile to SQL database
 */
export async function syncUserProfile(user) {
  if (!isSupabaseConfigured() || !supabase || !user) return null;
  try {
    const payload = {
      id: user.id || user.email,
      email: user.email.toLowerCase().trim(),
      name: user.name || 'Trader',
      avatar: user.avatar || '',
      capital: Number(user.capital) || 10000,
      auth_provider: user.authProvider || 'email',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase SQL] Error syncing profile:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase SQL] Failed to sync profile:', err);
    return null;
  }
}

/**
 * Fetch all trades for the active user from PostgreSQL SQL database
 */
export async function fetchUserTradesFromCloud(user) {
  if (!isSupabaseConfigured() || !supabase || !user) return null;
  try {
    const userId = user.id || user.email;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.warn('[Supabase SQL] Error fetching trades:', error.message);
      return null;
    }

    // Map database snake_case columns back to camelCase frontend schema
    return (data || []).map(row => ({
      id: row.id,
      date: row.date,
      time: row.time,
      asset: row.asset,
      type: row.type,
      entryPrice: Number(row.entry_price),
      exitPrice: row.exit_price ? Number(row.exit_price) : null,
      stopLoss: row.stop_loss ? Number(row.stop_loss) : null,
      takeProfit: row.take_profit ? Number(row.take_profit) : null,
      lotSize: Number(row.lot_size) || 1.0,
      pnl: Number(row.pnl) || 0,
      riskRewardRatio: row.risk_reward_ratio ? Number(row.risk_reward_ratio) : null,
      strategy: row.strategy || '',
      session: row.session || '',
      rulesFollowed: Boolean(row.rules_followed),
      notes: row.notes || '',
      screenshot: row.screenshot || null,
      emotion: row.emotion || 'neutral'
    }));
  } catch (err) {
    console.warn('[Supabase SQL] Network error fetching trades:', err);
    return null;
  }
}

/**
 * Insert or update a trade record in PostgreSQL SQL database
 */
export async function insertUserTradeToCloud(trade, user) {
  if (!isSupabaseConfigured() || !supabase || !user || !trade) return false;
  try {
    const userId = user.id || user.email;
    const payload = {
      id: trade.id,
      user_id: userId,
      date: trade.date,
      time: trade.time || '',
      asset: trade.asset,
      type: trade.type,
      entry_price: Number(trade.entryPrice) || 0,
      exit_price: trade.exitPrice !== null && trade.exitPrice !== undefined ? Number(trade.exitPrice) : null,
      stop_loss: trade.stopLoss !== null && trade.stopLoss !== undefined ? Number(trade.stopLoss) : null,
      take_profit: trade.takeProfit !== null && trade.takeProfit !== undefined ? Number(trade.takeProfit) : null,
      lot_size: Number(trade.lotSize) || 1.0,
      pnl: Number(trade.pnl) || 0,
      risk_reward_ratio: trade.riskRewardRatio ? Number(trade.riskRewardRatio) : null,
      strategy: trade.strategy || '',
      session: trade.session || '',
      rules_followed: trade.rulesFollowed ?? true,
      notes: trade.notes || '',
      screenshot: trade.screenshot || null,
      emotion: trade.emotion || 'neutral'
    };

    const { error } = await supabase
      .from('trades')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase SQL] Error inserting trade:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase SQL] Network error saving trade:', err);
    return false;
  }
}

/**
 * Delete a trade record from PostgreSQL SQL database
 */
export async function deleteUserTradeFromCloud(tradeId, user) {
  if (!isSupabaseConfigured() || !supabase || !user || !tradeId) return false;
  try {
    const userId = user.id || user.email;
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId)
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase SQL] Error deleting trade:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase SQL] Network error deleting trade:', err);
    return false;
  }
}

/**
 * Reset all trades for a user in PostgreSQL SQL database
 */
export async function resetUserTradesInCloud(user) {
  if (!isSupabaseConfigured() || !supabase || !user) return false;
  try {
    const userId = user.id || user.email;
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.warn('[Supabase SQL] Error resetting user trades:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase SQL] Network error resetting trades:', err);
    return false;
  }
}
