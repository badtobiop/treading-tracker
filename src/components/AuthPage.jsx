import React, { useState } from 'react';
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
  AlertCircle 
} from 'lucide-react';
import { sendNewUserRegistrationNotification } from '../services/notificationService';
import { promptGoogleLogin } from '../services/googleAuthService';

export default function AuthPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [capital, setCapital] = useState(10000);

  // Read registered users from localStorage
  const getStoredUsers = () => {
    try {
      const data = localStorage.getItem('tradematrix_users');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter your Gmail / email address and password.');
      return;
    }

    const users = getStoredUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      setErrorMessage('No account found with this email. Please switch to "Create Account" to register.');
      return;
    }

    if (user.authProvider === 'google' || user.password === 'google_user') {
      setErrorMessage('This account was registered using Google. Please click "Continue with Google" above to sign in.');
      return;
    }

    if (user.password !== password) {
      setErrorMessage('Incorrect password. Please verify your credentials and try again.');
      return;
    }

    // Success
    localStorage.setItem('tradematrix_current_user', JSON.stringify(user));
    onLoginSuccess(user);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || !name) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail or email address.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters in length.');
      return;
    }

    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      setErrorMessage('This email address is already registered. Please sign in.');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      password,
      capital: Number(capital) || 10000,
      createdAt: new Date().toISOString()
    };

    // Save user
    const updatedUsers = [...users, newUser];
    localStorage.setItem('tradematrix_users', JSON.stringify(updatedUsers));
    localStorage.setItem('tradematrix_current_user', JSON.stringify(newUser));

    // Dispatch registration email / webhook notification
    setIsNotifying(true);
    try {
      await sendNewUserRegistrationNotification(newUser);
    } catch (err) {
      console.error('Registration notification error:', err);
    } finally {
      setIsNotifying(false);
    }

    onLoginSuccess(newUser);
  };

  const handleGoogleSuccess = async (googleUser) => {
    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());
    if (!existing) {
      users.push(googleUser);
      localStorage.setItem('tradematrix_users', JSON.stringify(users));
      // Notify admin on new Google signup
      await sendNewUserRegistrationNotification(googleUser);
    }
    localStorage.setItem('tradematrix_current_user', JSON.stringify(googleUser));
    onLoginSuccess(googleUser);
  };

  const handleGoogleBtnClick = () => {
    setErrorMessage('');
    promptGoogleLogin({
      onSuccess: (googleUser) => {
        handleGoogleSuccess(googleUser);
      },
      onError: (err) => {
        console.warn('Google sign-in error:', err);
        setErrorMessage(
          err.message || 'Google sign-in popup was closed or encountered an issue. You can sign in using your email and password below.'
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

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'signin' ? 'active' : ''}`}
            onClick={() => { setAuthMode('signin'); setErrorMessage(''); }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="auth-error-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', lineHeight: 1.4 }}>{errorMessage}</span>
          </div>
        )}

        {/* GOOGLE SIGN IN BUTTON */}
        <div style={{ margin: '4px 0 12px 0' }}>
          <button
            type="button"
            className="auth-google-btn"
            onClick={handleGoogleBtnClick}
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

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or sign in with password</span>
            <div className="auth-divider-line" />
          </div>
        </div>

        {/* SIGN IN FORM */}
        {authMode === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label className="form-label">Gmail / Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} />
                <input 
                  type="email"
                  className="form-input"
                  placeholder="Enter your Gmail address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
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

            <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}>
              <span>Sign In to Terminal</span>
              <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={17} />
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
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
                  placeholder="Enter your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                  placeholder="Enter your password (min. 4 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
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
              disabled={isNotifying}
            >
              <ShieldCheck size={18} />
              <span>{isNotifying ? 'Registering & Notifying...' : 'Create Account & Access Terminal'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
