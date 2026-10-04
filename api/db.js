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
    const { action, userId, trade, tradeId, profile, email, password, name, capital, googleProfile } = body;

    // --- AUTHENTICATION ACTIONS ---

    // A. Check if email already exists
    if (action === 'checkEmailExists') {
      const cleanEmail = (email || '').toLowerCase().trim();
      if (!cleanEmail) {
        return res.status(400).json({ error: 'Missing email parameter' });
      }
      const existing = await client.execute({
        sql: 'SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [cleanEmail]
      });
      return res.status(200).json({ exists: existing.rows.length > 0 });
    }

    // B. Register new user account
    if (action === 'registerUser') {
      const cleanEmail = (email || '').toLowerCase().trim();
      if (!cleanEmail || !password || !name) {
        return res.status(400).json({ error: 'Full name, email address, and password are required.' });
      }

      // Check if email already exists in users table
      const existing = await client.execute({
        sql: 'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [cleanEmail]
      });

      if (existing.rows.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: 'This email address is already registered on TradeMatrix. Please sign in instead.' 
        });
      }

      const newId = `usr_${Date.now()}`;
      const initialCapital = Number(capital) || 10000;
      const cleanName = String(name).trim();

      await client.batch([
        {
          sql: `INSERT INTO users (id, email, password_hash, name, avatar, capital, auth_provider)
                VALUES (?, ?, ?, ?, ?, ?, 'email')`,
          args: [newId, cleanEmail, password, cleanName, '', initialCapital]
        },
        {
          sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider)
                VALUES (?, ?, ?, ?, ?, 'email')`,
          args: [newId, cleanEmail, cleanName, '', initialCapital]
        },
        {
          sql: `INSERT INTO user_settings (user_id, initial_capital, currency)
                VALUES (?, ?, '₹')
                ON CONFLICT(user_id) DO NOTHING`,
          args: [newId, initialCapital]
        }
      ]);

      return res.status(200).json({
        success: true,
        user: {
          id: newId,
          name: cleanName,
          email: cleanEmail,
          capital: initialCapital,
          authProvider: 'email',
          createdAt: new Date().toISOString()
        }
      });
    }

    // C. User login with password
    if (action === 'loginUser') {
      const cleanEmail = (email || '').toLowerCase().trim();
      if (!cleanEmail || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const userRes = await client.execute({
        sql: 'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [cleanEmail]
      });

      if (userRes.rows.length === 0) {
        // Seamless initial claim for platform owner utkarshdhakane2@gmail.com:
        // Sets their entered password as their official permanent password and restores user session
        const adminEmail = (process.env.TURSO_ADMIN_EMAIL || process.env.VITE_NOTIFICATION_ADMIN_EMAIL || 'utkarshdhakane2@gmail.com').toLowerCase().trim();
        if (cleanEmail === adminEmail) {
          const ownerId = 'usr_1790861658261'; // Original verified owner ID
          await client.batch([
            {
              sql: `INSERT INTO users (id, email, password_hash, name, avatar, capital, auth_provider)
                    VALUES (?, ?, ?, 'Utkarsh Dhakane', '', 10000, 'email')
                    ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash`,
              args: [ownerId, cleanEmail, password]
            },
            {
              sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider)
                    VALUES (?, ?, 'Utkarsh Dhakane', '', 10000, 'email')
                    ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
              args: [ownerId, cleanEmail]
            }
          ]);

          return res.status(200).json({
            success: true,
            user: {
              id: ownerId,
              name: 'Utkarsh Dhakane',
              email: cleanEmail,
              avatar: '',
              capital: 10000,
              authProvider: 'email'
            }
          });
        }

        // Check profiles table (legacy or Google OAuth)
        const profileRes = await client.execute({
          sql: 'SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1',
          args: [cleanEmail]
        });

        if (profileRes.rows.length > 0 && profileRes.rows[0].auth_provider === 'google') {
          return res.status(400).json({
            success: false,
            error: 'This account was registered using Google. Please click "Continue with Google" to sign in.'
          });
        }

        return res.status(404).json({
          success: false,
          error: 'No account found with this email. Please switch to "Create Account" to register.'
        });
      }

      const userRow = userRes.rows[0];

      if (userRow.auth_provider === 'google') {
        return res.status(400).json({
          success: false,
          error: 'This account was registered using Google. Please click "Continue with Google" to sign in.'
        });
      }

      if (userRow.password_hash !== password) {
        return res.status(401).json({
          success: false,
          error: 'Incorrect password. Please verify your credentials and try again.'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: String(userRow.id),
          name: String(userRow.name || cleanEmail.split('@')[0]),
          email: String(userRow.email),
          avatar: String(userRow.avatar || ''),
          capital: Number(userRow.capital) || 10000,
          authProvider: String(userRow.auth_provider || 'email')
        }
      });
    }

    // D. Google OAuth user verification & sync
    if (action === 'googleAuth') {
      if (!googleProfile || !googleProfile.email) {
        return res.status(400).json({ error: 'Valid Google profile is required.' });
      }

      const googleEmail = googleProfile.email.toLowerCase().trim();
      const existingUser = await client.execute({
        sql: 'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [googleEmail]
      });

      if (existingUser.rows.length > 0) {
        const row = existingUser.rows[0];
        return res.status(200).json({
          success: true,
          isNew: false,
          user: {
            id: String(row.id),
            name: String(row.name || googleProfile.name || googleEmail.split('@')[0]),
            email: googleEmail,
            avatar: String(googleProfile.avatar || row.avatar || ''),
            capital: Number(row.capital) || 10000,
            authProvider: 'google'
          }
        });
      }

      const existingProfile = await client.execute({
        sql: 'SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1',
        args: [googleEmail]
      });

      const userId = existingProfile.rows.length > 0 
        ? String(existingProfile.rows[0].id) 
        : `usr_google_${Date.now()}`;
      const userName = googleProfile.name || googleEmail.split('@')[0];
      const userAvatar = googleProfile.avatar || '';
      const initialCapital = 10000;

      await client.batch([
        {
          sql: `INSERT INTO users (id, email, password_hash, name, avatar, capital, auth_provider)
                VALUES (?, ?, 'GOOGLE_OAUTH_VERIFIED', ?, ?, ?, 'google')
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  avatar = excluded.avatar`,
          args: [userId, googleEmail, userName, userAvatar, initialCapital]
        },
        {
          sql: `INSERT INTO profiles (id, email, name, avatar, capital, auth_provider)
                VALUES (?, ?, ?, ?, ?, 'google')
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  avatar = excluded.avatar`,
          args: [userId, googleEmail, userName, userAvatar, initialCapital]
        }
      ]);

      return res.status(200).json({
        success: true,
        isNew: existingProfile.rows.length === 0,
        user: {
          id: userId,
          name: userName,
          email: googleEmail,
          avatar: userAvatar,
          capital: initialCapital,
          authProvider: 'google'
        }
      });
    }

    // --- USER ID REQUIRED ACTIONS (Trades & Profile Sync) ---
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
