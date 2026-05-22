import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }

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
  { img: IMGS.kazuma,   name: 'Kazuma Satou',  role: 'Adventurer · Leader',     color: '#4a90e2', desc: 'Master strategist and leader of the party with unmatched luck and cunning.' },
  { img: IMGS.aqua,     name: 'Aqua',          role: 'Goddess · Arch-Priest',   color: '#38bdf8', desc: 'Divine healing goddess with water magic and questionable life choices.' },
  { img: IMGS.megumin,  name: 'Megumin',       role: 'Arch-Wizard · Explosion', color: '#f472b6', desc: 'One-shot explosion magic specialist who spends all her magic on single attacks.' },
  { img: IMGS.darkness, name: 'Darkness',      role: 'Crusader · Tank',         color: '#d4af37', desc: 'Unbreakable defender with an unusual relationship to pain and suffering.' },
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
  { img: IMGS.kazuma,   name: 'Kazuma S.',   role: 'Group Admin · 4,200 members', text: 'This bot transformed our community. The RPG economy keeps everyone engaged and the moderation tools are leagues ahead of anything else.', stars: 5 },
  { img: IMGS.aqua,     name: 'Aqua D.',     role: 'Server Owner · 12k users',    text: 'The anime aesthetic is stunning. My members love the visual style and the AI chat feature has been a game changer for engagement.', stars: 5 },
  { img: IMGS.darkness, name: 'Darkness C.', role: 'Raid Leader · Premium',       text: 'Premium plan is worth it. The advanced analytics and priority processing make managing our large community effortless.', stars: 5 },
  { img: IMGS.megumin,  name: 'Megumin A.',  role: 'Bot Developer',               text: 'As a developer I appreciate the clean architecture and extensive admin tools. The webhook integration is seamless.', stars: 5 },
  { img: IMGS.wiz,      name: 'Wiz V.',      role: 'Content Creator',             text: 'Setup took 5 minutes. The documentation is clear and the support team responds faster than any other bot service.', stars: 5 },
  { img: IMGS.yunyun,   name: 'Yunyun Y.',   role: 'Community Manager',           text: 'The economy system creates a whole new layer of engagement. Members are completing quests and trading items constantly.', stars: 5 },
];

