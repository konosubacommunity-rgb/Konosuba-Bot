import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }

// ── Real KonoSuba anime character images — Fandom Wiki CDN (transparent PNGs)
const IMGS = {
  kazuma:   'https://static.wikia.nocookie.net/konosuba/images/4/4f/Kazuma_Anime.png/revision/latest?width=420',
  aqua:     'https://static.wikia.nocookie.net/konosuba/images/9/9e/Aqua_Anime.png/revision/latest?width=420',
  megumin:  'https://static.wikia.nocookie.net/konosuba/images/9/97/Megumin_Anime.png/revision/latest?width=420',
  darkness: 'https://static.wikia.nocookie.net/konosuba/images/d/d5/Darkness_Anime.png/revision/latest?width=420',
  wiz:      'https://static.wikia.nocookie.net/konosuba/images/e/eb/Wiz_Anime.png/revision/latest?width=300',
  yunyun:   'https://static.wikia.nocookie.net/konosuba/images/5/57/Yunyun_Anime.png/revision/latest?width=300',
};

const PARTY = [
  { img: IMGS.kazuma,   name: 'Kazuma Satou',  role: 'Adventurer · Leader',     color: '#00d4ff', desc: 'The cunning strategist. Masters luck and steals skills from any enemy.' },
  { img: IMGS.aqua,     name: 'Aqua',           role: 'Goddess · Arch-Priest',   color: '#38bdf8', desc: 'Water goddess with divine healing — and frequently questionable decisions.' },
  { img: IMGS.megumin,  name: 'Megumin',        role: 'Arch-Wizard · Explosion', color: '#f472b6', desc: 'One-shot explosion magic only. Every single day. No exceptions whatsoever.' },
  { img: IMGS.darkness, name: 'Darkness',       role: 'Crusader · Tank',         color: '#ffd700', desc: 'Unbreakable defender with a deeply complicated relationship with pain.' },
];

const FEATURES = [
  { icon: '🤖', title: 'AI Chat', desc: 'Advanced AI-powered conversations with context memory and multi-language support.' },
  { icon: '🛡️', title: 'Moderation', desc: 'Auto-ban, spam protection, word filters, and smart link detection.' },
  { icon: '🔗', title: 'Anti-Link', desc: 'Intelligent link filtering with whitelist support and custom rules.' },
  { icon: '💰', title: 'Economy', desc: 'Full RPG economy system with wallet, bank, items, and trading.' },
  { icon: '⚡', title: 'Auto Responses', desc: 'Trigger-based auto-reply system with rich message formatting.' },
  { icon: '🎵', title: 'Music', desc: 'Stream audio from YouTube, Spotify links, and custom sources.' },
  { icon: '📊', title: 'Analytics', desc: 'Real-time group stats, message counts, and activity graphs.' },
  { icon: '📜', title: 'Logging', desc: 'Full audit trail for group events, joins, leaves, and admin actions.' },
  { icon: '👋', title: 'Welcome Messages', desc: 'Customizable welcome and goodbye messages with member cards.' },
  { icon: '💾', title: 'Backup System', desc: 'Automated group data backup and restore with cloud storage.' },
  { icon: '👥', title: 'Group Management', desc: 'Promote, demote, kick, mute members with bulk action support.' },
  { icon: '💎', title: 'Premium Features', desc: 'Exclusive commands, priority processing, and advanced tools.' },
];

const COMMANDS = [
  { name: '.ai', desc: 'Chat with AI assistant', cat: 'AI' },
  { name: '.imagine', desc: 'Generate AI artwork', cat: 'AI' },
  { name: '.ban', desc: 'Ban a group member', cat: 'Moderation' },
  { name: '.warn', desc: 'Issue a warning to user', cat: 'Moderation' },
  { name: '.mute', desc: 'Mute a member temporarily', cat: 'Moderation' },
  { name: '.balance', desc: 'Check your coin balance', cat: 'Economy' },
  { name: '.daily', desc: 'Claim daily reward coins', cat: 'Economy' },
  { name: '.transfer', desc: 'Transfer coins to a user', cat: 'Economy' },
  { name: '.play', desc: 'Play audio in group', cat: 'Music' },
  { name: '.lyrics', desc: 'Get song lyrics', cat: 'Music' },
  { name: '.welcome', desc: 'Set welcome message', cat: 'Admin' },
  { name: '.backup', desc: 'Backup group data', cat: 'Admin' },
  { name: '.stats', desc: 'View group statistics', cat: 'Admin' },
  { name: '.antilnk', desc: 'Toggle anti-link mode', cat: 'Admin' },
  { name: '.sticker', desc: 'Convert image to sticker', cat: 'Media' },
  { name: '.toimg', desc: 'Convert sticker to image', cat: 'Media' },
];

