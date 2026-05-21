import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

interface Stats {
  totalUsers?: number;
  activeUsers?: number;
  totalCoinsInCirculation?: number;
  activeBots?: number;
}

// ── Real KonoSuba anime character images
const IMGS = {
  kazuma:   'https://static.wikia.nocookie.net/konosuba/images/4/4f/Kazuma_Anime.png/revision/latest?width=420',
  aqua:     'https://static.wikia.nocookie.net/konosuba/images/9/9e/Aqua_Anime.png/revision/latest?width=420',
  megumin:  'https://static.wikia.nocookie.net/konosuba/images/9/97/Megumin_Anime.png/revision/latest?width=420',
  darkness: 'https://static.wikia.nocookie.net/konosuba/images/d/d5/Darkness_Anime.png/revision/latest?width=420',
  wiz:      'https://static.wikia.nocookie.net/konosuba/images/e/eb/Wiz_Anime.png/revision/latest?width=300',
  yunyun:   'https://static.wikia.nocookie.net/konosuba/images/5/57/Yunyun_Anime.png/revision/latest?width=300',
};

const PARTY = [
  {
    img: IMGS.kazuma,
    name: 'Kazuma Satou',
    role: 'Adventurer · Leader',
    color: '#00d4ff',
    desc: 'The cunning strategist who masters luck and steals skills from any enemy. Born to lead parties to victory.',
  },
  {
    img: IMGS.aqua,
    name: 'Aqua',
    role: 'Goddess · Arch-Priest',
    color: '#38bdf8',
    desc: 'A water goddess with divine healing powers. Her questionable judgment keeps things interesting.',
  },
  {
    img: IMGS.megumin,
    name: 'Megumin',
    role: 'Arch-Wizard · Explosion',
    color: '#f472b6',
    desc: 'Casts only one-shot explosion magic. Every. Single. Day. No exceptions whatsoever.',
  },
  {
    img: IMGS.darkness,
    name: 'Darkness',
    role: 'Crusader · Tank',
    color: '#ffd700',
    desc: 'An unbreakable defender with a deeply complicated and unique relationship with pain.',
  },
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
  { img: IMGS.kazuma, name: 'Kazuma S.', role: 'Group Admin · 4,200 members', text: 'This bot completely transformed our community. The RPG economy keeps everyone engaged and the moderation tools are leagues ahead.', stars: 5 },
  { img: IMGS.aqua, name: 'Aqua D.', role: 'Server Owner · 12k users', text: 'The anime aesthetic is absolutely stunning. My members love the visual style and the AI chat feature has been a game changer.', stars: 5 },
  { img: IMGS.darkness, name: 'Darkness C.', role: 'Raid Leader · Premium', text: 'Premium plan is 100% worth it. The advanced analytics and priority processing make managing our large community effortless.', stars: 5 },
  { img: IMGS.megumin, name: 'Megumin A.', role: 'Bot Developer', text: 'As a developer I appreciate the clean architecture and extensive admin tools. The webhook integration is seamless.', stars: 5 },
  { img: IMGS.wiz, name: 'Wiz V.', role: 'Content Creator', text: 'Setup took literally 5 minutes. The documentation is clear and the support team responds faster than any other service.', stars: 5 },
  { img: IMGS.yunyun, name: 'Yunyun Y.', role: 'Community Manager', text: 'The economy system alone is worth the subscription. Members are completing quests and trading items like never before.', stars: 5 },
];