const PRICING = [
  { tier: 'Adventurer', price: 'Free', period: 'forever', features: ['50 commands/day', 'Basic moderation', 'Economy system', 'Welcome messages', '3 groups max', 'Community support'], featured: false },
  { tier: 'Knight',     price: '$9',   period: '/month',  features: ['Unlimited commands', 'AI Chat (100 msgs/day)', 'Advanced moderation', 'Music streaming', 'Analytics dashboard', '15 groups', 'Priority support'], featured: true },
  { tier: 'Legend',     price: '$24',  period: '/month',  features: ['Everything in Knight', 'Unlimited AI messages', 'Custom branding', 'Backup system', 'Premium analytics', 'Unlimited groups', '24/7 support', 'Early access'], featured: false },
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
  return <div ref={ref} style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{count.toLocaleString()}{suffix}</div>;
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
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">⚔ GUILD MASTER</a>
        <div className="navbar-links">
          <a href="#party"      className="navbar-link">Party</a>
          <a href="#features"   className="navbar-link">Features</a>
          <a href="#commands"   className="navbar-link">Commands</a>
          <a href="#pricing"    className="navbar-link">Premium</a>
          <a href="#testimonials" className="navbar-link">Reviews</a>
        </div>
        <div className="navbar-actions">
          <Link to="/auth"               className="ghost-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}>Login</Link>
          <Link to="/auth?mode=register" className="glow-btn"  style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}>Join Free</Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ overflow: 'visible' }}>
        <div className="hero-bg" />
        <div className="hero-grid" />

        {/* Floating character images */}
        <img
          src={IMGS.aqua}
          alt="Aqua"
          style={{
            position: 'absolute', bottom: 0, left: '2%',
            height: '70vh', maxHeight: 550, width: 'auto',
            objectFit: 'contain', zIndex: 1, opacity: 0.85,
            filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.3))',
            animation: 'float 6.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        <img
          src={IMGS.megumin}
          alt="Megumin"
          style={{
            position: 'absolute', bottom: 0, right: '2%',
            height: '65vh', maxHeight: 500, width: 'auto',
            objectFit: 'contain', zIndex: 1, opacity: 0.85,
            filter: 'drop-shadow(0 0 30px rgba(212, 175, 55, 0.3))',
            animation: 'float 7.2s ease-in-out infinite 0.5s',
            pointerEvents: 'none',
          }}
        />

        <div className="hero-content" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-badge fade-in">
            <span>⚡</span> The Ultimate Guild Experience
          </div>
          <h1 className="hero-title fade-up delay-1">
            God's Blessing on<br />Your WhatsApp Guild
          </h1>
          <p className="hero-subtitle fade-up delay-2">
            The ultimate KonoSuba-themed WhatsApp bot with automation, moderation, AI, RPG economy, and advanced management — all in one legendary tool.
          </p>
          <div className="hero-cta fade-up delay-3">
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
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────– */}
      <section style={{ padding: '4rem 2rem', background: 'rgba(212, 175, 55, 0.02)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { label: 'Active Groups',   target: stats.activeBots ? stats.activeBots * 12 : 8420, suffix: '+' },
              { label: 'Total Users',     target: stats.totalUsers ?? 52000, suffix: '+' },
              { label: 'Commands Used',   target: 2800000, suffix: '+' },
              { label: 'Guild Uptime',    target: 99, suffix: '.9%' },
            ].map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <Counter target={s.target} suffix={s.suffix} />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEET THE PARTY ──────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }} id="party">
        <div className="section-title" style={{ marginBottom: '3rem' }}>Meet Your Companions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
          {PARTY.map((char, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: 0, overflow: 'hidden', position: 'relative', cursor: 'default',
                transition: 'all 0.35s'
              }}
              onMouseOver={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = 'translateY(-12px) scale(1.02)';
                el.style.boxShadow = `0 24px 60px rgba(212, 175, 55, 0.25)`;
                el.style.borderColor = 'rgba(212, 175, 55, 0.5)';
              }}
              onMouseOut={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = '';
                el.style.boxShadow = '';
                el.style.borderColor = '';
              }}
            >
              <div style={{
                position: 'relative', height: 280,
                background: `linear-gradient(180deg, rgba(212,175,55,0.08), rgba(212,175,55,0.12))`,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 50% at 50% 100%, rgba(212,175,55,0.2), transparent)` }} />
                <img
                  src={char.img}
                  alt={char.name}
                  style={{
                    height: '100%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom',
                    filter: `drop-shadow(0 0 20px rgba(212, 175, 55, 0.4))`, position: 'relative', zIndex: 1
                  }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--gold)' }}>{char.name}</div>
                <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.4rem', letterSpacing: '0.05em' }}>{char.role}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.8rem', lineHeight: 1.6 }}>{char.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }} id="features">
        <div className="section-title" style={{ marginBottom: '3rem' }}>Everything Your Guild Needs</div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card feature-card" style={{ padding: '1.5rem' }}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMANDS ────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem' }} id="commands">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-title" style={{ marginBottom: '2.5rem' }}>Command Library</div>
          <div style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            <input
              type="text"
              placeholder="Search commands..."
              value={cmdSearch}
              onChange={e => setCmdSearch(e.target.value)}
              className="cmd-search"
              style={{
                width: '100%', padding: '1rem',
                background: 'var(--glass)', border: '2px solid var(--glass-border)',
                borderRadius: '8px', color: 'var(--text-primary)', fontFamily: "'Poppins', sans-serif",
                outline: 'none', transition: 'all 0.3s', fontSize: '0.95rem'
              }}
            />
          </div>
          <div className="cmd-filters" style={{ marginBottom: '2rem', justifyContent: 'center' }}>
            {cats.map(c => (
              <button
                key={c}
                className={`cmd-filter-btn ${cmdCat === c ? 'active' : ''}`}
                onClick={() => setCmdCat(c)}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: cmdCat === c ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'transparent',
                  border: cmdCat === c ? 'none' : '2px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: cmdCat === c ? '#1a1410' : 'var(--text-dim)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontWeight: 700, fontFamily: "'Poppins', sans-serif", fontSize: '0.85rem'
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="commands-grid">
            {filtered.map((cmd, i) => (
              <div key={i} className="glass-card command-card" style={{ padding: '1.25rem' }}>
                <div className="command-name">{cmd.name}</div>
                <div className="command-desc">{cmd.desc}</div>
                <span className="command-cat" style={{
                  display: 'inline-block', padding: '0.3rem 0.8rem',
                  background: 'rgba(212, 175, 55, 0.2)', border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '4px', color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700
                }}>
                  {cmd.cat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 2rem', background: 'rgba(212, 175, 55, 0.02)', maxWidth: '1200px', margin: '0 auto' }} id="testimonials">
        <div className="section-title" style={{ marginBottom: '3rem' }}>Loved by Guild Masters</div>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.95rem', marginBottom: '1rem', letterSpacing: '0.2em' }}>
                {'★'.repeat(t.stars)}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                "{t.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '45px', height: '45px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), var(--amber))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)', flexShrink: 0
                }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────– */}
      <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }} id="pricing">
        <div className="section-title" style={{ marginBottom: '3rem' }}>Premium Plans</div>
        <div className="pricing-grid">
          {PRICING.map((p, i) => (
            <div key={i} className={`glass-card pricing-card ${p.featured ? 'featured' : ''}`} style={{ position: 'relative', padding: '2.5rem' }}>
              {p.featured && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  padding: '0.4rem 1.2rem', borderRadius: '999px',
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  color: '#1a1410', fontSize: '0.75rem', fontWeight: 800,
                  whiteSpace: 'nowrap', boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
                }}>
                  MOST POPULAR
                </div>
              )}
              <div className="pricing-tier" style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '0.5rem' }}>
                {p.tier}
              </div>
              <div style={{
                fontSize: '2.8rem', fontWeight: 900,
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', margin: '0.75rem 0'
              }}>
                {p.price}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.period}</div>
              <ul className="pricing-features" style={{ listStyle: 'none', margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--gold)', fontSize: '0.8rem', flexShrink: 0 }}>✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={p.featured ? 'glow-btn' : 'ghost-btn'} style={{
                width: '100%', padding: '0.9rem', marginTop: '1rem',
                fontSize: '1rem', cursor: 'pointer'
              }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────– */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                ⚔ GUILD MASTER
              </div>
              <p>The ultimate WhatsApp bot platform with KonoSuba-inspired fantasy aesthetics and powerful features for community management.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#commands">Commands</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/dashboard">Dashboard</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Guild Master. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Twitter</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Discord</a>
              <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
