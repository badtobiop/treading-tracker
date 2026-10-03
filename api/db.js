import { createClient } from '@libsql/client';

let tursoClient = null;

function getClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || 'libsql://trad-badtobiop.aws-ap-south-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

  if (!authToken) {
    return null;
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url: url.trim(),
      authToken: authToken.trim()
    });
  }
  return tursoClient;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const client = getClient();
  if (!client) {
    return res.status(503).json({ error: 'Database credentials not configured on server.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action, userId, trade, tradeId, profile } = body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing required userId parameter' });
    }

    // Sanitize userId (avoid any weird injection)
    const sanitizedUserId = userId.trim();

    // 1. Fetch user trades
    if (action === 'fetchTrades') {
      const result = await client.execute({
        sql: 'SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 500',
        args: [sanitizedUserId]
      });

      const trades = (result.rows || []).map(row => {
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

      return res.status(200).json({ success: true, trades });
    }

    // 2. Save trade
    if (action === 'saveTrade') {
      if (!trade || !trade.id) {
        return res.status(400).json({ error: 'Invalid trade data' });
      }

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
          sanitizedUserId,
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

      return res.status(200).json({ success: true, message: 'Trade saved securely' });
    }

    // 3. Delete trade
    if (action === 'deleteTrade') {
      if (!tradeId) {
        return res.status(400).json({ error: 'Missing tradeId parameter' });
      }

      await client.execute({
        sql: 'DELETE FROM trades WHERE id = ? AND user_id = ?',
        args: [tradeId, sanitizedUserId]
      });

      return res.status(200).json({ success: true, message: 'Trade deleted' });
    }

    // 4. Reset trades
    if (action === 'resetTrades') {
      await client.execute({
        sql: 'DELETE FROM trades WHERE user_id = ?',
        args: [sanitizedUserId]
      });

      return res.status(200).json({ success: true, message: 'User trades reset' });
    }

    // 5. Sync profile
    if (action === 'syncProfile') {
      if (!profile) return res.status(400).json({ error: 'Missing profile' });
      await client.execute({
        sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                capital = excluded.capital,
                avatar = excluded.avatar,
                updated_at = CURRENT_TIMESTAMP`,
        args: [
          sanitizedUserId,
          (profile.email || '').toLowerCase().trim(),
          profile.name || 'Trader',
          profile.avatar || '',
          Number(profile.capital) || 10000,
          profile.authProvider || 'email'
        ]
      });

      return res.status(200).json({ success: true, message: 'Profile synced' });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[Server DB API Error]:', err);
    return res.status(500).json({ error: 'Database operation failed securely.' });
  }
}
