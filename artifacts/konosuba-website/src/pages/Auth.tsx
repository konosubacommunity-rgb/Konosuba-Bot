import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { api, setToken } from '../lib/api';

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'register') setMode('register');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        setToken(res.token);
        navigate('/dashboard');
      } else {
        const res = await api.register({ email, password, username });
        setToken(res.token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card glass-card" style={{ padding: '3rem' }}>
        <div className="auth-logo">
          ⚔ Guild Master
        </div>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Welcome back to your guild'
            : 'Create your adventurer account'}
        </p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '6px',
              border: mode === 'login' ? 'none' : '2px solid var(--glass-border)',
              background: mode === 'login' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
              color: mode === 'login' ? '#1a1410' : 'var(--text-dim)',
              fontWeight: mode === 'login' ? 700 : 600, cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem'
            }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: '6px',
              border: mode === 'register' ? 'none' : '2px solid var(--glass-border)',
              background: mode === 'register' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
              color: mode === 'register' ? '#1a1410' : 'var(--text-dim)',
              fontWeight: mode === 'register' ? 700 : 600, cursor: 'pointer',
              transition: 'all 0.2s', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem'
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(139, 58, 58, 0.15)',
              border: '2px solid rgba(139, 58, 58, 0.3)',
              borderRadius: '6px', padding: '0.75rem 1rem',
              color: '#f4a4a4', fontSize: '0.85rem', marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Adventurer Name</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="form-input"
                placeholder="Your guild name"
                required
                style={{
                  width: '100%', padding: '0.85rem 1rem',
                  background: 'rgba(29, 20, 16, 0.6)',
                  border: '2px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px',
                  color: '#fff', fontFamily: "'Poppins', sans-serif", outline: 'none', transition: 'all 0.2s'
                }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input"
              placeholder="your@email.com"
              required
              style={{
                width: '100%', padding: '0.85rem 1rem',
                background: 'rgba(29, 20, 16, 0.6)',
                border: '2px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px',
                color: '#fff', fontFamily: "'Poppins', sans-serif", outline: 'none', transition: 'all 0.2s'
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '0.85rem 1rem',
                background: 'rgba(29, 20, 16, 0.6)',
                border: '2px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px',
                color: '#fff', fontFamily: "'Poppins', sans-serif", outline: 'none', transition: 'all 0.2s'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glow-btn"
            style={{
              width: '100%', padding: '0.9rem', marginTop: '0.5rem',
              fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : (mode === 'login' ? 'Login to Guild' : 'Join Guild')}
          </button>
        </form>

        <div className="auth-back">
          <p style={{ marginBottom: '1rem' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already a member? '}
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 700, transition: 'color 0.2s' }}
            >
              {mode === 'login' ? 'Create one' : 'Login here'}
            </a>
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            By joining, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
