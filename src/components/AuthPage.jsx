import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  DollarSign, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { sendNewUserRegistrationNotification } from '../services/notificationService';
import { 
  promptGoogleLogin, 
  initializeTokenClient, 
  renderOfficialGoogleButton 
} from '../services/googleAuthService';
import { 
  checkEmailExistsInTurso, 
  registerUserInTurso, 
  loginUserInTurso, 
  syncGoogleUserToTurso 
} from '../services/tursoService';

export default function AuthPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [capital, setCapital] = useState(10000);

  // Read registered users from localStorage (offline fallback cache)
  const getStoredUsers = () => {
    try {
      const data = localStorage.getItem('tradematrix_users');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  /**
   * Handle Sign In for Returning Users
   */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter your Gmail / email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Verify credentials against cloud database
      const cloudResult = await loginUserInTurso({ email: cleanEmail, password });

      if (cloudResult && cloudResult.success && cloudResult.user) {
        // Save verified active session
        localStorage.setItem('tradematrix_current_user', JSON.stringify(cloudResult.user));
        
        // Cache user in local registry
        const users = getStoredUsers();
        if (!users.some(u => u.email.toLowerCase() === cleanEmail)) {
          users.push(cloudResult.user);
          localStorage.setItem('tradematrix_users', JSON.stringify(users));
        }

        onLoginSuccess(cloudResult.user);
        return;
      }

      // If cloud returned a specific rejection (e.g. wrong password or google account)
      if (cloudResult && cloudResult.error) {
        setErrorMessage(cloudResult.error);
        return;
      }

      // 2. Offline fallback check against local storage
      const users = getStoredUsers();
      const localUser = users.find(u => u.email.toLowerCase() === cleanEmail);

      if (!localUser) {
        setErrorMessage('No account found with this email. Please switch to "Create Account" to register.');
        return;
      }

      if (localUser.authProvider === 'google' || localUser.password === 'google_user') {
        setErrorMessage('This account was registered using Google. Please click "Continue with Google" above to sign in.');
        return;
      }

      if (localUser.password !== password) {
        setErrorMessage('Incorrect password. Please verify your credentials and try again.');
        return;
      }

      // Success via local cache
      localStorage.setItem('tradematrix_current_user', JSON.stringify(localUser));
      onLoginSuccess(localUser);
    } catch (err) {
      console.error('Sign-in error:', err);
      setErrorMessage('An unexpected error occurred during sign-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Create Account for New Users
   */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid Gmail or email address (e.g. name@gmail.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and re-enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Strict Duplicate Email Verification against Cloud DB & Local Storage
      const isDuplicateInCloud = await checkEmailExistsInTurso(cleanEmail);
      const localUsers = getStoredUsers();
      const isDuplicateInLocal = localUsers.some(u => u.email.toLowerCase() === cleanEmail);

      if (isDuplicateInCloud || isDuplicateInLocal) {
        setErrorMessage('This email address is already registered on TradeMatrix. Please switch to "Sign In" to access your account.');
        setIsSubmitting(false);
        return;
      }

      // 2. Register account in Cloud Database
      const regResult = await registerUserInTurso({
        name: cleanName,
        email: cleanEmail,
        password,
        capital: Number(capital) || 10000
      });

      if (!regResult.success) {
        setErrorMessage(regResult.error || 'Failed to create account. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const newUser = regResult.user || {
        id: `usr_${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        password,
        capital: Number(capital) || 10000,
        authProvider: 'email',
        createdAt: new Date().toISOString()
      };

      // 3. Update local user cache & active session
      const updatedUsers = [...localUsers, { ...newUser, password }];
      localStorage.setItem('tradematrix_users', JSON.stringify(updatedUsers));
      localStorage.setItem('tradematrix_current_user', JSON.stringify(newUser));

      // 4. Send email notification to admin
      try {
        await sendNewUserRegistrationNotification(newUser);
      } catch (notifyErr) {
        console.warn('Registration notification alert notice:', notifyErr);
      }

      onLoginSuccess(newUser);
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMessage('Failed to complete registration. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Google OAuth 2.0 Success
   */
  const handleGoogleSuccess = async (googleProfile) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // Sync Google user with Cloud Database
      const syncResult = await syncGoogleUserToTurso(googleProfile);
      const user = syncResult?.user || googleProfile;

      // Update local storage
      const users = getStoredUsers();
      const existingIndex = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (existingIndex >= 0) {
        users[existingIndex] = { ...users[existingIndex], ...user };
      } else {
        users.push(user);
        // If brand new Google user, notify admin
        try {
          await sendNewUserRegistrationNotification(user);
        } catch (e) {
          console.warn('Google registration notification notice:', e);
        }
      }
      localStorage.setItem('tradematrix_users', JSON.stringify(users));
      localStorage.setItem('tradematrix_current_user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      console.error('Google login processing error:', err);
      setErrorMessage('Failed to synchronize your Google account. Please try again or use password login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Pre-initialize Google OAuth token client on mount and render official button
   */
  useEffect(() => {
    // 1. Prime tokenClient ahead of time so clicking opens window synchronously
    initializeTokenClient(handleGoogleSuccess, (err) => {
      console.warn('Google auth notice:', err);
      setErrorMessage(err.message || 'Google sign-in encountered an issue.');
    });

    // 2. Mount official Google iframe button (which is immune to popup blockers)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const container = document.getElementById('google-official-btn');
      if (container && window.google?.accounts?.id) {
        renderOfficialGoogleButton(container, handleGoogleSuccess, (err) => {
          console.warn('Official button error:', err);
        });
        clearInterval(interval);
      }
      if (attempts > 15) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  /**
   * Trigger Google OAuth 2.0 Account Picker Popup
   */
  const handleGoogleBtnClick = () => {
    setErrorMessage('');
    setSuccessMessage('');
    promptGoogleLogin({
      onSuccess: (googleUser) => {
        handleGoogleSuccess(googleUser);
      },
      onError: (err) => {
        console.warn('Google sign-in notice:', err);
        setErrorMessage(
          err.message || 'Google sign-in popup was closed or cancelled. You can sign in using your email and password below.'
        );
      }
    });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-brand-icon">
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>
          <h1 className="auth-title">TradeMatrix AI</h1>
          <p className="auth-subtitle">
            Strategy Analytics & Trade Performance Terminal
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
            onClick={() => { 
              setAuthMode('signin'); 
              setErrorMessage(''); 
              setSuccessMessage(''); 
            }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => { 
              setAuthMode('signup'); 
              setErrorMessage(''); 
              setSuccessMessage(''); 
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification Banner with Browser Pop-up Guidance */}
        {errorMessage && (
          <div className="auth-error-banner" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>{errorMessage}</span>
            </div>
            {errorMessage.toLowerCase().includes('pop') && (
              <div style={{
                fontSize: '0.78rem',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '8px 12px',
                borderRadius: '6px',
                color: '#f8fafc',
                lineHeight: 1.45
              }}>
                💡 <strong>Browser Pop-up Notice:</strong> If your browser blocked the window, look for the pop-up icon in your address bar (top-right of your browser) and select <em>"Always allow pop-ups"</em>, or use the official Google button below.
              </div>
            )}
          </div>
        )}

        {/* Success Notification Banner */}
        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTONS (Multi-Account Picker via Google OAuth 2.0) */}
        <div style={{ margin: '2px 0 10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleBtnClick}
            disabled={isSubmitting}
            title="Sign in with your verified Google account"
          >
            {/* Google Multicolor 'G' */}
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Official Google GIS Button (Immune to browser popup blockers) */}
          <div 
            id="google-official-btn" 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              minHeight: '40px',
              borderRadius: '8px',
              overflow: 'hidden'
            }} 
          />

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">
              {authMode === 'signin' ? 'or sign in with password' : 'or register with password'}
            </span>
            <div className="auth-divider-line" />
          </div>
        </div>

        {/* MODE 1: SIGN IN FORM */}
        {authMode === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Gmail / Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} />
                <input 
                  type="email"
                  className="form-input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your account password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button 
                  type="button" 
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('signup'); 
                    setErrorMessage(''); 
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--accent-rose)', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Create Account
                </button>
              </span>
            </div>
          </form>
        ) : (
          /* MODE 2: CREATE ACCOUNT FORM */
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={17} />
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Gmail / Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} />
                <input 
                  type="email"
                  className="form-input"
                  placeholder="Enter a new email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create password (min. 6 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button 
                  type="button" 
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button 
                  type="button" 
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Trading Capital (₹)</label>
              <div className="auth-input-wrapper">
                <DollarSign size={17} />
                <input 
                  type="number"
                  className="form-input"
                  placeholder="10000"
                  value={capital}
                  onChange={e => setCapital(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>Registering & Setting Up Terminal...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Create Account & Access Terminal</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { 
                    setAuthMode('signin'); 
                    setErrorMessage(''); 
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--accent-rose)', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Sign In
                </button>
              </span>
            </div>
          </form>
        )}

        {/* Security Session Footer Notice */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid rgba(244, 114, 182, 0.12)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={13} style={{ color: '#10b981' }} />
          <span>Encrypted Session Isolation — Verified Access Only</span>
        </div>
      </div>
    </div>
  );
}
