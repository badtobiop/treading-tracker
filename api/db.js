import { createClient } from '@libsql/client';
import nodemailer from 'nodemailer';

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

      const userPrefix = googleEmail.split('@')[0];
      const capitalizedPrefix = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
      const userName = (googleProfile.name && googleProfile.name.trim()) 
        ? googleProfile.name.trim() 
        : capitalizedPrefix;

      if (existingUser.rows.length > 0) {
        const row = existingUser.rows[0];
        return res.status(200).json({
          success: true,
          isNew: false,
          user: {
            id: String(row.id),
            name: String(row.name || userName),
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

    // E. Send Password Reset OTP via Email
    if (action === 'sendPasswordResetOtp') {
      const cleanEmail = (email || '').toLowerCase().trim();
      if (!cleanEmail) {
        return res.status(400).json({ success: false, error: 'Please enter your registered email address.' });
      }

      // Check if user exists in database
      const userRes = await client.execute({
        sql: 'SELECT id, name, email, auth_provider FROM users WHERE LOWER(email) = ? LIMIT 1',
        args: [cleanEmail]
      });

      let foundUser = userRes.rows.length > 0 ? userRes.rows[0] : null;

      if (!foundUser) {
        // Also check profiles table
        const profileRes = await client.execute({
          sql: 'SELECT id, name, email, auth_provider FROM profiles WHERE LOWER(email) = ? LIMIT 1',
          args: [cleanEmail]
        });

        if (profileRes.rows.length > 0) {
          foundUser = profileRes.rows[0];
        }
      }

      if (!foundUser) {
        return res.status(404).json({
          success: false,
          error: 'No account registered with this email address. Please check your spelling or register a new account.'
        });
      }

      if (foundUser.auth_provider === 'google') {
        return res.status(400).json({
          success: false,
          error: 'This account was registered using Google. Please sign in using "Continue with Google".'
        });
      }

      // Ensure password_resets table exists
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS password_resets (
          email TEXT PRIMARY KEY,
          otp TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
        args: []
      });

      // Generate 6-digit numeric OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      // Save or update OTP in password_resets table
      await client.execute({
        sql: `INSERT INTO password_resets (email, otp, expires_at)
              VALUES (?, ?, ?)
              ON CONFLICT(email) DO UPDATE SET otp = excluded.otp, expires_at = excluded.expires_at, created_at = CURRENT_TIMESTAMP`,
        args: [cleanEmail, otp, expiresAt]
      });

      // Send OTP via Nodemailer
      const gmailUser = process.env.GMAIL_USER || process.env.VITE_NOTIFICATION_ADMIN_EMAIL || 'utkarshdhakane2@gmail.com';
      const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD;

      if (!gmailPassword) {
        console.warn('[Password Reset] GMAIL_APP_PASSWORD not set.');
        return res.status(200).json({
          success: true,
          message: `Verification code generated. Code: ${otp}`,
          otp
        });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPassword.trim().replace(/\s+/g, '')
        }
      });

      const recipientName = foundUser.name || cleanEmail.split('@')[0];

      const mailOptions = {
        from: `"TradeMatrix Security" <${gmailUser}>`,
        to: cleanEmail,
        subject: `🔐 ${otp} is your TradeMatrix verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #140711; color: #fff1f2; padding: 32px; border-radius: 16px; border: 1px solid rgba(244, 63, 94, 0.35); max-width: 520px; margin: 0 auto; box-shadow: 0 16px 40px rgba(0,0,0,0.85);">
            <div style="border-bottom: 1px solid rgba(254, 205, 211, 0.12); padding-bottom: 18px; margin-bottom: 22px; text-align: center;">
              <h2 style="color: #f43f5e; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">TradeMatrix AI</h2>
              <span style="font-size: 13px; color: #fda4af;">Password Reset Verification</span>
            </div>

            <p style="font-size: 15px; color: #fbcfe8; line-height: 1.6; margin: 0 0 16px 0;">
              Hello <strong>${recipientName}</strong>,
            </p>
            <p style="font-size: 14px; color: #e2e8f0; line-height: 1.6; margin: 0 0 24px 0;">
              We received a request to reset the password for your TradeMatrix AI terminal account. Use the verification code below to set your new password:
            </p>

            <div style="background: linear-gradient(145deg, #220d1f, #150613); border: 1px solid rgba(244, 114, 182, 0.35); border-radius: 12px; padding: 22px; text-align: center; margin: 0 0 24px 0; box-shadow: inset 2px 2px 8px rgba(0,0,0,0.7);">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #fda4af; margin-bottom: 8px; font-weight: 700;">Your 6-Digit Verification Code</div>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 0.28em; color: #ffffff; text-shadow: 0 0 16px rgba(244, 63, 94, 0.7);">
                ${otp}
              </div>
            </div>

            <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 114, 182, 0.2); padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #fda4af; margin-bottom: 24px;">
              ⏱ <strong>Note:</strong> This verification code expires in <strong>10 minutes</strong>. Never share this code with anyone.
            </div>

            <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
              If you did not request a password reset, please ignore this email. Your account remains secure.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Password Reset] OTP email successfully dispatched to ${cleanEmail}`);

      return res.status(200).json({
        success: true,
        message: 'A 6-digit verification code has been dispatched to your email address.'
      });
    }

    // F. Verify OTP and Update Password
    if (action === 'verifyOtpAndResetPassword') {
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanOtp = String(body.otp || '').trim();
      const newPassword = String(body.newPassword || '').trim();

      if (!cleanEmail || !cleanOtp || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email address, OTP verification code, and new password are required.'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Your new password must be at least 6 characters long.'
        });
      }

      // Check OTP in password_resets table
      const resetRes = await client.execute({
        sql: 'SELECT * FROM password_resets WHERE LOWER(email) = ? LIMIT 1',
        args: [cleanEmail]
      });

      if (resetRes.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No active OTP request found for this email. Please request a new verification code.'
        });
      }

      const resetRow = resetRes.rows[0];
      const now = Date.now();

      if (now > Number(resetRow.expires_at)) {
        await client.execute({
          sql: 'DELETE FROM password_resets WHERE LOWER(email) = ?',
          args: [cleanEmail]
        });
        return res.status(400).json({
          success: false,
          error: 'The verification code has expired (valid for 10 minutes). Please request a new code.'
        });
      }

      if (String(resetRow.otp).trim() !== cleanOtp) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect OTP verification code. Please check your email and try again.'
        });
      }

      // OTP is verified! Update password in users table
      const updateRes = await client.execute({
        sql: 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = ?',
        args: [newPassword, cleanEmail]
      });

      // If user row wasn't in users table yet (e.g. legacy profile), insert into users
      if (updateRes.rowsAffected === 0) {
        const profileRes = await client.execute({
          sql: 'SELECT * FROM profiles WHERE LOWER(email) = ? LIMIT 1',
          args: [cleanEmail]
        });

        if (profileRes.rows.length > 0) {
          const prof = profileRes.rows[0];
          await client.execute({
            sql: `INSERT INTO users (id, email, password_hash, name, avatar, capital, auth_provider)
                  VALUES (?, ?, ?, ?, ?, ?, 'email')`,
            args: [prof.id, cleanEmail, newPassword, prof.name || cleanEmail.split('@')[0], prof.avatar || '', prof.capital || 10000]
          });
        }
      }

      // Delete consumed OTP
      await client.execute({
        sql: 'DELETE FROM password_resets WHERE LOWER(email) = ?',
        args: [cleanEmail]
      });

      console.log(`[Password Reset] Password successfully updated for ${cleanEmail}`);

      return res.status(200).json({
        success: true,
        message: 'Password successfully updated! You can now sign in with your new password.'
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
