import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { CharAvatar, CHARS } from '../components/CharAvatar';
import { Shield, Zap, Music, BarChart3, MessageSquare, Users, BookOpen, Bell, Smile, Database, Bot, Gem } from 'lucide-react';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }

const IMGS = {
  kazuma:   '/assets/images/kazuma.svg',
  aqua:     '/assets/images/aqua.svg',
  megumin:  '/assets/images/megumin.svg',
  darkness: '/assets/images/darkness.svg',
  wiz:      '/assets/images/wiz.svg',
  yunyun:   '/assets/images/yunyun.svg',
};

const PARTY = [
  { img: IMGS.kazuma,   name: 'Kazuma Satou',  role: 'Adventurer · Leader',     color: '#00d4ff', desc: 'The cunning strategist. Masters luck and steals skills from any enemy.' },
  { img: IMGS.aqua,     name: 'Aqua',           role: 'Goddess · Arch-Priest',   color: '#38bdf8', desc: 'Water goddess with divine healing — and frequently questionable decisions.' },
  { img: IMGS.megumin,  name: 'Megumin',        role: 'Arch-Wizard · Explosion', color: '#f472b6', desc: 'One-shot explosion magic only. Every single day. No exceptions whatsoever.' },
  { img: IMGS.darkness, name: 'Darkness',       role: 'Crusader · Tank',         color: '#ffd700', desc: 'Unbreakable defender with a deeply complicated relationship with pain.' },
];