const TESTIMONIALS = [
  { img: IMGS.kazuma,   name: 'Kazuma S.',   role: 'Group Admin · 4,200 members', text: 'This bot completely transformed our community. The RPG economy keeps everyone engaged and the moderation tools are leagues ahead of anything else.', stars: 5 },
  { img: IMGS.aqua,     name: 'Aqua D.',     role: 'Server Owner · 12k users',    text: 'The anime aesthetic is absolutely stunning. My members love the visual style and the AI chat feature has been a game changer for engagement.', stars: 5 },
  { img: IMGS.darkness, name: 'Darkness C.', role: 'Raid Leader · Premium',       text: 'Premium plan is 100% worth it. The advanced analytics and priority processing make managing our large community effortless.', stars: 5 },
  { img: IMGS.megumin,  name: 'Megumin A.',  role: 'Bot Developer',               text: 'As a developer I appreciate the clean architecture and extensive admin tools. The webhook integration with custom bots is seamless.', stars: 5 },
  { img: IMGS.wiz,      name: 'Wiz V.',      role: 'Content Creator',             text: 'Setup took literally 5 minutes. The documentation is clear and the support team responds faster than any other bot service I\'ve used.', stars: 5 },
  { img: IMGS.yunyun,   name: 'Yunyun Y.',   role: 'Community Manager',           text: 'The economy system alone is worth the subscription. Members are completing quests, trading items, and it\'s created a whole new layer of engagement.', stars: 5 },
];

