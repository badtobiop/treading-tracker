// Google Authentication Service (Google Identity Services / OAuth 2.0)

/**
 * Parses JWT token from Google Identity Services
 */
export function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google JWT token:', e);
    return null;
  }
}

const DEFAULT_GOOGLE_CLIENT_ID = '966654270078-os3mj52etkg5n0td5udkftk46ahuoug1.apps.googleusercontent.com';

/**
 * Interactive Google Login trigger using OAuth 2.0 Token Client (Strict - NO browser prompt)
 */
export async function promptGoogleLogin({ onSuccess, onError }) {
  const clientId = (import.meta.env?.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()) 
    || DEFAULT_GOOGLE_CLIENT_ID;

  if (!clientId || clientId.trim() === '') {
    if (onError) {
      onError(new Error('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID in your .env file.'));
    }
    return;
  }

  // Ensure Google Identity Services SDK is ready (wait up to 3 seconds if initializing)
  if (!window.google?.accounts?.oauth2) {
    let waited = 0;
    while (!window.google?.accounts?.oauth2 && waited < 3000) {
      await new Promise(r => setTimeout(r, 150));
      waited += 150;
    }
  }

  if (!window.google?.accounts?.oauth2) {
    if (onError) {
      onError(new Error('Google Sign-In SDK is initializing or blocked by an ad-blocker. Please check your connection and try again.'));
    }
    return;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse?.error) {
          console.warn('Google OAuth error:', tokenResponse.error);
          if (onError) {
            onError(new Error(`Google Authentication failed: ${tokenResponse.error_description || tokenResponse.error}`));
          }
          return;
        }

        if (tokenResponse && tokenResponse.access_token) {
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });

            if (!res.ok) {
              throw new Error(`Failed to fetch Google profile (${res.status})`);
            }

            const profile = await res.json();
            if (profile?.email) {
              const googleUser = {
                id: `usr_google_${profile.sub || Date.now()}`,
                name: profile.name || profile.email.split('@')[0],
                email: profile.email.trim().toLowerCase(),
                avatar: profile.picture || '',
                capital: 10000,
                authProvider: 'google',
                createdAt: new Date().toISOString()
              };
              onSuccess(googleUser);
              return;
            } else {
              throw new Error('Google did not provide an email address.');
            }
          } catch (fetchErr) {
            console.error('Failed to fetch userinfo from Google:', fetchErr);
            if (onError) onError(new Error(fetchErr.message || 'Could not retrieve Google user profile.'));
          }
        }
      },
      error_callback: (err) => {
        console.warn('Google OAuth popup closed or error:', err);
        if (onError) {
          if (err.type === 'popup_closed') {
            onError(new Error('Google sign-in popup was closed before completion.'));
          } else {
            onError(new Error(err.message || 'Google sign-in was cancelled or encountered an error.'));
          }
        }
      }
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  } catch (err) {
    console.error('Error invoking Google oauth2 client:', err);
    if (onError) {
      onError(new Error(err.message || 'Failed to open Google login window.'));
    }
  }
}

// Backwards compatibility aliases
export const initializeGoogleAuth = () => true;
export const renderGoogleButton = () => true;
