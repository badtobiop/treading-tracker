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

      // Handle direct trader support message dispatch to admin Gmail
      server.middlewares.use('/api/support-message', async (req, res) => {
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

            const senderName = data.name || 'Trader';
            const senderEmail = data.email || 'No email provided';
            const topic = data.subject || 'General Trader Support';
            const capitalStr = data.userCapital ? `${data.currency || '₹'}${Number(data.userCapital).toLocaleString('en-IN')}` : 'N/A';
            const timestampStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

            console.log(`[Support Server] Processing support message from ${senderName} (${senderEmail}) to ${adminEmail}`);

            if (gmailPassword && gmailPassword.trim()) {
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: gmailUser,
                  pass: gmailPassword.trim().replace(/\s+/g, '')
                }
              });

              const mailOptions = {
                from: `"TradeMatrix Support Terminal" <${gmailUser}>`,
                to: adminEmail,
                replyTo: senderEmail !== 'No email provided' ? senderEmail : adminEmail,
                subject: `📩 New Trader Support: ${topic} from ${senderName}`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #38bdf8; max-width: 580px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); margin: 0 auto;">
                    <div style="border-bottom: 1px solid rgba(56, 189, 248, 0.25); padding-bottom: 18px; margin-bottom: 22px;">
                      <h2 style="color: #38bdf8; margin: 0; font-size: 22px; font-weight: 700;">New Trader Support Message</h2>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">A trader sent you a direct message from TradeMatrix.</p>
                    </div>

                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
                      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 6px 0; color: #94a3b8; width: 38%;"><strong>Trader Name:</strong></td><td style="color: #fff; font-weight: 600;">${senderName}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8;"><strong>Trader Email / ID:</strong></td><td style="color: #38bdf8; font-family: monospace;">${senderEmail}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8;"><strong>Category:</strong></td><td style="color: #f43f5e; font-weight: 600;">${topic}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8;"><strong>Account Capital:</strong></td><td style="color: #10b981; font-weight: bold;">${capitalStr}</td></tr>
                        <tr><td style="padding: 6px 0; color: #94a3b8;"><strong>Time (IST):</strong></td><td style="color: #cbd5e1;">${timestampStr}</td></tr>
                      </table>
                    </div>

                    <div style="margin-bottom: 24px;">
                      <label style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #38bdf8; display: block; margin-bottom: 8px;">Trader's Message:</label>
                      <div style="background: #1e293b; border: 1px solid rgba(56, 189, 248, 0.3); border-left: 4px solid #38bdf8; padding: 16px 18px; border-radius: 8px; font-size: 15px; color: #f1f5f9; line-height: 1.6; white-space: pre-wrap;">${data.message || ''}</div>
                    </div>

                    <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 14px; border-radius: 10px; font-size: 13px; color: #cbd5e1;">
                      👉 <strong>Reply to User:</strong> Hit <em>Reply</em> in Gmail to respond directly to <strong>${senderEmail}</strong>.
                    </div>
                  </div>
                `
              };

              await transporter.sendMail(mailOptions);
              console.log(`[Support Server] Message successfully dispatched to ${adminEmail}!`);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: `Support message sent to ${adminEmail}` }));
              return;
            }

            console.warn('[Support Server] GMAIL_APP_PASSWORD not set.');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, message: 'Message logged. Add GMAIL_APP_PASSWORD in .env' }));
          } catch (err) {
            console.error('[Support Server] Error dispatching message:', err.message);
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
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    plugins: [react(), emailNotificationPlugin(env)],
  };
});