const PRICING = [
  { tier: 'Adventurer', price: 'Free', period: 'forever', features: ['50 commands/day', 'Basic moderation', 'Economy system', 'Welcome messages', '3 groups max', 'Community support'], featured: false },
  { tier: 'Knight', price: '$9', period: '/month', features: ['Unlimited commands', 'AI Chat (100 msgs/day)', 'Advanced moderation', 'Music streaming', 'Analytics dashboard', '15 groups', 'Priority support'], featured: true },
  { tier: 'Legend', price: '$24', period: '/month', features: ['Everything in Knight', 'Unlimited AI messages', 'Custom branding', 'Backup system', 'Premium analytics', 'Unlimited groups', '24/7 dedicated support', 'Early access features'], featured: false },
];

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          start = Math.min(start + step, target);
          setCount(Math.floor(start));
          if (start >= target) clearInterval(timer);
        }, 16);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="stat-number">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({});
  const [cmdSearch, setCmdSearch] = useState('');
  const [cmdCat, setCmdCat] = useState('All');
  const cats = ['All', 'AI', 'Economy', 'Moderation', 'Music', 'Admin', 'Media'];
  const filtered = COMMANDS.filter(
    (c) =>
      (cmdCat === 'All' || c.cat === cmdCat) &&
      (cmdSearch === '' || c.name.includes(cmdSearch) || c.desc.toLowerCase().includes(cmdSearch.toLowerCase()))
  );

  useEffect(() => {
    api.stats().then((s) => setStats(s as Stats)).catch(() => {});

    // Custom cursor glow
    const cursor = document.createElement('div');
    cursor.className = 'cursor-glow';
    document.body.appendChild(cursor);
    const move = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    };
    document.addEventListener('mousemove', move);

    // Particle canvas with enhanced animation
    const canvas = document.createElement('canvas');
    canvas.className = 'particles-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.6 + 0.1,
      color: Math.random() > 0.5 ? '#00d4ff' : Math.random() > 0.5 ? '#ffd700' : '#8b5cf6',
    }));

    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 0.8;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(drawParticles);
    }
    drawParticles();

    return () => {
      document.removeEventListener('mousemove', move);
      cursor.remove();
      canvas.remove();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ── NAVBAR ───────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          ⚔ KONOSUBA
        </a>
        <div className="navbar-links">
          <a href="#features" className="navbar-link">
            Features
          </a>
          <a href="#party" className="navbar-link">
            Team
          </a>
          <a href="#commands" className="navbar-link">
            Commands
          </a>
          <a href="#pricing" className="navbar-link">
            Pricing
          </a>
        </div>
        <div className="navbar-actions">
          <Link to="/auth?mode=login" className="ghost-btn">
            Login
          </Link>
          <Link to="/auth?mode=register" className="glow-btn">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-gradient"></div>
        <div className="section-inner" style={{ width: '100%' }}>
          <div className="hero-content">
            <h1 className="hero-title">Control Your WhatsApp Empire</h1>
            <p className="hero-subtitle">
              The ultimate anime-inspired WhatsApp bot platform. Automate, moderate, and engage your community with magical power.
            </p>
            <div className="hero-cta">
              <Link to="/auth?mode=register" className="glow-btn">
                🚀 Get Started Free
              </Link>
              <a href="#features" className="ghost-btn">
                ↓ Explore Features
              </a>
            </div>

            {/* Live Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem', marginTop: '3rem', maxWidth: '600px', margin: '3rem auto 0' }}>
              <div>
                <Counter target={stats.totalUsers ?? 52000} />
                <div className="stat-label">Total Users</div>
              </div>
              <div>
                <Counter target={stats.activeUsers ?? 8400} />
                <div className="stat-label">Active Today</div>
              </div>
              <div>
                <Counter target={stats.activeBots ?? 2300} suffix="+" />
                <div className="stat-label">Bot Groups</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────────────────── */}
      <section className="section" id="features">
        <div className="section-inner">
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-badge" style={{ margin: '0 0 1rem' }}>
              ✨ Core Features
            </div>
            <h2 className="section-title">Powerful Tools at Your Fingertips</h2>
            <p className="section-desc">Everything you need to manage, moderate, and monetize your WhatsApp community.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="glass-card feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTY SECTION ────────────────────────────────────────────────── */}
      <section className="section" id="party">
        <div className="section-inner">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="section-badge" style={{ margin: '0 auto 1rem' }}>
              👥 Meet the Team
            </div>
            <h2 className="section-title">Join Our Legendary Party</h2>
            <p className="section-desc">Together, we create magic. Every member brings unique powers to the adventure.</p>
          </div>
          <div className="party-grid">
            {PARTY.map((p, i) => (
              <div key={i} className="glass-card party-card">
                <div className="party-avatar">
                  <img src={p.img} alt={p.name} loading="lazy" />
                </div>
                <div className="party-name">{p.name}</div>
                <div className="party-role">{p.role}</div>
                <p className="party-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMANDS SECTION ─────────────────────────────────────────────── */}
      <section className="section" id="commands">
        <div className="section-inner">
          <div style={{ marginBottom: '2rem' }}>
            <div className="section-badge" style={{ margin: '0 0 1rem' }}>
              ⌨️ Commands
            </div>
            <h2 className="section-title">Extensive Command Library</h2>
          </div>

          {/* Search & Filter */}
          <div style={{ marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="🔍 Search commands..."
              value={cmdSearch}
              onChange={(e) => setCmdSearch(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.75rem 1rem',
                background: 'rgba(0,212,255,0.08)',
                border: '1.5px solid rgba(0,212,255,0.2)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                marginBottom: '1.5rem',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--cyan)';
                e.currentTarget.style.boxShadow = '0 0 16px var(--cyan-glow)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            <div className="commands-filters">
              {cats.map((cat) => (
                <button
                  key={cat}
                  className={`filter-btn ${cmdCat === cat ? 'active' : ''}`}
                  onClick={() => setCmdCat(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="commands-grid">
            {filtered.map((cmd, i) => (
              <div key={i} className="glass-card command-card">
                <div className="command-name">{cmd.name}</div>
                <p className="command-desc">{cmd.desc}</p>
                <span className="command-cat">{cmd.cat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ─────────────────────────────────────────– */}
      <section className="section" style={{ paddingTop: '5rem' }}>
        <div className="section-inner">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <div className="section-badge" style={{ margin: '0 auto 1rem' }}>
              ⭐ Reviews
            </div>
            <h2 className="section-title">Loved by Thousands</h2>
            <p className="section-desc">See what our community members are saying about KonoSuba.</p>
          </div>
          <div className="testimonials-container">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="glass-card testimonial-card">
                <div className="testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    <img src={t.img} alt={t.name} loading="lazy" />
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

      {/* ── PRICING SECTION ──────────────────────────────────────────────── */}
      <section className="section" id="pricing">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="section-badge" style={{ margin: '0 auto 1rem' }}>
              💎 Pricing
            </div>
            <h2 className="section-title">Choose Your Adventure</h2>
            <p className="section-desc">Start free, upgrade when you're ready for more power.</p>
          </div>
          <div className="pricing-grid">
            {PRICING.map((p, i) => (
              <div
                key={i}
                className={`glass-card pricing-card${p.featured ? ' featured' : ''}`}
                style={{ position: 'relative' }}
              >
                {p.featured && <div className="pricing-badge">Most Popular</div>}
                <div className="pricing-tier">{p.tier}</div>
                <div className="pricing-price">{p.price}</div>
                <div className="pricing-period">{p.period}</div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => (
                    <li key={j}>{f}</li>
                  ))}
                </ul>
                <Link
                  to="/auth?mode=register"
                  className={p.featured ? 'glow-btn' : 'ghost-btn'}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  {p.price === 'Free' ? 'Get Started' : 'Subscribe Now'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
        <div className="section-inner">
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(139,92,246,0.06))',
              border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: 24,
              overflow: 'hidden',
              padding: '3.5rem 2rem',
              textAlign: 'center',
            }}
          >
            {/* Decorative characters */}
            <img
              src={IMGS.kazuma}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-20px',
                bottom: 0,
                height: '90%',
                width: 'auto',
                objectFit: 'contain',
                opacity: 0.15,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 0 16px rgba(0,212,255,0.2))',
              }}
              loading="lazy"
            />
            <img
              src={IMGS.darkness}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: '-20px',
                bottom: 0,
                height: '90%',
                width: 'auto',
                objectFit: 'contain',
                opacity: 0.15,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.2))',
              }}
              loading="lazy"
            />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
              <h2
                style={{
                  fontFamily: 'Cinzel, serif',
                  fontSize: 'clamp(1.5rem,3vw,2.2rem)',
                  fontWeight: 900,
                  color: '#fff',
                  marginBottom: '0.75rem',
                }}
              >
                Begin Your Adventure
              </h2>
              <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.7 }}>
                Join over 52,000 adventurers who have transformed their WhatsApp communities with the power of KonoSuba.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/auth?mode=register" className="glow-btn">
                  Create Free Account
                </Link>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ghost-btn"
                >
                  Add Bot to Group
                </a>
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
              <a href="/" className="navbar-logo" style={{ fontSize: '1.4rem' }}>
                ⚔ KONOSUBA
              </a>
              <p>
                The ultimate KonoSuba-themed WhatsApp bot platform. Automate, moderate, and engage your community like never before.
              </p>
              {/* Character avatar strip in footer */}
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
                {[
                  { img: IMGS.kazuma, label: 'Kazuma' },
                  { img: IMGS.aqua, label: 'Aqua' },
                  { img: IMGS.megumin, label: 'Megumin' },
                  { img: IMGS.darkness, label: 'Darkness' },
                ].map((c) => (
                  <div
                    key={c.label}
                    title={c.label}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid rgba(0,212,255,0.18)',
                      background: 'rgba(0,0,30,0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease-out',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.18)';
                    }}
                  >
                    <img src={c.img} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#commands">Commands</a>
                </li>
                <li>
                  <a href="#pricing">Premium</a>
                </li>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">API Reference</a>
                </li>
                <li>
                  <a href="#">Changelog</a>
                </li>
                <li>
                  <a href="#">Status</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                <li>
                  <a href="#">Help Center</a>
                </li>
                <li>
                  <a href="#">Discord Server</a>
                </li>
                <li>
                  <a href="#">Contact Us</a>
                </li>
                <li>
                  <Link to="/manager">Admin Panel</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Konosuba Bot Platform. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
                Privacy
              </a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}