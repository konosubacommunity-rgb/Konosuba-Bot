import { Link } from 'wouter';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { CharAvatar, CHARS, CHAR_IMAGES } from '../components/CharAvatar';
import { Shield, Zap, Music, BarChart3, MessageSquare, Users, BookOpen, Bell, Database, Bot, Gem } from 'lucide-react';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }

const PARTY = [
  { img: CHAR_IMAGES.kazumaImg,   name: 'Kazuma Satou',  role: 'Adventurer · Leader',     color: '#4effff', desc: 'The cunning strategist. Masters luck and steals any skill from any enemy he meets.' },
  { img: CHAR_IMAGES.aquaImg,     name: 'Aqua',           role: 'Goddess · Arch-Priest',   color: '#38bdf8', desc: 'Water goddess with divine healing — and frequently questionable life decisions.' },
  { img: CHAR_IMAGES.meguminImg,  name: 'Megumin',        role: 'Arch-Wizard · Explosion', color: '#f472b6', desc: 'One-shot explosion magic only. Every single day. No exceptions whatsoever.' },
  { img: CHAR_IMAGES.darknessImg, name: 'Darkness',       role: 'Crusader · Tank',         color: '#ffd700', desc: 'Unbreakable defender with a deeply complicated relationship with taking damage.' },
];

const FEATURES = [
  { icon: <Bot size={22}/>,          title: 'AI Chat',          desc: 'Advanced AI-powered conversations with context memory and multi-language support.' },
  { icon: <Shield size={22}/>,       title: 'Moderation',       desc: 'Auto-ban, spam protection, word filters, and intelligent link detection.' },
  { icon: <Zap size={22}/>,          title: 'Economy System',   desc: 'Full RPG economy with wallet, bank, items, crafting, and trading.' },
  { icon: <MessageSquare size={22}/>, title: 'Auto Responses',  desc: 'Trigger-based auto-reply system with rich message formatting.' },
  { icon: <Music size={22}/>,        title: 'Music Streaming',  desc: 'Stream audio from YouTube, Spotify links, and custom sources.' },
  { icon: <BarChart3 size={22}/>,    title: 'Analytics',        desc: 'Real-time group stats, message counts, and activity graphs.' },
  { icon: <BookOpen size={22}/>,     title: 'Audit Logging',    desc: 'Full audit trail for all group events, joins, leaves, and admin actions.' },
  { icon: <Bell size={22}/>,         title: 'Welcome Messages', desc: 'Customizable welcome and goodbye messages with member profile cards.' },
  { icon: <Database size={22}/>,     title: 'Backup System',    desc: 'Automated group data backup and restore with secure cloud storage.' },
  { icon: <Users size={22}/>,        title: 'Group Management', desc: 'Promote, demote, kick, mute members with bulk action support.' },
  { icon: <Gem size={22}/>,          title: 'Gacha Cards',      desc: 'Collect limited anime character cards through the gacha system.' },
  { icon: <Shield size={22}/>,       title: 'Anti-Link',        desc: 'Intelligent link filtering with whitelist support and custom rules.' },
];

const COMMANDS = [
  { name: '.ai',       desc: 'Chat with AI assistant',       cat: 'AI' },
  { name: '.imagine',  desc: 'Generate AI artwork',           cat: 'AI' },
  { name: '.ban',      desc: 'Ban a group member',            cat: 'Moderation' },
  { name: '.warn',     desc: 'Issue a warning to user',       cat: 'Moderation' },
  { name: '.mute',     desc: 'Mute a member temporarily',     cat: 'Moderation' },
  { name: '.balance',  desc: 'Check your coin balance',       cat: 'Economy' },
  { name: '.daily',    desc: 'Claim daily reward coins',      cat: 'Economy' },
  { name: '.transfer', desc: 'Transfer coins to a user',      cat: 'Economy' },
  { name: '.play',     desc: 'Play audio in group',           cat: 'Music' },
  { name: '.lyrics',   desc: 'Get song lyrics',               cat: 'Music' },
  { name: '.welcome',  desc: 'Set welcome message',           cat: 'Admin' },
  { name: '.backup',   desc: 'Backup group data',             cat: 'Admin' },
  { name: '.stats',    desc: 'View group statistics',         cat: 'Admin' },
  { name: '.antilnk',  desc: 'Toggle anti-link mode',         cat: 'Admin' },
  { name: '.sticker',  desc: 'Convert image to sticker',      cat: 'Media' },
  { name: '.toimg',    desc: 'Convert sticker to image',      cat: 'Media' },
];

const MARQUEE_CHARS = [...CHARS, ...CHARS];