const PRICING = [
  { tier: 'Adventurer', price: 'Free', period: 'forever', features: ['50 commands/day', 'Basic moderation', 'Economy system', 'Welcome messages', '3 groups max', 'Community support'], featured: false },
  { tier: 'Knight',     price: '$9',   period: '/month',  features: ['Unlimited commands', 'AI Chat (100 msgs/day)', 'Advanced moderation', 'Music streaming', 'Analytics dashboard', '15 groups', 'Priority support'], featured: true },
  { tier: 'Legend',     price: '$24',  period: '/month',  features: ['Everything in Knight', 'Unlimited AI messages', 'Custom branding', 'Backup system', 'Premium analytics', 'Unlimited groups', '24/7 dedicated support', 'Early access features'], featured: false },
];

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0; const step = target / 60;
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        setCount(Math.floor(start));
        if (start >= target) clearInterval(timer);
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <div ref={ref} className="stat-number">{count.toLocaleString()}{suffix}</div>;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({});
  const [cmdSearch, setCmdSearch] = useState('');
  const [cmdCat, setCmdCat] = useState('All');
  const cats = ['All', 'AI', 'Economy', 'Moderation', 'Music', 'Admin', 'Media'];
  const filtered = COMMANDS.filter(c =>
    (cmdCat === 'All' || c.cat === cmdCat) &&
    (cmdSearch === '' || c.name.includes(cmdSearch) || c.desc.toLowerCase().includes(cmdSearch.toLowerCase()))
  );

  useEffect(() => {
    api.stats().then(s => setStats(s as Stats)).catch(() => {});

    // Custom cursor glow
    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    document.body.appendChild(cursor);
    const move = (e: MouseEvent) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; };
    document.addEventListener('mousemove', move);

    // Particle canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'particles-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.6 ? '#00d4ff' : Math.random() > 0.5 ? '#ffd700' : '#8b5cf6',
    }));
    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(drawParticles);
    }
    drawParticles();

    return () => {
      document.removeEventListener('mousemove', move);
      cursor.remove(); canvas.remove();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>

      <style>{`
        @keyframes float-char {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes float-char-r {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">⚔ KONOSUBA</a>
        <div className="navbar-links">
          <a href="#party"      className="navbar-link">Party</a>
          <a href="#features"   className="navbar-link">Features</a>
          <a href="#commands"   className="navbar-link">Commands</a>
          <a href="#pricing"    className="navbar-link">Premium</a>
          <a href="#testimonials" className="navbar-link">Reviews</a>
        </div>
        <div className="navbar-actions">
          <Link to="/auth"               className="ghost-btn" style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>Login</Link>
          <Link to="/auth?mode=register" className="glow-btn"  style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>Join Free</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ overflow: 'visible' }}>
        <div className="hero-bg" />
        <div className="hero-grid" />

        {/* Floating rune symbols */}
        {['⚔', '✦', '◈', '⬡', '✧', '◆'].map((r, i) => (
          <div key={i} className="rune" style={{ left: `${10 + i * 16}%`, top: `${20 + (i % 3) * 25}%`, animationDelay: `${i * 1.2}s` }}>{r}</div>
        ))}

        {/* Aqua — floating left */}
        <img
          src={IMGS.aqua}
          alt="Aqua"
          style={{
            position: 'absolute', bottom: 0, left: '1%',
            height: '74vh', maxHeight: 570, width: 'auto',
            objectFit: 'contain', zIndex: 1, opacity: 0.9,
            filter: 'drop-shadow(0 0 28px rgba(56,189,248,0.45))',
            animation: 'float-char 6.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Megumin — floating right */}
        <img
          src={IMGS.megumin}
          alt="Megumin"
          style={{
            position: 'absolute', bottom: 0, right: '1%',
            height: '68vh', maxHeight: 530, width: 'auto',
            objectFit: 'contain', zIndex: 1, opacity: 0.9,
            filter: 'drop-shadow(0 0 28px rgba(244,114,182,0.45))',
            animation: 'float-char-r 7.2s ease-in-out infinite 1.2s',
            pointerEvents: 'none',
          }}
        />

        <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-badge fade-in">
            <span>⚡</span> Now with Advanced AI Integration
          </div>
          <h1 className="hero-title fade-up delay-1">
            God's Blessing on<br />Your WhatsApp
          </h1>
          <p className="hero-subtitle fade-up delay-2">
            The ultimate KonoSuba-themed WhatsApp bot platform with automation, moderation, AI, RPG economy, and advanced management — all in one legendary tool.
          </p>
          <div className="hero-buttons fade-up delay-3">
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="glow-btn">
              ⚡ Invite Bot
            </a>
            <Link to="/dashboard" className="gold-btn">
              ◈ Open Dashboard
            </Link>
            <a href="#pricing" className="ghost-btn">
              💎 Premium Plans
            </a>
          </div>
        </div>

        <div className="hero-scroll">
          <span>Scroll to explore</span>
          <div style={{ fontSize: '1.2rem' }}>↓</div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="section-inner">
          <div className="stats-grid">
            {[
              { label: 'Active Groups',   target: stats.activeBots ? stats.activeBots * 12 : 8420, suffix: '+' },
              { label: 'Total Users',     target: stats.totalUsers ?? 52000, suffix: '+' },
              { label: 'Commands Used',   target: 2800000, suffix: '+' },
              { label: 'Uptime',          target: 99, suffix: '.9%' },
              { label: 'Premium Members', target: 3200, suffix: '+' },
            ].map((s, i) => (
              <div key={i} className="glass-card stat-card">
                <Counter target={s.target} suffix={s.suffix} />
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET THE PARTY ──────────────────────────────────────────────── */}
      <section className="section" id="party">
        <div className="section-inner">
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-badge">⚔ The Party</div>
            <h2 className="section-title">Meet Your Companions</h2>
            <p className="section-desc">The legendary KonoSuba party is here to power up your WhatsApp community.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {PARTY.map((char, i) => (
              <div
                key={i}
                className="glass-card"
                style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'default', transition: 'all 0.35s' }}
                onMouseOver={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-10px) scale(1.02)';
                  el.style.boxShadow = `0 24px 60px ${char.color}28`;
                  el.style.borderColor = `${char.color}50`;
                }}
                onMouseOut={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = '';
                  el.style.boxShadow = '';
                  el.style.borderColor = '';
                }}
              >
                {/* Character image area */}
                <div style={{ position: 'relative', height: 260, background: `linear-gradient(180deg, ${char.color}08, ${char.color}1a)`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${char.color}22, transparent)` }} />
                  <img
                    src={char.img}
                    alt={char.name}
                    style={{ height: '100%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom', filter: `drop-shadow(0 0 18px ${char.color}55)`, position: 'relative', zIndex: 1 }}
                    loading="lazy"
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${char.color}, transparent)` }} />
                </div>

                {/* Info */}
                <div style={{ padding: '1.2rem 1.3rem' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{char.name}</div>
                  <div style={{ color: char.color, fontSize: '0.77rem', fontWeight: 600, marginTop: 3, letterSpacing: '0.03em' }}>{char.role}</div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '0.6rem', lineHeight: 1.65 }}>{char.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="section" id="features" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.02), transparent)' }}>
        <div className="section-inner">
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-badge">✦ Capabilities</div>
            <h2 className="section-title">Everything Your Community Needs</h2>
            <p className="section-desc">From AI-powered chat to advanced moderation, economy systems, and premium analytics — all in one platform.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card feature-card">
                <div className="feature-icon-wrap">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMANDS ────────────────────────────────────────────────────── */}
      <section className="section" id="commands">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge">◈ Commands</div>
            <h2 className="section-title">Command Library</h2>
            <p className="section-desc">Browse and search through all available bot commands.</p>
          </div>
          <input
            className="commands-search"
            placeholder="Search commands..."
            value={cmdSearch}
            onChange={e => setCmdSearch(e.target.value)}
          />
          <div className="cmd-tabs">
            {cats.map(c => (
              <button key={c} className={`cmd-tab${cmdCat === c ? ' active' : ''}`} onClick={() => setCmdCat(c)}>{c}</button>
            ))}
          </div>
          <div className="commands-grid">
            {filtered.map((c, i) => (
              <div key={i} className="glass-card cmd-card">
                <div style={{ flex: 1 }}>
                  <div className="cmd-name">{c.name}</div>
                  <div className="cmd-desc">{c.desc}</div>
                </div>
                <div className="cmd-badge">{c.cat}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No commands found matching your search.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="section" id="testimonials" style={{ background: 'linear-gradient(180deg, transparent, rgba(139,92,246,0.02), transparent)' }}>
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge">✧ Reviews</div>
            <h2 className="section-title">Loved by Communities</h2>
            <p className="section-desc">Join thousands of group admins and community leaders who trust our platform.</p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card testimonial-card">
                <div className="testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  {/* Real KonoSuba character image as avatar */}
                  <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,212,255,0.3)', background: 'rgba(0,0,30,0.6)', flexShrink: 0 }}>
                    <img
                      src={t.img}
                      alt={t.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section className="section" id="pricing">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-badge" style={{ margin: '0 auto 1rem' }}>💎 Pricing</div>
            <h2 className="section-title" style={{ justifyContent: 'center', display: 'flex' }}>Choose Your Adventure</h2>
            <p className="section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>Start free, upgrade when you're ready for more power.</p>
          </div>
          <div className="pricing-grid">
            {PRICING.map((p, i) => (
              <div key={i} className={`glass-card pricing-card${p.featured ? ' featured' : ''}`} style={{ position: 'relative' }}>
                {p.featured && <div className="pricing-badge">Most Popular</div>}
                <div className="pricing-tier">{p.tier}</div>
                <div className="pricing-price">{p.price}</div>
                <div className="pricing-period">{p.period}</div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                <Link to="/auth?mode=register" className={p.featured ? 'glow-btn' : 'ghost-btn'} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {p.price === 'Free' ? 'Get Started' : 'Subscribe Now'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
        <div className="section-inner">
          <div style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(139,92,246,0.06))', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 24, overflow: 'hidden', padding: '3.5rem 2rem', textAlign: 'center' }}>

            {/* Kazuma — decorative left */}
            <img src={IMGS.kazuma} alt="" aria-hidden="true" style={{ position: 'absolute', left: '-20px', bottom: 0, height: '90%', width: 'auto', objectFit: 'contain', opacity: 0.18, pointerEvents: 'none', filter: 'drop-shadow(0 0 16px rgba(0,212,255,0.3))' }} loading="lazy" />
            {/* Darkness — decorative right */}
            <img src={IMGS.darkness} alt="" aria-hidden="true" style={{ position: 'absolute', right: '-20px', bottom: 0, height: '90%', width: 'auto', objectFit: 'contain', opacity: 0.18, pointerEvents: 'none', filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.3))' }} loading="lazy" />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>
                Begin Your Adventure
              </h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.7 }}>
                Join over 52,000 adventurers who have transformed their WhatsApp communities with the power of KonoSuba.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/auth?mode=register" className="glow-btn">Create Free Account</Link>
                <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="ghost-btn">Add Bot to Group</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="/" className="navbar-logo" style={{ fontSize: '1.6rem' }}>⚔ KONOSUBA</a>
              <p>The ultimate KonoSuba-themed WhatsApp bot platform. Automate, moderate, and engage your community like never before.</p>
              {/* Character avatar strip in footer */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                {[
                  { img: IMGS.kazuma,   label: 'Kazuma' },
                  { img: IMGS.aqua,     label: 'Aqua' },
                  { img: IMGS.megumin,  label: 'Megumin' },
                  { img: IMGS.darkness, label: 'Darkness' },
                ].map(c => (
                  <div key={c.label} title={c.label} style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,212,255,0.18)', background: 'rgba(0,0,30,0.7)' }}>
                    <img src={c.img} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#commands">Commands</a></li>
                <li><a href="#pricing">Premium</a></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">Changelog</a></li>
                <li><a href="#">Status</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Discord Server</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><Link to="/manager">Admin Panel</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Konosuba Bot Platform. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Privacy</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
