import { useState, useEffect } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { api, setToken, setCurrentUser, getToken } from '../lib/api';
import { CharAvatar } from '../components/CharAvatar';
import { Smartphone, Lock, User, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

const CHAR_IMGS = {
  megumin: '/assets/images/megumin.svg',
  aqua:    '/assets/images/aqua.svg',
};

export default function Auth() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const [mode, setMode]       = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const charImg  = mode === 'login' ? CHAR_IMGS.megumin : CHAR_IMGS.aqua;
  const charName = mode === 'login' ? 'Megumin' : 'Aqua';
  const charColor = mode === 'login' ? '#f472b6' : '#38bdf8';

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
      if (!cleanPhone || cleanPhone.length < 7) { setError('Enter a valid phone number with country code'); setLoading(false); return; }
      if (!password) { setError('Password is required'); setLoading(false); return; }
      let res;
      if (mode === 'login') { res = await api.login(cleanPhone, password); }
      else                  { res = await api.register(cleanPhone, password, name || undefined); }
      setToken(res.token); setCurrentUser(res.user as Record<string, unknown>); navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      {['⚔', '✦', '◈', '⬡', '✧'].map((r, i) => (
        <div key={i} className="rune" style={{ left: `${8 + i * 20}%`, top: `${15 + (i % 2) * 60}%`, animationDelay: `${i * 1.5}s`, fontSize: '2.2rem' }}>{r}</div>
      ))}

      {/* Character panel */}
      <div style={{ display: 'none', flex: '0 0 42%', position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${charColor}07, rgba(10,10,30,0.98))` }}
        className="auth-character-panel">
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 80%, ${charColor}14, transparent)` }} />
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', height: '88%', width: '80%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <CharAvatar src={charImg} alt={charName} color={charColor}
            style={{ height: '100%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom', filter: `drop-shadow(0 0 28px ${charColor}45)`, animation: 'auth-float 6s ease-in-out infinite', borderRadius: 0 }}
          />
        </div>
        <div style={{ position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: `1px solid ${charColor}28`, borderRadius: 12, padding: '0.5rem 1.2rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>{charName}</div>
          <div style={{ color: charColor, fontSize: '0.7rem', marginTop: 2 }}>{mode === 'login' ? 'Arch-Wizard · Explosion Magic' : 'Water Goddess · Arch-Priest'}</div>
        </div>
        <div style={{ position: 'absolute', bottom: '2rem', left: '1.5rem', right: '1.5rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.9rem 1rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', lineHeight: 1.65, fontStyle: 'italic', margin: 0 }}>
            {mode === 'login' ? '"Explosion! An incomparable, ultimate magic. Today, once again, I shall use it!" — Megumin' : '"What?! You dare question a goddess?! Aqua-sama is here to bless your WhatsApp!" — Aqua'}
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) { .auth-character-panel { display: flex !important; flex-direction: column; } .auth-card { margin: auto; } }
        @keyframes auth-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      `}</style>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 1 }}>
        <div className="auth-card glass-card" style={{ width: '100%', maxWidth: 420 }}>
          <Link to="/" className="auth-logo">⚔ KONOSUBA</Link>
          <p className="auth-subtitle">{mode === 'login' ? 'Welcome back, Adventurer' : 'Begin your adventure'}</p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${charColor}38`, background: 'rgba(0,0,20,0.6)' }}>
              <CharAvatar src={charImg} alt={charName} color={charColor} style={{ width: '100%', height: '100%', borderRadius: '50%' }} initial={charName.charAt(0)} />
            </div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); setPassword(''); }}>
              <LogIn size={14} style={{ display: 'inline', marginRight: 5 }} />Login
            </button>
            <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); setPassword(''); }}>
              <UserPlus size={14} style={{ display: 'inline', marginRight: 5 }} />Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label"><User size={12} style={{ display: 'inline', marginRight: 4 }} />Display Name (optional)</label>
                <input className="form-input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label"><Smartphone size={12} style={{ display: 'inline', marginRight: 4 }} />Phone Number</label>
              <input className="form-input" type="tel" placeholder="e.g. 2348012345678 (with country code)" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label"><Lock size={12} style={{ display: 'inline', marginRight: 4 }} />Password</label>
              <input className="form-input" type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <button className="glow-btn form-submit" type="submit" disabled={loading}>
              {loading ? '⏳ Processing...' : mode === 'login' ? '⚔ Login to Dashboard' : '✦ Create Account'}
            </button>
          </form>

          <div className="auth-back"><Link to="/"><ArrowLeft size={12} style={{ display: 'inline', marginRight: 4 }} />Back to Home</Link></div>

          <div style={{ marginTop: '1.4rem', padding: '0.9rem 1rem', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.09)', borderRadius: 10, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(0,212,255,0.75)' }}>Note:</strong> Use the same phone number you use with the WhatsApp bot. Include country code without the + sign.
          </div>
        </div>
      </div>
    </div>
  );
}
