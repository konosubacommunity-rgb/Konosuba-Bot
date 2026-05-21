import { useState, useEffect } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { api, setToken, setCurrentUser } from '../lib/api';

export default function Auth() {
  const search = useSearch();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(search);
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('mode') === 'register' ? 'register' : 'login'
  );
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(search);
    setMode(p.get('mode') === 'register' ? 'register' : 'login');
    setError('');
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 7) {
        setError('Enter a valid phone number with country code');
        return;
      }
      let res;
      if (mode === 'login') {
        res = await api.login(cleanPhone, password || undefined);
      } else {
        res = await api.register(cleanPhone, password || undefined, name || undefined);
      }
      setToken(res.token);
      setCurrentUser(res.user as Record<string, unknown>);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, color: '#fff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#a78bfa', fontSize: '0.85rem', marginBottom: 6, fontWeight: 600,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem' }}>⚔️</div>
          <h1 style={{ color: '#fff', margin: '0.5rem 0 0', fontSize: '1.6rem', fontWeight: 800 }}>
            {mode === 'login' ? 'Welcome Back' : 'Join the Adventure'}
          </h1>
          <p style={{ color: '#94a3b8', marginTop: 6, fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in with your phone number' : 'Create your adventurer account'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, marginBottom: '1.5rem' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                background: mode === m ? 'linear-gradient(90deg, #a78bfa, #f472b6)' : 'transparent',
                color: mode === m ? '#fff' : '#94a3b8',
              }}>
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <div>
              <label style={labelStyle}>Display Name (optional)</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Kazuma Satō" />
            </div>
          )}

          <div>
            <label style={labelStyle}>Phone Number *</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 2348012345678" required type="tel" />
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>Include country code, no spaces or dashes</div>
          </div>

          <div>
            <label style={labelStyle}>Password {mode === 'login' ? '(if set)' : '(optional)'}</label>
            <input style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank if not set" type="password" />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.9rem' }}>
              ❌ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: '0.9rem', background: loading ? 'rgba(167,139,250,0.4)' : 'linear-gradient(90deg, #a78bfa, #f472b6)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
            {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
          <Link to="/" style={{ color: '#a78bfa', textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
