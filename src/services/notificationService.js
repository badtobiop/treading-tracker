// Notification Service: Handles new user registration alerts via Email / Webhook API

/**
 * Sends a notification when a new user registers an account.
 * Supports:
 * 1. Custom Webhook / Backend Email API (e.g., EmailJS, SendGrid, Resend, Zapier, Webhook)
 * 2. Fallback to Local Notification Audit Log in browser localStorage
 */
export async function sendNewUserRegistrationNotification(user) {
  const adminEmail = import.meta.env?.VITE_NOTIFICATION_ADMIN_EMAIL || 'utkarshdhakane2@gmail.com';
  const apiEndpoint = import.meta.env?.VITE_NOTIFICATION_API_ENDPOINT || '/api/notify-signup';

  const notificationPayload = {
    event: 'NEW_USER_REGISTRATION',
    timestamp: new Date().toISOString(),
    adminEmail,
    newUser: {
      id: user.id,
      name: user.name,
      email: user.email,
      initialCapital: user.capital || 10000,
      registeredAt: user.createdAt || new Date().toISOString()
    },
    message: `🚀 New Trader Registered: ${user.name} (${user.email}) started with ₹${user.capital || 10000} capital.`
  };

  // 1. Always store locally in audit trail for admin tracking
  try {
    const existing = localStorage.getItem('tradematrix_signup_notifications');
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(notificationPayload);
    // Keep last 50 notifications
    localStorage.setItem('tradematrix_signup_notifications', JSON.stringify(list.slice(0, 50)));
  } catch (err) {
    console.error('Failed to store local signup notification:', err);
  }

  // 2. Dispatch to remote API endpoint if provided by user in .env
  if (apiEndpoint && apiEndpoint.trim() !== '') {
    try {
      console.log(`[Notification Service] Dispatching registration alert for ${user.email} to:`, apiEndpoint);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayload)
      });

      if (response.ok) {
        console.log('[Notification Service] Email / Webhook alert sent successfully!');
        return { success: true, method: 'API_ENDPOINT' };
      } else {
        console.warn('[Notification Service] API responded with non-200 status:', response.status);
      }
    } catch (err) {
      console.error('[Notification Service] Error sending registration notification:', err);
    }
  } else {
    console.info(
      `[Notification Service] Ready: New registration for ${user.email} logged locally. Configure VITE_NOTIFICATION_API_ENDPOINT in .env to dispatch live emails.`
    );
  }

  return { success: true, method: 'LOCAL_LOG' };
}
