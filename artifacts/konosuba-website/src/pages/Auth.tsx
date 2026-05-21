import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Phone, Lock, User, Globe, ArrowLeft, Loader2 } from "lucide-react";
import { apiLogin, apiSignup, setSession } from "@/lib/api";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("NG");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const cleanPhone = phone.trim().replace(/[\s+\-()]/g, "");
    if (!cleanPhone || !password) { setError("Please fill in all required fields"); return; }
    if (cleanPhone.length < 10) { setError("Include country code (e.g. 2348012345678)"); return; }
    if (isSignup && !username.trim()) { setError("Please choose a username"); return; }
    setLoading(true);
    try {
      let data;
      if (isSignup) {
        data = await apiSignup(cleanPhone, username.trim(), password, country || "NG");
        setSession(data.token, { phone: cleanPhone, username: data.user.username });
        setSuccess("Account created! $43,000 welcome bonus added. Redirecting...");
      } else {
        data = await apiLogin(cleanPhone, password);
        setSession(data.token, { phone: cleanPhone, username: data.user.username });
        setSuccess("Logged in! Redirecting...");
      }
      setTimeout(() => setLocation("/dashboard"), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Poppins', sans-serif", background: "#080812" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .auth-left { flex:1; display:none; position:relative; overflow:hidden; min-height:100vh; }
        .auth-left-bg { position:absolute; inset:0; background:url('https://cdn.myanimelist.net/images/anime/7/81309l.jpg') center/cover no-repeat; filter:brightness(.3) saturate(1.5); }
        .auth-left-overlay { position:absolute; inset:0; background:linear-gradient(135deg,rgba(8,8,18,.85) 0%,rgba(8,8,18,.3) 100%); }
        .auth-left-content { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:flex-end; padding:2.5rem; background:linear-gradient(to top,rgba(8,8,18,.96) 0%,transparent 55%); }
        .auth-chars { display:flex; gap:.6rem; margin-bottom:1.3rem; flex-wrap:wrap; }
        .auth-char-img { width:48px; height:48px; border-radius:50%; object-fit:cover; object-position:top; border:2px solid rgba(79,195,247,.45); box-shadow:0 4px 14px rgba(79,195,247,.25); transition:transform .2s; }
        .auth-char-img:hover { transform:translateY(-4px); }
        .auth-left-title { font-size:clamp(1.5rem,2.5vw,2rem); font-weight:900; color:#fff; line-height:1.2; margin-bottom:.6rem; }
        .auth-left-title span { background:linear-gradient(135deg,#4fc3f7,#ffd54f); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .auth-left-sub { color:rgba(255,255,255,.4); font-size:.83rem; line-height:1.6; }
        .auth-left-badge { display:inline-flex; align-items:center; gap:.5rem; background:rgba(79,195,247,.07); border:1px solid rgba(79,195,247,.18); border-radius:9px; padding:.4rem .8rem; margin-top:1rem; font-size:.72rem; color:#4fc3f7; font-weight:600; }
        .auth-right { width:100%; display:flex; align-items:center; justify-content:center; padding:1.5rem; background:#080812; min-height:100vh; }
        .auth-form-wrap { width:100%; max-width:400px; animation:slideUp .4s ease-out; }
        .auth-logo { display:flex; align-items:center; gap:.75rem; margin-bottom:1.8rem; }
        .auth-logo-img { width:42px; height:42px; border-radius:11px; object-fit:cover; border:2px solid rgba(79,195,247,.4); box-shadow:0 0 18px rgba(79,195,247,.22); flex-shrink:0; }
        .auth-logo-name { font-size:1.2rem; font-weight:900; color:#fff; line-height:1.1; }
        .auth-logo-sub { font-size:.6rem; color:#4fc3f7; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
        .auth-heading { font-size:clamp(1.4rem,4vw,1.65rem); font-weight:800; color:#fff; margin-bottom:.25rem; }
        .auth-subheading { color:#455a64; font-size:.85rem; margin-bottom:1.5rem; }
        .sync-note { background:rgba(79,195,247,.05); border:1px solid rgba(79,195,247,.18); border-radius:13px; padding:.85rem 1rem; margin-bottom:1.4rem; font-size:.78rem; color:#607d8b; display:flex; gap:.55rem; align-items:flex-start; line-height:1.55; }
        .sync-note strong { color:#4fc3f7; }
        .form-group { margin-bottom:1.1rem; }
        .form-label { display:flex; align-items:center; gap:.38rem; font-size:.72rem; font-weight:700; color:#455a64; margin-bottom:.42rem; text-transform:uppercase; letter-spacing:.05em; }
        .form-input-wrap { position:relative; }
        .form-icon { position:absolute; left:.88rem; top:50%; transform:translateY(-50%); color:#37474f; pointer-events:none; }
        .form-input { width:100%; padding:.82rem 1rem .82rem 2.6rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:13px; color:#eceff1; font-size:.92rem; font-family:'Poppins',sans-serif; transition:all .2s; min-height:48px; }
        .form-input::placeholder { color:#37474f; }
        .form-input:focus { outline:none; border-color:rgba(79,195,247,.5); background:rgba(79,195,247,.05); box-shadow:0 0 0 3px rgba(79,195,247,.1); }
        .form-hint { font-size:.7rem; color:#37474f; margin-top:.28rem; }
        .pass-eye { position:absolute; right:.88rem; top:50%; transform:translateY(-50%); background:none; border:none; color:#37474f; cursor:pointer; padding:4px; display:flex; align-items:center; transition:color .2s; border-radius:6px; min-width:32px; min-height:32px; justify-content:center; }
        .pass-eye:hover { color:#4fc3f7; }
        .msg { padding:.72rem 1rem; border-radius:11px; margin-bottom:.9rem; font-size:.8rem; display:flex; gap:.45rem; align-items:flex-start; }
        .msg-err { background:rgba(239,83,80,.07); border:1px solid rgba(239,83,80,.22); color:#ef9a9a; }
        .msg-ok  { background:rgba(79,195,247,.06); border:1px solid rgba(79,195,247,.22); color:#80deea; }
        .submit-btn { width:100%; padding:.95rem 1rem; min-height:52px; background:linear-gradient(135deg,#4fc3f7,#0288d1); color:#000; border:none; border-radius:50px; font-weight:700; font-size:.95rem; cursor:pointer; transition:all .25s; box-shadow:0 8px 24px rgba(79,195,247,.28); font-family:'Poppins',sans-serif; display:flex; align-items:center; justify-content:center; gap:.45rem; margin-top:.5rem; }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 13px 34px rgba(79,195,247,.48); }
        .submit-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .divider { display:flex; align-items:center; margin:1.2rem 0; color:#263238; font-size:.75rem; }
        .divider::before,.divider::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.06); }
        .divider::before { margin-right:.7rem; } .divider::after { margin-left:.7rem; }
        .toggle-link { background:none; border:none; color:#4fc3f7; cursor:pointer; font-family:'Poppins',sans-serif; font-size:.83rem; text-decoration:underline; text-underline-offset:3px; padding:4px; }
        .back-link { display:flex; align-items:center; gap:.32rem; margin-top:.75rem; color:#455a64; font-size:.8rem; cursor:pointer; justify-content:center; transition:color .2s; padding:4px; }
        .back-link:hover { color:#4fc3f7; }
        @media (min-width:800px) { .auth-left { display:block; max-width:420px; } .auth-right { border-left:1px solid rgba(255,255,255,.05); } }
        @media (min-width:1100px) { .auth-left { max-width:500px; } }
        @media (max-width:799px) { .auth-right { padding:1.2rem 1rem; align-items:flex-start; padding-top:2rem; } .auth-form-wrap { max-width:100%; } }
        @media (max-width:400px) { .auth-right { padding:1rem .85rem; padding-top:1.5rem; } .auth-heading { font-size:1.3rem; } .form-input { font-size:.88rem; } }
      `}</style>

      <div className="auth-left">
        <div className="auth-left-bg" />
        <div className="auth-left-overlay" />
        <div className="auth-left-content">
          <div className="auth-chars">
            {[
              "https://cdn.myanimelist.net/images/characters/14/282523.jpg",
              "https://cdn.myanimelist.net/images/characters/14/349249.jpg",
              "https://cdn.myanimelist.net/images/characters/14/266229.jpg",
              "https://cdn.myanimelist.net/images/characters/8/301302.jpg",
            ].map((src, i) => <img key={i} className="auth-char-img" src={src} alt="character" />)}
          </div>
          <div className="auth-left-title"><span>Konosuba</span><br />Community Bot</div>
          <div className="auth-left-sub">Economy, RPG, Pokémon, gambling and more — all synced live between WhatsApp and your dashboard.</div>
          <div className="auth-left-badge">⚔️ KonoSuba: God's Blessing on This Wonderful World!</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-logo">
            <img className="auth-logo-img" src="https://cdn.myanimelist.net/images/characters/14/282523.jpg" alt="Aqua" />
            <div>
              <div className="auth-logo-name">Konosuba</div>
              <div className="auth-logo-sub">Community Bot</div>
            </div>
          </div>

          <div className="auth-heading">{isSignup ? "Create Account" : "Welcome Back"}</div>
          <div className="auth-subheading">{isSignup ? "Join the Konosuba community" : "Sign in to your dashboard"}</div>

          <div className="sync-note">
            <Phone size={13} style={{ flexShrink: 0, marginTop: 2, color: "#4fc3f7" }} />
            <span>
              {isSignup
                ? <><strong>Use your WhatsApp number</strong> — it links the bot to your dashboard.</>
                : <>Sign in with the <strong>WhatsApp number</strong> you registered with.</>}
            </span>
          </div>

          {error && <div className="msg msg-err">❌ {error}</div>}
          {success && <div className="msg msg-ok">✅ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="form-label"><Phone size={11} /> WhatsApp Number</div>
              <div className="form-input-wrap">
                <Phone size={14} className="form-icon" />
                <input className="form-input" type="tel" placeholder="e.g. 2348012345678" value={phone} onChange={e => setPhone(e.target.value)} required autoComplete="tel" />
              </div>
              <div className="form-hint">Country code + number, no + or spaces (234 = Nigeria)</div>
            </div>

            {isSignup && (
              <div className="form-group">
                <div className="form-label"><User size={11} /> Username</div>
                <div className="form-input-wrap">
                  <User size={14} className="form-icon" />
                  <input className="form-input" type="text" placeholder="Choose a display name" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />
                </div>
              </div>
            )}

            <div className="form-group">
              <div className="form-label"><Lock size={11} /> Password</div>
              <div className="form-input-wrap">
                <Lock size={14} className="form-icon" />
                <input className="form-input" type={showPass ? "text" : "password"} style={{ paddingRight: "2.8rem" }} placeholder={isSignup ? "Create a password" : "Enter your password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isSignup ? "new-password" : "current-password"} />
                <button type="button" className="pass-eye" onClick={() => setShowPass(s => !s)} aria-label={showPass ? "Hide password" : "Show password"}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="form-group">
                <div className="form-label"><Globe size={11} /> Country</div>
                <div className="form-input-wrap">
                  <Globe size={14} className="form-icon" />
                  <input className="form-input" type="text" placeholder="NG, US, GH, UK…" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} maxLength={3} />
                </div>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Processing…</> : isSignup ? "🎉 Create Account" : "Sign In →"}
            </button>
          </form>

          <div className="divider">or</div>
          <div style={{ textAlign: "center" }}>
            <button className="toggle-link" onClick={() => { setIsSignup(s => !s); setError(""); setSuccess(""); }}>
              {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </button>
          </div>
          <div className="back-link" onClick={() => setLocation("/")}>
            <ArrowLeft size={13} /> Back to Home
          </div>
        </div>
      </div>
    </div>
  );
}