const TESTIMONIALS = [
  { char: 0, name: 'Kazuma S.',    role: 'Group Admin · 4.2K members',  text: 'This bot completely transformed our community. The RPG economy keeps everyone engaged and the moderation tools are leagues ahead.', stars: 5 },
  { char: 1, name: 'Aqua D.',      role: 'Server Owner · 12K users',    text: 'The anime aesthetic is stunning. Members love the visual style and the AI chat has been a game-changer for group engagement.', stars: 5 },
  { char: 3, name: 'Darkness C.',  role: 'Raid Leader · Premium',       text: 'Premium plan is 100% worth it. Advanced analytics and priority processing make managing our large community effortless.', stars: 5 },
  { char: 2, name: 'Megumin A.',   role: 'Bot Developer',               text: 'Setup took 5 minutes. The documentation is clear and the support team responds faster than any other bot service.', stars: 5 },
];

const PRICING = [
  { tier: 'Adventurer', price: 'Free',  period: 'forever', features: ['50 commands/day', 'Basic moderation', 'Economy system', 'Welcome messages', '3 groups max', 'Community support'], featured: false },
  { tier: 'Knight',     price: '$9',    period: '/month',  features: ['Unlimited commands', 'AI Chat (100 msgs/day)', 'Advanced moderation', 'Music streaming', 'Analytics dashboard', '15 groups', 'Priority support'], featured: true },
  { tier: 'Legend',     price: '$24',   period: '/month',  features: ['Everything in Knight', 'Unlimited AI messages', 'Custom branding', 'Backup system', 'Premium analytics', 'Unlimited groups', '24/7 dedicated support'], featured: false },
];