const FEATURES = [
  { icon: <Bot size={22}/>,         title: 'AI Chat',          desc: 'Advanced AI-powered conversations with context memory and multi-language support.' },
  { icon: <Shield size={22}/>,      title: 'Moderation',       desc: 'Auto-ban, spam protection, word filters, and smart link detection.' },
  { icon: <Zap size={22}/>,         title: 'Anti-Link',        desc: 'Intelligent link filtering with whitelist support and custom rules.' },
  { icon: <Gem size={22}/>,         title: 'Economy',          desc: 'Full RPG economy system with wallet, bank, items, and trading.' },
  { icon: <MessageSquare size={22}/>,title: 'Auto Responses',  desc: 'Trigger-based auto-reply system with rich message formatting.' },
  { icon: <Music size={22}/>,       title: 'Music',            desc: 'Stream audio from YouTube, Spotify links, and custom sources.' },
  { icon: <BarChart3 size={22}/>,   title: 'Analytics',        desc: 'Real-time group stats, message counts, and activity graphs.' },
  { icon: <BookOpen size={22}/>,    title: 'Logging',          desc: 'Full audit trail for group events, joins, leaves, and admin actions.' },
  { icon: <Bell size={22}/>,        title: 'Welcome Messages', desc: 'Customizable welcome and goodbye messages with member cards.' },
  { icon: <Database size={22}/>,    title: 'Backup System',    desc: 'Automated group data backup and restore with cloud storage.' },
  { icon: <Users size={22}/>,       title: 'Group Management', desc: 'Promote, demote, kick, mute members with bulk action support.' },
  { icon: <Smile size={22}/>,       title: 'Premium Features', desc: 'Exclusive commands, priority processing, and advanced tools.' },
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
  { char: 0, name: 'Kazuma S.',   role: 'Group Admin · 4,200 members', text: 'This bot completely transformed our community. The RPG economy keeps everyone engaged and the moderation tools are leagues ahead of anything else.', stars: 5 },
  { char: 1, name: 'Aqua D.',     role: 'Server Owner · 12k users',    text: 'The anime aesthetic is absolutely stunning. My members love the visual style and the AI chat feature has been a game changer for engagement.', stars: 5 },
  { char: 3, name: 'Darkness C.', role: 'Raid Leader · Premium',       text: 'Premium plan is 100% worth it. The advanced analytics and priority processing make managing our large community effortless.', stars: 5 },
  { char: 2, name: 'Megumin A.',  role: 'Bot Developer',               text: 'As a developer I appreciate the clean architecture and extensive admin tools. The webhook integration with custom bots is seamless.', stars: 5 },
  { char: 4, name: 'Wiz V.',      role: 'Content Creator',             text: 'Setup took literally 5 minutes. The documentation is clear and the support team responds faster than any other bot service I\'ve used.', stars: 5 },
  { char: 5, name: 'Yunyun Y.',   role: 'Community Manager',           text: 'The economy system alone is worth the subscription. Members are completing quests, trading items, and it\'s created a whole new layer of engagement.', stars: 5 },
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

    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    document.body.appendChild(cursor);
    const move = (e: MouseEvent) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; };
    document.addEventListener('mousemove', move);

    const canvas = document.createElement('canvas');
    canvas.className = 'particles-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.4, vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
      opacity: Math.random() * 0.45 + 0.08,
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
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes float-char   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes float-char-r { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">⚔ KONOSUBA</a>
        <div className="navbar-links">
          <a href="#party"        className="navbar-link">Party</a>
          <a href="#features"     className="navbar-link">Features</a>
          <a href="#commands"     className="navbar-link">Commands</a>
          <a href="#pricing"      className="navbar-link">Premium</a>
          <a href="#testimonials" className="navbar-link">Reviews</a>
        </div>
        <div className="navbar-actions">
          <Link to="/auth"               className="ghost-btn" style={{ padding: '0.52rem 1rem', fontSize: '0.85rem' }}>Login</Link>
          <Link to="/auth?mode=register" className="glow-btn"  style={{ padding: '0.52rem 1rem', fontSize: '0.85rem' }}>Join Free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ overflow: 'visible' }}>
        <div className="hero-bg" />
        <div className="hero-grid" />

        {['⚔', '✦', '◈', '⬡', '✧', '◆'].map((r, i) => (
          <div key={i} className="rune" style={{ left: `${10 + i * 16}%`, top: `${20 + (i % 3) * 25}%`, animationDelay: `${i * 1.2}s` }}>{r}</div>
        ))}

        <CharAvatar src={IMGS.aqua} alt="Aqua" color="#38bdf8"
          style={{ position: 'absolute', bottom: 0, left: '2%', height: '72vh', maxHeight: 560, width: 'auto', objectFit: 'contain', zIndex: 1, opacity: 0.88, filter: 'drop-shadow(0 0 26px rgba(56,189,248,0.4))', animation: 'float-char 6.5s ease-in-out infinite', pointerEvents: 'none', borderRadius: 0 }}
        />
        <CharAvatar src={IMGS.megumin} alt="Megumin" color="#f472b6"
          style={{ position: 'absolute', bottom: 0, right: '2%', height: '66vh', maxHeight: 520, width: 'auto', objectFit: 'contain', zIndex: 1, opacity: 0.88, filter: 'drop-shadow(0 0 26px rgba(244,114,182,0.4))', animation: 'float-char-r 7.2s ease-in-out infinite 1.2s', pointerEvents: 'none', borderRadius: 0 }}
        />

        <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-badge fade-in"><Zap size={14}/> Now with Advanced AI Integration</div>
          <h1 className="hero-title fade-up delay-1">God's Blessing on<br />Your WhatsApp</h1>
          <p className="hero-subtitle fade-up delay-2">
            The ultimate KonoSuba-themed WhatsApp bot platform with automation, moderation, AI, RPG economy, and advanced management — all in one legendary tool.
          </p>
          <div className="hero-buttons fade-up delay-3">
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="glow-btn"><Zap size={16}/> Invite Bot</a>
            <Link to="/dashboard" className="gold-btn">◈ Open Dashboard</Link>
            <a href="#pricing" className="ghost-btn"><Gem size={16}/> Premium Plans</a>
          </div>
        </div>

        <div className="hero-scroll"><span>Scroll to explore</span><div style={{ fontSize: '1.1rem' }}>↓</div></div>
      </section>

      {/* ── STATS ── */}
      <section className="section" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
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

      {/* ── PARTY ── */}
      <section className="section" id="party">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge">⚔ The Party</div>
            <h2 className="section-title">Meet Your Companions</h2>
            <p className="section-desc">The legendary KonoSuba party is here to power up your WhatsApp community.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.4rem' }}>
            {PARTY.map((char, i) => (
              <div key={i} className="glass-card"
                style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'default', transition: 'all 0.35s' }}
                onMouseOver={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-10px) scale(1.02)'; el.style.boxShadow = `0 24px 55px ${char.color}24`; el.style.borderColor = `${char.color}45`; }}
                onMouseOut={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ''; el.style.boxShadow = ''; el.style.borderColor = ''; }}>
                <div style={{ height: 200, position: 'relative', background: `linear-gradient(135deg, ${char.color}0a, #050510)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center bottom, ${char.color}18, transparent 70%)` }} />
                  <CharAvatar src={char.img} alt={char.name} color={char.color}
                    style={{ height: '95%', width: 'auto', objectFit: 'contain', filter: `drop-shadow(0 0 20px ${char.color}50)`, borderRadius: 0 }}
                  />
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '1rem', marginBottom: 3 }}>{char.name}</div>
                  <div style={{ color: char.color, fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.65rem' }}>{char.role}</div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.65 }}>{char.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section" id="features">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge"><Shield size={12}/> Capabilities</div>
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-desc">12+ powerful features built specifically for WhatsApp group management.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card feature-card">
                <div className="feature-icon-wrap" style={{ color: 'var(--cyan)' }}>{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMANDS ── */}
      <section className="section" id="commands">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge">⌨ Commands</div>
            <h2 className="section-title">Command Reference</h2>
            <p className="section-desc">Search and filter all available bot commands.</p>
          </div>
          <input className="commands-search" placeholder="Search commands..." value={cmdSearch} onChange={e => setCmdSearch(e.target.value)} />
          <div className="cmd-tabs">
            {cats.map(c => <button key={c} className={`cmd-tab${cmdCat === c ? ' active' : ''}`} onClick={() => setCmdCat(c)}>{c}</button>)}
          </div>
          <div className="commands-grid">
            {filtered.map((c, i) => (
              <div key={i} className="glass-card cmd-card">
                <div style={{ flex: 1 }}>
                  <div className="cmd-name">{c.name}</div>
                  <div className="cmd-desc">{c.desc}</div>
                </div>
                <span className="cmd-badge">{c.cat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="section" id="testimonials">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem' }}>
            <div className="section-badge">★ Reviews</div>
            <h2 className="section-title">Loved by Communities</h2>
            <p className="section-desc">Trusted by thousands of WhatsApp group administrators worldwide.</p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.6rem' }}>
                <div className="testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <CharAvatar src={CHARS[t.char].img} alt={CHARS[t.char].name} color={CHARS[t.char].color}
                    style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${CHARS[t.char].color}40`, flexShrink: 0 }}
                    initial={CHARS[t.char].name.charAt(0)}
                  />
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

      {/* ── PRICING ── */}
      <section className="section" id="pricing">
        <div className="section-inner">
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <div className="section-badge" style={{ margin: '0 auto 1rem' }}><Gem size={12}/> Premium</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Choose Your Rank</h2>
            <p className="section-desc" style={{ margin: '0 auto', textAlign: 'center' }}>Level up your community with the perfect plan.</p>
          </div>
          <div className="pricing-grid">
            {PRICING.map((p, i) => (
              <div key={i} className={`glass-card pricing-card${p.featured ? ' featured' : ''}`}>
                {p.featured && <div className="pricing-badge">Most Popular</div>}
                <div className="pricing-tier">{p.tier}</div>
                <div className="pricing-price">{p.price}</div>
                <div className="pricing-period">{p.period}</div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                <Link to="/auth?mode=register" className={p.featured ? 'glow-btn' : 'ghost-btn'} style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.88rem', padding: '0.62rem 1rem' }}>
                  {p.price === 'Free' ? 'Get Started Free' : `Choose ${p.tier}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="navbar-logo" style={{ fontSize: '1.5rem', display: 'inline-block', marginBottom: '0.5rem' }}>⚔ KONOSUBA</div>
              <p>The ultimate KonoSuba-themed WhatsApp bot platform. Powering thousands of communities with anime-inspired automation.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#commands">Commands</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link to="/dashboard">Dashboard</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <ul>
                <li><Link to="/auth">Login</Link></li>
                <li><Link to="/auth?mode=register">Register</Link></li>
                <li><Link to="/dashboard">Profile</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="#party">About</a></li>
                <li><a href="#testimonials">Reviews</a></li>
                <li><a href="https://wa.me/" target="_blank" rel="noopener noreferrer">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Konosuba Bot Platform. All rights reserved.</p>
            <p>Built with ⚔ for the KonoSuba community</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
