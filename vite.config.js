import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import nodemailer from 'nodemailer'

/**
 * Custom Vite plugin to handle new registration email alerts via Gmail / Nodemailer
 */
function emailNotificationPlugin(env) {
  return {
    name: 'email-notification-plugin',
    configureServer(server) {
      server.middlewares.use('/api/notify-signup', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const adminEmail = env.VITE_NOTIFICATION_ADMIN_EMAIL || env.GMAIL_USER || 'utkarshdhakane2@gmail.com';
            const gmailUser = env.GMAIL_USER || env.VITE_NOTIFICATION_ADMIN_EMAIL || 'utkarshdhakane2@gmail.com';
            const gmailPassword = env.GMAIL_APP_PASSWORD || env.VITE_GMAIL_APP_PASSWORD;

            console.log(`[Email Server] Registration notification triggered for user: ${data.newUser?.email || 'N/A'}`);

            if (gmailPassword && gmailPassword.trim()) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: gmailUser,
                  pass: gmailPassword.trim().replace(/\s+/g, '') // strip any accidental whitespace
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
                      ✨ <em>Direct Notification sent to <strong>${adminEmail}</strong></em>
                    </div>
                  </div>
                `
              };

              await transporter.sendMail(mailOptions);
              console.log(`[Email Server] Notification email successfully sent to: ${adminEmail}!`);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: `Email sent to ${adminEmail}` }));
              return;
            }

            console.info(`[Email Server] Logged signup. Add GMAIL_APP_PASSWORD in .env to dispatch live emails to ${adminEmail}`);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, message: 'Signup logged. Awaiting GMAIL_APP_PASSWORD' }));
          } catch (err) {
            console.error('[Email Server] Error sending email:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), emailNotificationPlugin(env)],
  };
});
