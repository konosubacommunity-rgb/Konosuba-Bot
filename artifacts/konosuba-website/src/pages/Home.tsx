import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Shield, Users, TrendingUp, Wallet, Star, ChevronRight, MessageCircle, Swords, Trophy, Sparkles, Menu, X } from "lucide-react";

const CHARS = [
  { name: "Aqua", role: "Goddess · Useless but loveable", img: "https://cdn.myanimelist.net/images/characters/14/282523.jpg", color: "#4fc3f7", glow: "rgba(79,195,247,0.4)" },
  { name: "Megumin", role: "Arch-Wizard · Explosion!", img: "https://cdn.myanimelist.net/images/characters/14/349249.jpg", color: "#ef5350", glow: "rgba(239,83,80,0.4)" },
  { name: "Darkness", role: "Crusader · M-Masochist", img: "https://cdn.myanimelist.net/images/characters/14/266229.jpg", color: "#ffd54f", glow: "rgba(255,213,79,0.4)" },
  { name: "Kazuma", role: "Adventurer · Reincarnated", img: "https://cdn.myanimelist.net/images/characters/8/301302.jpg", color: "#a5d6a7", glow: "rgba(165,214,167,0.4)" },
];

const FEATURES = [
  { icon: <Wallet size={20} />, title: "Economy System", desc: "Wallet, bank, daily rewards, fishing, digging and more. All synced live.", color: "#4fc3f7" },
  { icon: <Zap size={20} />, title: "Real-Time Sync", desc: "Everything you do on WhatsApp appears instantly on your dashboard.", color: "#ffd54f" },
  { icon: <Star size={20} />, title: "Level & XP", desc: "Level up, earn XP, track your progress and climb the leaderboard.", color: "#ce93d8" },
  { icon: <Swords size={20} />, title: "RPG & Combat", desc: "Battle monsters, join dungeons, unlock classes and gear up for war.", color: "#ef5350" },
  { icon: <Sparkles size={20} />, title: "Pokémon", desc: "Catch Pokémon, battle, evolve, collect shiny variants and trade.", color: "#a5d6a7" },
  { icon: <TrendingUp size={20} />, title: "Gambling", desc: "Coinflip, slots, blackjack, roulette — high risk, high reward.", color: "#ffb74d" },
  { icon: <Shield size={20} />, title: "Group Tools", desc: "Anti-link, welcome messages, admin control and group management.", color: "#80cbc4" },
  { icon: <Users size={20} />, title: "Community", desc: "Guilds, leaderboards, gifting, achievements and global events.", color: "#f48fb1" },
];