function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0; const step = target / 55;
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        setCount(Math.floor(start));
        if (start >= target) clearInterval(timer);
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <div ref={ref}>{count.toLocaleString()}{suffix}</div>;
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

  useEffect(() => { api.stats().then(s => setStats(s as Stats)).catch(() => {}); }, []);

  return (
    <div style={{ background: 'var(--bg)' }}>
      {/* ── NAVBAR ── */}
      <nav className="global-navbar">
        <div className="nav-container">
          <a href="/" className="nav-logo">⚔ KONOSUBA</a>
          <ul className="nav-menu">
            <li><a href="#party"        className="nav-link">Party</a></li>
            <li><a href="#features"     className="nav-link">Features</a></li>
            <li><a href="#commands"     className="nav-link">Commands</a></li>
            <li><a href="#pricing"      className="nav-link">Premium</a></li>
            <li><a href="#testimonials" className="nav-link">Reviews</a></li>
          </ul>
          <div className="nav-actions">
            <Link to="/auth"               className="btn">Login</Link>
            <Link to="/auth?mode=register" className="btn primary">Join Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-content fade-up">
            <h1>God's Blessing on<br /><span className="accent">Your WhatsApp</span></h1>
            <p>
              The ultimate KonoSuba-themed bot platform. <strong>Economy</strong>, <strong>Moderation</strong>,&nbsp;
              <strong>AI Chat</strong>, and advanced group management — all in one legendary tool.
            </p>
            <div className="hero-buttons">
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="btn primary"><Zap size={15}/> Invite Bot</a>
              <Link to="/dashboard" className="btn gold">◈ Dashboard</Link>
            </div>
          </div>
          <div className="hero-image">
            <CharAvatar
              src={CHAR_IMAGES.meguminImg}
              alt="Megumin"
              color="#f472b6"
              style={{ width: '100%', maxWidth: 460, height: 'auto', objectFit: 'contain', borderRadius: 0, filter: 'drop-shadow(0 20px 50px rgba(244,114,182,0.35))' }}
            />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px 100px', display: 'flex', flexDirection: 'column', gap: 80 }}>

        {/* STATS */}
        <div className="stats-grid">
          {[
            { label: 'Users',       target: stats.totalUsers ?? 52000,  suffix: '+', gold: false },
            { label: 'Active Groups',target: 8400,                       suffix: '+', gold: false },
            { label: 'Commands Used',target: 2800000,                   suffix: '+', gold: true  },
            { label: 'Uptime',       target: 99,                         suffix: '.9%',gold: false },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-value${s.gold ? ' gold' : ''}`}><Counter target={s.target} suffix={s.suffix} /></div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CHARACTER MARQUEE */}
        <div className="marquee-section">
          <h2 className="section-header">Meet the <span className="accent">Party</span></h2>
          <div className="marquee-wrapper">
            <div className="marquee-content">
              {MARQUEE_CHARS.map((c, i) => (
                <div key={i} className="char-card">
                  <div className="char-card-img">
                    <CharAvatar src={c.img} alt={c.name} color={c.color} style={{ width: '100%', height: '100%', borderRadius: 0, objectFit: 'contain' }} initial={c.name.charAt(0)} />
                  </div>
                  <div className="char-card-name">{c.name}</div>
                  <div className="char-card-role" style={{ color: c.color }}>{c.name === 'Kazuma' ? 'Adventurer' : c.name === 'Aqua' ? 'Arch-Priest' : c.name === 'Megumin' ? 'Arch-Wizard' : c.name === 'Darkness' ? 'Crusader' : c.name === 'Wiz' ? 'Lich Mage' : 'Crimson Mage'}</div>
                </div>
              ))}
            </div>
            <div className="marquee-content" aria-hidden>
              {MARQUEE_CHARS.map((c, i) => (
                <div key={i} className="char-card">
                  <div className="char-card-img">
                    <CharAvatar src={c.img} alt={c.name} color={c.color} style={{ width: '100%', height: '100%', borderRadius: 0, objectFit: 'contain' }} initial={c.name.charAt(0)} />
                  </div>
                  <div className="char-card-name">{c.name}</div>
                  <div className="char-card-role" style={{ color: c.color }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PARTY */}
        <div id="party">
          <h2 className="section-header">Your <span className="gold">Companions</span></h2>
          <div className="party-grid">
            {PARTY.map((char, i) => (
              <div key={i} className="party-card"
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${char.color}50`; }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ''; }}>
                <div className="party-card-img" style={{ background: `radial-gradient(ellipse at center bottom, ${char.color}12, transparent 70%)` }}>
                  <CharAvatar src={char.img} alt={char.name} color={char.color} style={{ height: '95%', width: 'auto', maxWidth: '100%', objectFit: 'contain', borderRadius: 0, filter: `drop-shadow(0 10px 24px ${char.color}40)` }} />
                </div>
                <div className="party-card-body">
                  <div className="party-card-name">{char.name}</div>
                  <div className="party-card-role" style={{ color: char.color }}>{char.role}</div>
                  <div className="party-card-desc">{char.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <div id="features">
          <h2 className="section-header">Everything <span className="accent">Included</span></h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-panel">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* COMMANDS */}
        <div id="commands">
          <h2 className="section-header">Command <span className="accent">Reference</span></h2>
          <input className="cmd-search" placeholder="Search commands..." value={cmdSearch} onChange={e => setCmdSearch(e.target.value)} />
          <div className="cmd-tabs">
            {cats.map(c => <button key={c} className={`cmd-tab${cmdCat === c ? ' active' : ''}`} onClick={() => setCmdCat(c)}>{c}</button>)}
          </div>
          <div className="commands-grid">
            {filtered.map((c, i) => (
              <div key={i} className="cmd-card">
                <div style={{ flex: 1 }}>
                  <div className="cmd-name">{c.name}</div>
                  <div className="cmd-desc">{c.desc}</div>
                </div>
                <span className="cmd-badge">{c.cat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TESTIMONIALS */}
        <div id="testimonials">
          <h2 className="section-header">Community <span className="gold">Reviews</span></h2>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars">{'★'.repeat(t.stars)}</div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">
                    <CharAvatar src={CHARS[t.char].img} alt={CHARS[t.char].name} color={CHARS[t.char].color} style={{ width: '100%', height: '100%', borderRadius: '50%' }} initial={CHARS[t.char].name.charAt(0)} />
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

        {/* PRICING */}
        <div id="pricing">
          <h2 className="section-header">Choose Your <span className="gold">Rank</span></h2>
          <div className="pricing-grid">
            {PRICING.map((p, i) => (
              <div key={i} className={`pricing-card${p.featured ? ' featured' : ''}`}>
                {p.featured && <div className="pricing-featured-badge">Most Popular</div>}
                <div className="pricing-tier">{p.tier}</div>
                <div className="pricing-price">{p.price}</div>
                <div className="pricing-period">{p.period}</div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => <li key={j}>{f}</li>)}
                </ul>
                <Link to="/auth?mode=register" className={`btn${p.featured ? ' primary' : ''}`} style={{ display: 'flex', justifyContent: 'center' }}>
                  {p.price === 'Free' ? 'Get Started Free' : `Choose ${p.tier}`}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* COMMUNITY / CTA */}
        <div>
          <h2 className="section-header">Join the <span className="accent">Guild</span></h2>
          <div className="community-grid">
            <div className="comm-card whatsapp">
              <div className="comm-icon">📱</div>
              <div className="comm-platform">WhatsApp</div>
              <div className="comm-name">Add Bot to Group</div>
              <div className="comm-desc">Invite the Konosuba bot to your WhatsApp group in seconds. No setup required — it's ready to go.</div>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="btn">Invite Bot</a>
            </div>
            <div className="comm-card premium">
              <div className="comm-icon">⚔</div>
              <div className="comm-platform">Premium</div>
              <div className="comm-name">Go Premium</div>
              <div className="comm-desc">Unlock unlimited commands, AI chat, advanced analytics, and priority processing for your community.</div>
              <Link to="/auth?mode=register" className="btn">Upgrade Now</Link>
            </div>
            <div className="comm-card dashboard">
              <div className="comm-icon">◈</div>
              <div className="comm-platform">Dashboard</div>
              <div className="comm-name">View Your Stats</div>
              <div className="comm-desc">Track XP, coins, leaderboards, inventory, and all activity from your personal dashboard.</div>
              <Link to="/auth" className="btn">Open Dashboard</Link>
            </div>
          </div>
        </div>

      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="nav-logo" style={{ fontSize: '1.4rem' }}>⚔ KONOSUBA</span>
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
