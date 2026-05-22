import { useState, useEffect } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { api, setToken, setCurrentUser, getToken } from '../lib/api';
import { CharAvatar, CHAR_IMAGES } from '../components/CharAvatar';
import { Smartphone, Lock, User, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const [mode, setMode]         = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
      const res = mode === 'login'
        ? await api.login(cleanPhone, password)
        : await api.register(cleanPhone, password, name || undefined);
      setToken(res.token); setCurrentUser(res.user as Record<string, unknown>); navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  }

  const charImg   = mode === 'login' ? CHAR_IMAGES.meguminImg : CHAR_IMAGES.aquaImg;
  const charName  = mode === 'login' ? 'Megumin' : 'Aqua';
  const charColor = mode === 'login' ? '#f472b6' : '#38bdf8';

  return (
    <>
      {/* Navbar */}
      <nav className="global-navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">⚔ KONOSUBA</Link>
          <div className="nav-actions">
            <Link to="/" className="btn"><ArrowLeft size={13} style={{ display:'inline', marginRight:4 }} />Home</Link>
          </div>
        </div>
      </nav>

      <div className="auth-page" style={{ minHeight:'100vh', alignItems:'center', paddingTop: 'calc(var(--nav-height) + 2rem)' }}>
        {/* Character art beside form on wide screens */}
        <div style={{ display:'flex', alignItems:'center', gap:'3rem', maxWidth:820, width:'100%' }}>
          <div style={{ display:'none', flex:'0 0 40%', alignItems:'flex-end', justifyContent:'center' }} className="auth-char-panel">
            <CharAvatar src={charImg} alt={charName} color={charColor}
              style={{ height:420, width:'auto', objectFit:'contain', borderRadius:0, filter:`drop-shadow(0 20px 40px ${charColor}50)` }}
            />
          </div>
          <style>{`@media(min-width:720px){ .auth-char-panel { display:flex !important; } }`}</style>

          <div className="auth-card" style={{ flex:1 }}>
            <Link to="/" className="auth-logo">⚔ KONOSUBA</Link>
            <p className="auth-subtitle">{mode === 'login' ? 'Welcome back, Adventurer' : 'Begin your adventure'}</p>

            {/* Character avatar */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:'1.1rem' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:`2px solid ${charColor}40`, background:'rgba(0,0,0,0.4)' }}>
                <CharAvatar src={charImg} alt={charName} color={charColor} style={{ width:'100%', height:'100%', borderRadius:'50%' }} initial={charName.charAt(0)} />
              </div>
            </div>

            <div className="auth-tabs">
              <button className={`auth-tab${mode==='login'?' active':''}`} onClick={()=>{setMode('login');setError('');setPassword('');}}>
                <LogIn size={12} style={{display:'inline',marginRight:5}}/>Login
              </button>
              <button className={`auth-tab${mode==='register'?' active':''}`} onClick={()=>{setMode('register');setError('');setPassword('');}}>
                <UserPlus size={12} style={{display:'inline',marginRight:5}}/>Register
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label"><User size={11} style={{display:'inline',marginRight:4}}/>Display Name (optional)</label>
                  <input className="form-input" type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label"><Smartphone size={11} style={{display:'inline',marginRight:4}}/>Phone Number</label>
                <input className="form-input" type="tel" placeholder="e.g. 2348012345678 (country code, no +)" value={phone} onChange={e=>setPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label"><Lock size={11} style={{display:'inline',marginRight:4}}/>Password</label>
                <input className="form-input" type="password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required />
              </div>
              {error && <div className="auth-error">⚠ {error}</div>}
              <button className="btn primary form-submit" type="submit" disabled={loading}>
                {loading ? '⏳ Processing...' : mode==='login' ? '⚔ Login to Dashboard' : '✦ Create Account'}
              </button>
            </form>

            <div className="auth-back"><Link to="/"><ArrowLeft size={11} style={{display:'inline',marginRight:4}}/>Back to Home</Link></div>

            <div style={{ marginTop:'1.2rem', padding:'10px 14px', background:'rgba(78,255,255,0.03)', border:'1px solid rgba(78,255,255,0.1)', borderRadius:10, fontSize:'0.78rem', color:'var(--muted)', lineHeight:1.6 }}>
              <strong style={{color:'rgba(78,255,255,0.8)'}}>Note:</strong> Use the same phone number as your WhatsApp bot account, with country code and no + sign.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