const BANNERS = [
  "https://cdn.myanimelist.net/images/anime/3/76876l.jpg",
  "https://cdn.myanimelist.net/images/anime/8/77831l.jpg",
  "https://cdn.myanimelist.net/images/anime/10/81308l.jpg",
  "https://cdn.myanimelist.net/images/anime/1895/142748l.jpg",
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Poppins', sans-serif", background: "#080812", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        img { max-width: 100%; display: block; }
        .kn-nav { display:flex; justify-content:space-between; align-items:center; padding:.9rem 1.5rem; background:rgba(8,8,18,.92); backdrop-filter:blur(24px); border-bottom:1px solid rgba(79,195,247,.12); position:sticky; top:0; z-index:200; gap:1rem; }
        .kn-logo { display:flex; align-items:center; gap:.65rem; flex-shrink:0; }
        .kn-logo-img { width:38px; height:38px; border-radius:10px; object-fit:cover; border:2px solid rgba(79,195,247,.4); box-shadow:0 0 14px rgba(79,195,247,.3); flex-shrink:0; }
        .kn-logo-name { font-size:1.05rem; font-weight:900; color:#fff; line-height:1.1; }
        .kn-logo-sub { font-size:.6rem; color:#4fc3f7; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .kn-nav-links { display:flex; gap:1.6rem; list-style:none; }
        .kn-nav-links a { color:#78909c; font-weight:500; font-size:.85rem; cursor:pointer; transition:color .2s; white-space:nowrap; }
        .kn-nav-links a:hover { color:#4fc3f7; }
        .kn-nav-btns { display:flex; gap:.6rem; flex-shrink:0; }
        .btn-ghost { background:transparent; border:1px solid rgba(79,195,247,.3); color:#4fc3f7; padding:.5rem 1.1rem; border-radius:50px; font-weight:600; font-size:.82rem; cursor:pointer; transition:all .2s; font-family:'Poppins',sans-serif; white-space:nowrap; }
        .btn-ghost:hover { background:rgba(79,195,247,.1); }
        .btn-main { background:linear-gradient(135deg,#4fc3f7,#0288d1); color:#000; border:none; padding:.5rem 1.3rem; border-radius:50px; font-weight:700; font-size:.82rem; cursor:pointer; transition:all .25s; font-family:'Poppins',sans-serif; white-space:nowrap; box-shadow:0 4px 14px rgba(79,195,247,.3); }
        .btn-main:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(79,195,247,.5); }
        .hamburger { display:none; background:none; border:1px solid rgba(79,195,247,.3); color:#4fc3f7; border-radius:8px; padding:.4rem; cursor:pointer; align-items:center; justify-content:center; }
        .mobile-menu { display:none; flex-direction:column; gap:0; background:rgba(8,8,18,.98); border-bottom:1px solid rgba(79,195,247,.12); position:fixed; top:57px; left:0; right:0; z-index:199; backdrop-filter:blur(24px); }
        .mobile-menu.open { display:flex; }
        .mobile-menu a { display:block; padding:.9rem 1.5rem; color:#90a4ae; font-weight:500; font-size:.95rem; cursor:pointer; border-bottom:1px solid rgba(255,255,255,.04); transition:color .2s; }
        .mobile-menu a:hover { color:#4fc3f7; }
        .mobile-menu-btns { display:flex; gap:.7rem; padding:1rem 1.5rem; }
        .mobile-menu-btns .btn-ghost,.mobile-menu-btns .btn-main { flex:1; text-align:center; padding:.7rem 1rem; font-size:.9rem; }
        .hero { position:relative; min-height:90vh; display:flex; align-items:center; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; background:url('https://cdn.myanimelist.net/images/anime/10/81308l.jpg') center/cover no-repeat; filter:brightness(.2) saturate(1.4); }
        .hero-overlay { position:absolute; inset:0; background:linear-gradient(135deg,rgba(8,8,18,.95) 0%,rgba(8,8,18,.6) 50%,rgba(8,8,18,.9) 100%); }
        .hero-glow { position:absolute; width:500px; height:500px; border-radius:50%; background:radial-gradient(circle,rgba(79,195,247,.1),transparent 70%); top:-100px; right:0; pointer-events:none; }
        .hero-inner { position:relative; z-index:2; max-width:1100px; margin:0 auto; padding:3rem 1.5rem; display:flex; gap:3rem; align-items:center; flex-wrap:wrap; width:100%; }
        .hero-text { flex:1; min-width:0; }
        .hero-eyebrow { display:inline-flex; align-items:center; gap:.5rem; background:rgba(79,195,247,.08); border:1px solid rgba(79,195,247,.25); border-radius:50px; padding:.35rem .9rem; margin-bottom:1.2rem; font-size:.72rem; color:#4fc3f7; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
        .hero-title { font-size:clamp(2rem,6vw,4rem); font-weight:900; line-height:1.1; margin-bottom:1rem; letter-spacing:-.02em; }
        .hero-title .g1 { background:linear-gradient(135deg,#fff 0%,#e0f7fa 60%,#4fc3f7 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .hero-title .g2 { background:linear-gradient(135deg,#ffd54f,#ef5350); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .hero-desc { color:#78909c; font-size:clamp(.88rem,2vw,1rem); line-height:1.75; margin-bottom:1.8rem; }
        .hero-btns { display:flex; gap:.8rem; flex-wrap:wrap; }
        .btn-hero-primary { display:inline-flex; align-items:center; gap:.45rem; background:linear-gradient(135deg,#4fc3f7,#0288d1); color:#000; border:none; padding:.9rem 1.8rem; border-radius:50px; font-weight:700; font-size:.95rem; cursor:pointer; transition:all .25s; box-shadow:0 10px 28px rgba(79,195,247,.3); font-family:'Poppins',sans-serif; }
        .btn-hero-primary:hover { transform:translateY(-3px); box-shadow:0 16px 40px rgba(79,195,247,.5); }
        .btn-hero-sec { display:inline-flex; align-items:center; gap:.45rem; background:rgba(255,213,79,.07); border:1px solid rgba(255,213,79,.3); color:#ffd54f; padding:.9rem 1.8rem; border-radius:50px; font-weight:600; font-size:.95rem; cursor:pointer; transition:all .25s; font-family:'Poppins',sans-serif; }
        .btn-hero-sec:hover { background:rgba(255,213,79,.14); }
        .anime-badge { display:inline-flex; align-items:center; gap:.55rem; background:rgba(255,213,79,.05); border:1px solid rgba(255,213,79,.18); border-radius:10px; padding:.45rem .9rem; margin-top:1.4rem; font-size:.75rem; color:#ffd54f; font-weight:600; flex-wrap:wrap; }
        .anime-badge img { width:22px; height:22px; border-radius:5px; object-fit:cover; flex-shrink:0; }
        .hero-chars { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; flex:0 0 300px; }
        .char-card { position:relative; border-radius:16px; overflow:hidden; aspect-ratio:.72; cursor:pointer; transition:transform .3s,box-shadow .3s; border:1px solid rgba(255,255,255,.06); }
        .char-card:hover { transform:translateY(-5px); }
        .char-card img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }
        .char-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 55%); }
        .char-info { position:absolute; bottom:0; left:0; right:0; padding:.6rem .75rem; }
        .char-name { font-weight:800; font-size:.78rem; margin-bottom:.08rem; }
        .char-role { font-size:.6rem; color:rgba(255,255,255,.55); }
        .stats-strip { background:linear-gradient(135deg,rgba(79,195,247,.05),rgba(255,213,79,.03)); border-top:1px solid rgba(79,195,247,.08); border-bottom:1px solid rgba(79,195,247,.08); padding:1.8rem 1.5rem; display:flex; justify-content:center; gap:clamp(1.5rem,5vw,4rem); flex-wrap:wrap; }
        .stat-block { text-align:center; }
        .stat-num { font-size:clamp(1.6rem,4vw,2.2rem); font-weight:900; background:linear-gradient(135deg,#4fc3f7,#ffd54f); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .stat-lbl { color:#455a64; font-size:.78rem; font-weight:500; margin-top:.2rem; }
        .kn-section { max-width:1100px; margin:0 auto; padding:4rem 1.5rem; }
        .section-tag { display:inline-flex; align-items:center; gap:.4rem; background:rgba(206,147,216,.07); border:1px solid rgba(206,147,216,.22); border-radius:50px; padding:.28rem .85rem; font-size:.68rem; color:#ce93d8; font-weight:700; letter-spacing:.07em; text-transform:uppercase; margin-bottom:.8rem; }
        .section-title { font-size:clamp(1.6rem,4vw,2.2rem); font-weight:900; margin-bottom:.55rem; letter-spacing:-.01em; }
        .section-sub { color:#455a64; font-size:.9rem; margin-bottom:2.5rem; line-height:1.7; }
        .feat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:.9rem; }
        .feat-card { background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:18px; padding:1.3rem; transition:all .25s; position:relative; overflow:hidden; }
        .feat-card::before { content:''; position:absolute; inset:0; border-radius:18px; background:var(--feat-glow,transparent); opacity:0; transition:opacity .3s; }
        .feat-card:hover { border-color:var(--feat-border,rgba(255,255,255,.12)); transform:translateY(-3px); }
        .feat-card:hover::before { opacity:1; }
        .feat-icon-wrap { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:.9rem; background:var(--feat-icon-bg,rgba(255,255,255,.07)); color:var(--feat-color,#fff); flex-shrink:0; }
        .feat-title { font-weight:700; font-size:.9rem; margin-bottom:.35rem; }
        .feat-desc { color:#455a64; font-size:.78rem; line-height:1.6; }
        .chars-section { background:linear-gradient(135deg,rgba(79,195,247,.03),rgba(239,83,80,.02)); border-top:1px solid rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.04); padding:4rem 1.5rem; }
        .chars-inner { max-width:1100px; margin:0 auto; }
        .chars-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; }
        .big-char-card { position:relative; border-radius:20px; overflow:hidden; aspect-ratio:.65; cursor:pointer; border:1px solid rgba(255,255,255,.06); transition:all .3s; }
        .big-char-card:hover { transform:translateY(-7px); border-color:var(--char-border,rgba(255,255,255,.18)); box-shadow:0 18px 44px var(--char-glow,rgba(0,0,0,.4)); }
        .big-char-card img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; filter:brightness(.82); transition:filter .3s; }
        .big-char-card:hover img { filter:brightness(1); }
        .big-char-overlay { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.1) 55%,transparent 100%); }
        .big-char-info { position:absolute; bottom:0; left:0; right:0; padding:1rem; }
        .big-char-name { font-weight:800; font-size:clamp(.9rem,2vw,1.05rem); margin-bottom:.22rem; }
        .big-char-role { font-size:.68rem; color:rgba(255,255,255,.5); line-height:1.4; }
        .char-badge { display:inline-block; padding:.14rem .5rem; border-radius:6px; font-size:.6rem; font-weight:700; margin-top:.38rem; background:var(--char-badge-bg,rgba(255,255,255,.1)); color:var(--char-badge-color,#fff); }
        .gallery-wrap { max-width:1100px; margin:0 auto; padding:0 1.5rem 4rem; }
        .gallery-row { display:grid; grid-template-columns:repeat(4,1fr); gap:.8rem; }
        .gallery-img { border-radius:14px; overflow:hidden; aspect-ratio:1.4; border:1px solid rgba(255,255,255,.05); transition:all .3s; }
        .gallery-img:hover { transform:scale(1.03); border-color:rgba(79,195,247,.28); }
        .gallery-img img { width:100%; height:100%; object-fit:cover; display:block; }
        .cta-section { background:linear-gradient(135deg,rgba(79,195,247,.06),rgba(239,83,80,.04),rgba(255,213,79,.05)); border-top:1px solid rgba(79,195,247,.12); padding:5rem 1.5rem; text-align:center; }
        .cta-inner { max-width:680px; margin:0 auto; }
        .cta-title { font-size:clamp(1.8rem,5vw,3rem); font-weight:900; margin-bottom:.9rem; letter-spacing:-.02em; }
        .cta-desc { color:#455a64; font-size:.95rem; line-height:1.75; margin-bottom:2.2rem; }
        .cta-steps { display:flex; justify-content:center; gap:1.2rem; flex-wrap:wrap; margin-bottom:2.2rem; }
        .cta-step { display:flex; align-items:center; gap:.5rem; color:#607d8b; font-size:.85rem; }
        .step-num { width:26px; height:26px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,#4fc3f7,#0288d1); display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:800; color:#000; }
        footer { padding:2rem 1.5rem; text-align:center; border-top:1px solid rgba(255,255,255,.05); color:#37474f; font-size:.78rem; }
        footer span { color:#4fc3f7; }
        .footer-chars { display:flex; justify-content:center; gap:.45rem; margin-bottom:.7rem; flex-wrap:wrap; }
        .footer-char-img { width:30px; height:30px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,.1); }
        @media (max-width:900px) { .kn-nav-links,.kn-nav-btns { display:none; } .hamburger { display:flex; } .hero-chars { flex:0 0 260px; } .chars-grid { grid-template-columns:repeat(2,1fr); } .gallery-row { grid-template-columns:repeat(2,1fr); } .feat-grid { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:600px) { .kn-nav { padding:.75rem 1rem; } .hero { min-height:auto; } .hero-inner { flex-direction:column; gap:1.8rem; padding:2rem 1rem; } .hero-chars { flex:none; width:100%; max-width:340px; align-self:center; } .hero-btns { flex-direction:column; } .btn-hero-primary,.btn-hero-sec { justify-content:center; width:100%; padding:.85rem 1.4rem; } .anime-badge { font-size:.68rem; } .stats-strip { gap:1.2rem; padding:1.4rem 1rem; } .kn-section { padding:3rem 1rem; } .feat-grid { grid-template-columns:1fr; } .chars-section { padding:3rem 1rem; } .chars-grid { grid-template-columns:repeat(2,1fr); gap:.7rem; } .gallery-wrap { padding:0 1rem 3rem; } .gallery-row { grid-template-columns:repeat(2,1fr); gap:.55rem; } .cta-section { padding:3.5rem 1rem; } .cta-steps { flex-direction:column; align-items:flex-start; padding-left:1rem; } footer { padding:1.5rem 1rem; } }
      `}</style>

      <nav className="kn-nav">
        <div className="kn-logo">
          <img className="kn-logo-img" src="https://cdn.myanimelist.net/images/characters/14/282523.jpg" alt="Aqua" />
          <div>
            <div className="kn-logo-name">Konosuba</div>
            <div className="kn-logo-sub">Community Bot</div>
          </div>
        </div>
        <ul className="kn-nav-links">
          <li><a>Features</a></li>
          <li><a>Characters</a></li>
          <li><a>Commands</a></li>
          <li><a>Community</a></li>
        </ul>
        <div className="kn-nav-btns">
          <button className="btn-ghost" onClick={() => setLocation("/auth")}>Sign In</button>
          <button className="btn-main" onClick={() => setLocation("/auth")}>Get Started</button>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        {["Features", "Characters", "Commands", "Community"].map(l => (
          <a key={l} onClick={() => setMenuOpen(false)}>{l}</a>
        ))}
        <div className="mobile-menu-btns">
          <button className="btn-ghost" onClick={() => { setMenuOpen(false); setLocation("/auth"); }}>Sign In</button>
          <button className="btn-main" onClick={() => { setMenuOpen(false); setLocation("/auth"); }}>Get Started</button>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-eyebrow">⚔️ God's Blessing on This Wonderful World!</div>
            <h1 className="hero-title">
              <span className="g1">Konosuba</span><br />
              <span className="g2">Community</span><br />
              <span style={{ color: "#fff", fontSize: "75%" }}>WhatsApp Bot</span>
            </h1>
            <p className="hero-desc">
              The ultimate anime-themed WhatsApp bot — economy, RPG, Pokémon, gambling and more.
              Register once and your entire adventure syncs live to your web dashboard.
            </p>
            <div className="hero-btns">
              <button className="btn-hero-primary" onClick={() => setLocation("/auth")}>
                Join the Party <ChevronRight size={17} />
              </button>
              <button className="btn-hero-sec" onClick={() => setLocation("/dashboard")}>
                <MessageCircle size={15} /> View Dashboard
              </button>
            </div>
            <div className="anime-badge">
              <img src="https://cdn.myanimelist.net/images/anime/1895/142748l.jpg" alt="KonoSuba" />
              KonoSuba: God's Blessing · 3 Seasons · ⭐ 8.09 on MAL
            </div>
          </div>
          <div className="hero-chars">
            {CHARS.map(c => (
              <div key={c.name} className="char-card" style={{ boxShadow: `0 6px 24px ${c.glow}`, border: `1px solid ${c.color}28` }}>
                <img src={c.img} alt={c.name} />
                <div className="char-overlay" />
                <div className="char-info">
                  <div className="char-name" style={{ color: c.color }}>{c.name}</div>
                  <div className="char-role">{c.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="stats-strip">
        {[{ num: "50+", lbl: "Commands" }, { num: "4", lbl: "Characters" }, { num: "∞", lbl: "Adventures" }, { num: "24/7", lbl: "Online" }].map(s => (
          <div className="stat-block" key={s.lbl}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <section className="kn-section">
        <div className="section-tag"><Sparkles size={10} /> Bot Features</div>
        <h2 className="section-title" style={{ color: "#fff" }}>Everything in One Bot</h2>
        <p className="section-sub">All your favourite activities — all synced live between WhatsApp and your web dashboard.</p>
        <div className="feat-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feat-card" style={{
              ['--feat-color' as string]: f.color,
              ['--feat-icon-bg' as string]: `${f.color}18`,
              ['--feat-border' as string]: `${f.color}28`,
              ['--feat-glow' as string]: `radial-gradient(ellipse at top left, ${f.color}07, transparent 70%)`,
            }}>
              <div className="feat-icon-wrap">{f.icon}</div>
              <div className="feat-title" style={{ color: "#eceff1" }}>{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="chars-section">
        <div className="chars-inner">
          <div style={{ textAlign: "center", marginBottom: "2.2rem" }}>
            <div className="section-tag"><Trophy size={10} /> The Party</div>
            <h2 className="section-title" style={{ color: "#fff" }}>Meet the Characters</h2>
            <p className="section-sub" style={{ maxWidth: 480, margin: "0 auto" }}>The bot is themed around these legendary characters from KonoSuba.</p>
          </div>
          <div className="chars-grid">
            {[
              { name: "Aqua", role: "Goddess of Water\nUseless, crybaby, but weirdly endearing.", img: CHARS[0].img, color: CHARS[0].color, glow: CHARS[0].glow, badge: "Goddess", badgeBg: "rgba(79,195,247,.18)", badgeColor: "#4fc3f7" },
              { name: "Megumin", role: "Arch-Wizard\nOne explosion per day. That's all she needs.", img: CHARS[1].img, color: CHARS[1].color, glow: CHARS[1].glow, badge: "Wizard", badgeBg: "rgba(239,83,80,.18)", badgeColor: "#ef5350" },
              { name: "Darkness", role: "Crusader · Lalatina\nNoblewomen by day, battle-junkie by heart.", img: CHARS[2].img, color: CHARS[2].color, glow: CHARS[2].glow, badge: "Crusader", badgeBg: "rgba(255,213,79,.18)", badgeColor: "#ffd54f" },
              { name: "Kazuma", role: "Adventurer\nReincarnated NEET. Surprisingly the most capable.", img: CHARS[3].img, color: CHARS[3].color, glow: CHARS[3].glow, badge: "Adventurer", badgeBg: "rgba(165,214,167,.18)", badgeColor: "#a5d6a7" },
            ].map(c => (
              <div key={c.name} className="big-char-card" style={{
                ['--char-border' as string]: `${c.color}45`,
                ['--char-glow' as string]: c.glow,
                ['--char-badge-bg' as string]: c.badgeBg,
                ['--char-badge-color' as string]: c.badgeColor,
              }}>
                <img src={c.img} alt={c.name} />
                <div className="big-char-overlay" />
                <div className="big-char-info">
                  <div className="big-char-name" style={{ color: c.color }}>{c.name}</div>
                  <div className="big-char-role">{c.role}</div>
                  <span className="char-badge">{c.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gallery-wrap">
        <div className="gallery-row">
          {BANNERS.map((src, i) => (
            <div key={i} className="gallery-img">
              <img src={src} alt={`KonoSuba ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>

      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title" style={{ color: "#fff" }}>Ready to Join the<br /><span style={{ background: "linear-gradient(135deg,#4fc3f7,#ffd54f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Adventure?</span></h2>
          <p className="cta-desc">Sign up in 30 seconds. Use your WhatsApp number and your stats sync instantly between the app and the bot.</p>
          <div className="cta-steps">
            {["Sign up with your WhatsApp number", "Message the bot to link your account", "Watch your stats sync live on the dashboard"].map((step, i) => (
              <div className="cta-step" key={i}>
                <div className="step-num">{i + 1}</div>
                {step}
              </div>
            ))}
          </div>
          <button className="btn-hero-primary" onClick={() => setLocation("/auth")} style={{ fontSize: "1rem", padding: "1rem 2.2rem" }}>
            Create Your Account <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <footer>
        <div className="footer-chars">
          {CHARS.map(c => <img key={c.name} className="footer-char-img" src={c.img} alt={c.name} />)}
        </div>
        © 2025 <span>Konosuba Community Bot</span>. Built with ⚔️ and magic.
      </footer>
    </div>
  );
}
