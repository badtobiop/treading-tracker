import nodemailer from 'nodemailer';

/**
 * Serverless function for Vercel: Dispatches trader support messages directly to admin Gmail
 */
export default async function handler(req, res) {
  // CORS configuration
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

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { name, email, subject, message, userCapital, currency } = data;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const adminEmail = process.env.VITE_NOTIFICATION_ADMIN_EMAIL || process.env.GMAIL_USER || 'utkarshdhakane2@gmail.com';
    const gmailUser = process.env.GMAIL_USER || 'utkarshdhakane2@gmail.com';
    const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD;

    if (!gmailPassword) {
      console.warn('[Support Email] GMAIL_APP_PASSWORD not set.');
      return res.status(200).json({ 
        success: true, 
        message: 'Message logged. Add GMAIL_APP_PASSWORD in environment to dispatch live emails.' 
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword.trim().replace(/\s+/g, '')
      }
    });

    const senderName = name || 'Trader';
    const senderEmail = email || 'No email provided';
    const topic = subject || 'General Trader Support';
    const capitalStr = userCapital ? `${currency || '₹'}${Number(userCapital).toLocaleString('en-IN')}` : 'N/A';
    const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const mailOptions = {
      from: `"TradeMatrix Support Terminal" <${gmailUser}>`,
      to: adminEmail,
      replyTo: senderEmail !== 'No email provided' ? senderEmail : adminEmail,
      subject: `📩 New Trader Support: ${topic} from ${senderName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #38bdf8; max-width: 580px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); margin: 0 auto;">
          
          {/* Header */}
          <div style="border-bottom: 1px solid rgba(56, 189, 248, 0.25); padding-bottom: 18px; margin-bottom: 22px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px;">💬</span>
              <h2 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                New Trader Support Message
              </h2>
            </div>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">
              A trader sent you a direct message from the TradeMatrix Terminal.
            </p>
          </div>

          {/* Trader Info Details Table */}
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 7px 0; color: #94a3b8; width: 38%;"><strong>Trader Name:</strong></td>
                <td style="padding: 7px 0; color: #ffffff; font-weight: 600;">${senderName}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #94a3b8;"><strong>Trader Email / ID:</strong></td>
                <td style="padding: 7px 0; color: #38bdf8; font-family: monospace; font-size: 13px;">${senderEmail}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #94a3b8;"><strong>Topic / Category:</strong></td>
                <td style="padding: 7px 0; color: #f43f5e; font-weight: 600;">${topic}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #94a3b8;"><strong>Account Capital:</strong></td>
                <td style="padding: 7px 0; color: #10b981; font-weight: bold;">${capitalStr}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #94a3b8;"><strong>Time (IST):</strong></td>
                <td style="padding: 7px 0; color: #cbd5e1; font-size: 13px;">${timestampStr}</td>
              </tr>
            </table>
          </div>

          {/* User Message Card */}
          <div style="margin-bottom: 24px;">
            <label style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">
              Trader's Message:
            </label>
            <div style="background: #1e293b; border: 1px solid rgba(56, 189, 248, 0.3); border-left: 4px solid #38bdf8; padding: 16px 18px; border-radius: 8px; font-size: 15px; color: #f1f5f9; line-height: 1.6; white-space: pre-wrap; font-family: inherit;">
${message}
            </div>
          </div>

          {/* Quick Reply Note */}
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 14px; border-radius: 10px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
            👉 <strong>Direct Reply:</strong> Click <em>Reply</em> in your Gmail app to reply directly to <strong>${senderEmail}</strong>.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Support Email] Support message successfully delivered to ${adminEmail}!`);
    return res.status(200).json({ success: true, message: `Support message dispatched to ${adminEmail}` });
  } catch (err) {
    console.error('[Support Email Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
