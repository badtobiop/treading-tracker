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

export const DEFAULT_GOOGLE_CLIENT_ID = '966654270078-os3mj52etkg5n0td5udkftk46ahuoug1.apps.googleusercontent.com';

export function getGoogleClientId() {
  return (import.meta.env?.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()) 
    || DEFAULT_GOOGLE_CLIENT_ID;
}

let tokenClientInstance = null;
let activeSuccessCallback = null;
let activeErrorCallback = null;

/**
 * Pre-initializes the Google OAuth 2.0 Token Client ahead of user clicks
 * so popup windows are NOT blocked by browser user gesture expiration
 */
export function initializeTokenClient(onSuccess, onError) {
  if (onSuccess) activeSuccessCallback = onSuccess;
  if (onError) activeErrorCallback = onError;

  if (tokenClientInstance) return tokenClientInstance;
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) return null;

  const clientId = getGoogleClientId();
  if (!clientId) return null;

  try {
    tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'email profile openid',
      callback: async (tokenResponse) => {
        if (tokenResponse?.error) {
          console.warn('Google OAuth error response:', tokenResponse.error);
          if (activeErrorCallback) {
            activeErrorCallback(new Error(`Google Authentication: ${tokenResponse.error_description || tokenResponse.error}`));
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
              const userPrefix = profile.email.split('@')[0];
              const capitalizedName = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
              const displayName = (profile.name && profile.name.trim()) 
                ? profile.name.trim() 
                : capitalizedName;

              const googleUser = {
                id: `usr_google_${profile.sub || Date.now()}`,
                name: displayName,
                email: profile.email.trim().toLowerCase(),
                avatar: profile.picture || '',
                capital: 10000,
                authProvider: 'google',
                createdAt: new Date().toISOString()
              };
              if (activeSuccessCallback) {
                activeSuccessCallback(googleUser);
              }
            } else {
              throw new Error('Google did not return an email address.');
            }
          } catch (fetchErr) {
            console.error('Failed to fetch userinfo from Google:', fetchErr);
            if (activeErrorCallback) {
              activeErrorCallback(new Error(fetchErr.message || 'Could not retrieve Google profile data.'));
            }
          }
        }
      },
      error_callback: (err) => {
        console.warn('Google OAuth popup closed or blocked:', err);
        if (activeErrorCallback) {
          if (err.type === 'popup_failed_to_open') {
            activeErrorCallback(
              new Error('Pop-up was blocked by your browser. Please click the pop-up icon in your browser URL bar to "Always allow pop-ups from this site", or use the official Google button below.')
            );
          } else if (err.type === 'popup_closed') {
            activeErrorCallback(new Error('Google sign-in popup was closed before completion.'));
          } else {
            activeErrorCallback(new Error(err.message || 'Google sign-in encountered an issue.'));
          }
        }
      }
    });

    return tokenClientInstance;
  } catch (err) {
    console.error('Failed to initialize Google tokenClient:', err);
    return null;
  }
}

/**
 * Synchronous Google Login trigger.
 * MUST be executed synchronously on the user click event to prevent browser popup blockers.
 */
export function promptGoogleLogin({ onSuccess, onError }) {
  activeSuccessCallback = onSuccess;
  activeErrorCallback = onError;

  // If not yet initialized, initialize immediately
  let client = tokenClientInstance || initializeTokenClient(onSuccess, onError);

  if (!client) {
    // Check if Google SDK is loaded
    if (!window.google?.accounts?.oauth2) {
      if (onError) {
        onError(
          new Error('Google Identity Services SDK is still loading or was blocked by an ad-blocker. Please refresh the page or sign in with password.')
        );
      }
      return;
    }
    client = initializeTokenClient(onSuccess, onError);
  }

  if (!client) {
    if (onError) {
      onError(new Error('Failed to initialize Google Sign-In client. Please check your internet connection.'));
    }
    return;
  }

  try {
    // Synchronously request access token with account picker
    client.requestAccessToken({ prompt: 'select_account' });
  } catch (err) {
    console.error('Error invoking requestAccessToken:', err);
    if (onError) {
      onError(new Error('Failed to open Google login window. Check if your browser is blocking popups.'));
    }
  }
}

/**
 * Render Google's official native button inside a container DOM element.
 * Google's native rendered button has trusted click handling inside Google's iframe,
 * which is 100% immune to browser popup blockers!
 */
export function renderOfficialGoogleButton(containerElement, onSuccess, onError) {
  if (!containerElement || typeof window === 'undefined') return false;

  const clientId = getGoogleClientId();
  if (!clientId || !window.google?.accounts?.id) return false;

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) {
          const profile = decodeGoogleJwt(response.credential);
          if (profile?.email) {
            const userPrefix = profile.email.split('@')[0];
            const capitalizedName = userPrefix.charAt(0).toUpperCase() + userPrefix.slice(1);
            const displayName = (profile.name && profile.name.trim()) 
              ? profile.name.trim() 
              : capitalizedName;

            const googleUser = {
              id: `usr_google_${profile.sub || Date.now()}`,
              name: displayName,
              email: profile.email.trim().toLowerCase(),
              avatar: profile.picture || '',
              capital: 10000,
              authProvider: 'google',
              createdAt: new Date().toISOString()
            };
            if (onSuccess) onSuccess(googleUser);
            return;
          }
        }
        if (onError) onError(new Error('Google did not return valid credentials.'));
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    window.google.accounts.id.renderButton(containerElement, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'left',
      width: containerElement.offsetWidth > 0 ? containerElement.offsetWidth : 360
    });

    return true;
  } catch (err) {
    console.warn('Failed to render official Google button:', err);
    return false;
  }
}

// Backwards compatibility aliases
export const initializeGoogleAuth = initializeTokenClient;
export const renderGoogleButton = renderOfficialGoogleButton;
