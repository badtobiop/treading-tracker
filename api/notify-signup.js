import nodemailer from 'nodemailer';

/**
 * Serverless function for Vercel / Netlify / Production email dispatch
 */
export default async function handler(req, res) {
  // Set CORS headers
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
    const adminEmail = process.env.VITE_NOTIFICATION_ADMIN_EMAIL || process.env.GMAIL_USER || 'utkarshdhakane2@gmail.com';
    const gmailUser = process.env.GMAIL_USER || process.env.VITE_NOTIFICATION_ADMIN_EMAIL || 'utkarshdhakane2@gmail.com';
    const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.VITE_GMAIL_APP_PASSWORD;

    if (!gmailPassword) {
      console.warn('[Serverless Email] GMAIL_APP_PASSWORD environment variable not set.');
      return res.status(200).json({ success: true, message: 'Signup logged. Awaiting GMAIL_APP_PASSWORD.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword.trim().replace(/\s+/g, '')
      }
    });

    const mailOptions = {
      from: `"TradeMatrix AI Terminal" <${gmailUser}>`,
      to: adminEmail,
      subject: `🚀 New Trader Registered: ${data.newUser?.name || 'Trader'} (${data.newUser?.email || 'N/A'})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #17040a; color: #fff1f2; padding: 28px; border-radius: 14px; border: 1px solid #f43f5e; max-width: 520px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="border-bottom: 1px solid rgba(244, 114, 182, 0.25); padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #f43f5e; margin: 0; font-size: 20px; letter-spacing: -0.02em;">TradeMatrix AI — New Registration</h2>
            <span style="font-size: 13px; color: #fda4af;">A new trader just created an account on your platform!</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 9px 0; color: #fbcfe8; width: 40%;"><strong>Full Name:</strong></td>
              <td style="padding: 9px 0; color: #ffffff; font-weight: 600;">${data.newUser?.name || 'Institutional Trader'}</td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #fbcfe8;"><strong>Gmail Address:</strong></td>
              <td style="padding: 9px 0; color: #38bdf8; font-family: monospace;">${data.newUser?.email || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #fbcfe8;"><strong>Starting Capital:</strong></td>
              <td style="padding: 9px 0; color: #10b981; font-weight: bold; font-size: 15px;">₹${Number(data.newUser?.initialCapital || 10000).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #fbcfe8;"><strong>Date & Time:</strong></td>
              <td style="padding: 9px 0; color: #e2e8f0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>

          <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 114, 182, 0.25); padding: 14px; border-radius: 10px; font-size: 13px; color: #fbcfe8; line-height: 1.5;">
            ✨ <em>Direct Notification dispatched to <strong>${adminEmail}</strong></em>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Serverless Email] Notification email sent to ${adminEmail}!`);
    return res.status(200).json({ success: true, message: `Email sent to ${adminEmail}` });
  } catch (err) {
    console.error('[Serverless Email Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
