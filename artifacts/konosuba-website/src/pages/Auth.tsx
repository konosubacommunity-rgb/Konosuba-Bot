import { useState, useEffect } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { api, setToken, setCurrentUser, getToken } from '../lib/api';

// Real KonoSuba character images — Fandom Wiki CDN
const CHAR_IMGS = {
  megumin: 'https://static.wikia.nocookie.net/konosuba/images/9/97/Megumin_Anime.png/revision/latest?width=500',
  aqua:    'https://static.wikia.nocookie.net/konosuba/images/9/9e/Aqua_Anime.png/revision/latest?width=500',
};

export default function Auth() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // show Megumin on login, Aqua on register
  const charImg = mode === 'login' ? CHAR_IMGS.megumin : CHAR_IMGS.aqua;
  const charName = mode === 'login' ? 'Megumin' : 'Aqua';

  useEffect(() => {
    if (getToken()) navigate('/dashboard');
    const p = new URLSearchParams(search);
    setMode(p.get('mode') === 'register' ? 'register' : 'login');
    setError('');
  }, [search, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 7) {
        setError('Enter a valid phone number with country code');
        setLoading(false);
        return;
      }
      if (!password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
      let res;
      if (mode === 'login') {
        res = await api.login(cleanPhone, password);
      } else {
        res = await api.register(cleanPhone, password, name || undefined);
      }
      setToken(res.token);
      setCurrentUser(res.user as Record<string, unknown>);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page" style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh' }}>
      <div className="auth-bg" />

      {/* Floating runes */}
      {['⚔', '✦', '◈', '⬡', '✧'].map((r, i) => (
        <div key={i} className="rune" style={{ left: `${8 + i * 20}%`, top: `${15 + (i % 2) * 60}%`, animationDelay: `${i * 1.5}s`, fontSize: '2.5rem' }}>{r}</div>
      ))}

      {/* ── Character panel (hidden on small screens via CSS) ─────────── */}
      <div className="auth-character-panel" style={{
        display: 'none',
        flex: '0 0 42%',
        position: 'relative',
        overflow: 'hidden',
        background: mode === 'login'
          ? 'linear-gradient(135deg, rgba(244,114,182,0.06), rgba(10,10,30,0.95))'
          : 'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(10,10,30,0.95))',
      }}>
        {/* Glow radial behind character */}
        <div style={{
          position: 'absolute', inset: 0,
          background: mode === 'login'
            ? 'radial-gradient(ellipse 70% 60% at 50% 80%, rgba(244,114,182,0.18), transparent)'
            : 'radial-gradient(ellipse 70% 60% at 50% 80%, rgba(56,189,248,0.18), transparent)',
        }} />

        {/* Character image */}
        <img
          src={charImg}
          alt={charName}
          style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: 'translateX(-50%)',
            height: '88%', width: 'auto',
            objectFit: 'contain', objectPosition: 'bottom',
            filter: mode === 'login'
              ? 'drop-shadow(0 0 30px rgba(244,114,182,0.5))'
              : 'drop-shadow(0 0 30px rgba(56,189,248,0.5))',
            animation: 'auth-float 6s ease-in-out infinite',
          }}
        />

        {/* Character name tag */}
        <div style={{
          position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          border: `1px solid ${mode === 'login' ? 'rgba(244,114,182,0.3)' : 'rgba(56,189,248,0.3)'}`,
          borderRadius: 12, padding: '0.5rem 1.2rem', textAlign: 'center', whiteSpace: 'nowrap',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{charName}</div>
          <div style={{ color: mode === 'login' ? '#f472b6' : '#38bdf8', fontSize: '0.72rem', marginTop: 2 }}>
            {mode === 'login' ? 'Arch-Wizard · Explosion Magic' : 'Water Goddess · Arch-Priest'}
          </div>
        </div>

        {/* Quote */}
        <div style={{
          position: 'absolute', bottom: '2rem', left: '1.5rem', right: '1.5rem',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.9rem 1rem',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
            {mode === 'login'
              ? '"Explosion! An incomparable, ultimate magic. Today, once again, I shall use it!" — Megumin'
              : '"What?! You dare question a goddess?! Aqua-sama is here to bless your WhatsApp!" — Aqua'}
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-character-panel { display: flex !important; flex-direction: column; }
          .auth-card { margin: auto; }
        }
        @keyframes auth-float {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-14px); }
        }
      `}</style>

      {/* ── Auth card ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 1 }}>
        <div className="auth-card glass-card" style={{ width: '100%', maxWidth: 420 }}>
          <Link to="/" className="auth-logo">⚔ KONOSUBA</Link>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Welcome back, Adventurer' : 'Begin your adventure'}
          </p>

          {/* Small character icon above tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${mode === 'login' ? 'rgba(244,114,182,0.4)' : 'rgba(56,189,248,0.4)'}`, background: 'rgba(0,0,20,0.6)' }}>
              <img src={charImg} alt={charName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); setPassword(''); }}>
              Login
            </button>
            <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); setPassword(''); }}>
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Display Name (optional)</label>
                <input className="form-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" placeholder="e.g. 2348012345678 (with country code)" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button className="glow-btn form-submit" type="submit" disabled={loading}>
              {loading ? '⏳ Processing...' : mode === 'login' ? '⚔ Login to Dashboard' : '✦ Create Account'}
            </button>
          </form>

          <div className="auth-back">
            <Link to="/">← Back to Home</Link>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(0,212,255,0.8)' }}>Note:</strong> Use the same phone number you use with the WhatsApp bot. Include country code without the + sign.
          </div>
        </div>
      </div>
    </div>
  );
}
