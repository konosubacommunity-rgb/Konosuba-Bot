import { useState, useEffect } from "react";
import { Link } from "wouter";

const FEATURES = [
  { icon: "⚔️", cls: "feature-icon-cyan", title: "Auto Moderation", desc: "Kazuma-grade smart moderation. Kick spammers, warn troublemakers, and keep your group legendary." },
  { icon: "💧", cls: "feature-icon-cyan", title: "Welcome & Farewell", desc: "Aqua-blessed greetings for every member. Custom welcome cards and goodbye messages." },
  { icon: "💥", cls: "feature-icon-red", title: "Explosion Commands", desc: "Over 200+ commands — games, anime quotes, polls, trivia and Megumin's signature EXPLOSION skill." },
  { icon: "🛡️", cls: "feature-icon-gold", title: "Anti-Link & Anti-Spam", desc: "Darkness-tier protection. Block malicious links, fight spam floods, and keep the party safe." },
  { icon: "📊", cls: "feature-icon-purple", title: "Analytics Dashboard", desc: "Real-time stats on messages, members, activity peaks, and bot performance at your fingertips." },
  { icon: "🎭", cls: "feature-icon-cyan", title: "Fun & Entertainment", desc: "Memes, anime GIFs, RPG battles, ship percentages, and much more to keep your group alive." },
  { icon: "🔔", cls: "feature-icon-gold", title: "Reminders & Scheduler", desc: "Set reminders, schedule announcements, and automate recurring messages on any timetable." },
  { icon: "🌐", cls: "feature-icon-purple", title: "Multi-Language", desc: "Supports 12+ languages. Your community speaks any tongue, the bot speaks all of them." },
  { icon: "⚡", cls: "feature-icon-red", title: "Instant Response", desc: "Sub-100ms response time. The bot reacts faster than Darkness dodges an attack." },
];

const COMMAND_TABS = [
  { id: "general", label: "General", icon: "⚔️" },
  { id: "moderation", label: "Moderation", icon: "🛡️" },
  { id: "fun", label: "Fun", icon: "🎭" },
  { id: "admin", label: "Admin", icon: "👑" },
];

const COMMANDS: Record<string, { name: string; desc: string }[]> = {
  general: [
    { name: "!help", desc: "Show all available commands and usage guide" },
    { name: "!info", desc: "Display bot info, uptime and version" },
    { name: "!ping", desc: "Check bot response time and latency" },
    { name: "!tagall", desc: "Mention all group members at once" },
    { name: "!quote", desc: "Get a random KonoSuba quote" },
    { name: "!weather [city]", desc: "Check weather for any city in the world" },
    { name: "!remind [time] [msg]", desc: "Set a personal or group reminder" },
  ],
  moderation: [
    { name: "!kick @user", desc: "Remove a member from the group (admin only)" },
    { name: "!warn @user", desc: "Issue a warning. 3 warnings = auto-kick" },
    { name: "!mute @user [time]", desc: "Temporarily mute a member" },
    { name: "!antilink on/off", desc: "Toggle link blocking in the group" },
    { name: "!antispam on/off", desc: "Enable spam flood protection" },
    { name: "!promote @user", desc: "Promote member to group admin" },
    { name: "!rules", desc: "Display group rules to all members" },
  ],
  fun: [
    { name: "!explosion", desc: "Cast Megumin's signature EXPLOSION (with sound)" },
    { name: "!ship @user1 @user2", desc: "Check love compatibility percentage" },
    { name: "!battle @user", desc: "Start an RPG battle with another member" },
    { name: "!meme", desc: "Get a random anime or KonoSuba meme" },
    { name: "!trivia", desc: "Start a KonoSuba trivia quiz game" },
    { name: "!waifu", desc: "Get your daily waifu card assignment" },
    { name: "!sticker [text]", desc: "Convert image to sticker with text" },
  ],
  admin: [
    { name: "!setprefix [char]", desc: "Change bot command prefix for this group" },
    { name: "!setwelcome [msg]", desc: "Customize the welcome message template" },
    { name: "!setlang [code]", desc: "Change bot language (en, id, es, pt, ...)" },
    { name: "!broadcast [msg]", desc: "Send message to all groups (owner only)" },
    { name: "!groupinfo", desc: "Show detailed group statistics" },
    { name: "!reset", desc: "Reset all group bot settings to defaults" },
    { name: "!maintenance on/off", desc: "Toggle maintenance mode for the bot" },
  ],
};

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "/forever",
    featured: false,
    features: [
      { text: "1 WhatsApp bot", ok: true },
      { text: "50 commands", ok: true },
      { text: "Basic moderation", ok: true },
      { text: "5 groups max", ok: true },
      { text: "Community support", ok: true },
      { text: "Analytics dashboard", ok: false },
      { text: "Priority support", ok: false },
    ],
    cta: "Get Started",
    ctaCls: "btn-outline",
  },
  {
    name: "Basic",
    price: "9",
    period: "/month",
    featured: false,
    features: [
      { text: "3 WhatsApp bots", ok: true },
      { text: "All 200+ commands", ok: true },
      { text: "Full moderation suite", ok: true },
      { text: "30 groups max", ok: true },
      { text: "Analytics dashboard", ok: true },
      { text: "Email support", ok: true },
      { text: "Custom welcome cards", ok: false },
    ],
    cta: "Start Trial",
    ctaCls: "btn-outline",
  },
  {
    name: "Pro",
    price: "24",
    period: "/month",
    featured: true,
    badge: "Most Popular",
    features: [
      { text: "10 WhatsApp bots", ok: true },
      { text: "All 200+ commands", ok: true },
      { text: "Full moderation suite", ok: true },
      { text: "Unlimited groups", ok: true },
      { text: "Advanced analytics", ok: true },
      { text: "Priority 24/7 support", ok: true },
      { text: "Custom welcome cards", ok: true },
    ],
    cta: "Get Pro",
    ctaCls: "btn-cyan",
  },
  {
    name: "Enterprise",
    price: "79",
    period: "/month",
    featured: false,
    features: [
      { text: "Unlimited bots", ok: true },
      { text: "Custom commands", ok: true },
      { text: "White-label option", ok: true },
      { text: "Unlimited groups", ok: true },
      { text: "Dedicated infrastructure", ok: true },
      { text: "SLA guarantee", ok: true },
      { text: "Dedicated manager", ok: true },
    ],
    cta: "Contact Sales",
    ctaCls: "btn-ghost",
  },
];

const TESTIMONIALS = [
  { text: "This bot transformed our WhatsApp group completely. Moderation is effortless and the KonoSuba theme keeps everyone entertained!", author: "ArindaS", role: "Group Admin • 2,400 members", initials: "AS" },
  { text: "Finally a WhatsApp bot that's actually fun to use. The explosion command alone is worth every penny. Megumin would be proud!", author: "RezaK", role: "Community Manager", initials: "RK" },
  { text: "We run 15 active groups and this bot manages all of them seamlessly. Analytics are incredibly useful for tracking engagement.", author: "Priya M", role: "Enterprise Customer", initials: "PM" },
  { text: "Setup took less than 5 minutes. Response is lightning fast and the commands are intuitive. Best WhatsApp bot platform out there.", author: "TomH", role: "Discord & WhatsApp Admin", initials: "TH" },
  { text: "The anti-spam and anti-link features alone saved our group from chaos. It's like having Darkness guard your server 24/7.", author: "LucasB", role: "Gaming Community Lead", initials: "LB" },
  { text: "Customer support is amazing. They helped us set up custom welcome cards in under an hour. Highly recommended!", author: "SarahK", role: "Pro User", initials: "SK" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("general");
  const [stats, setStats] = useState({ users: 12800, bots: 3240, messages: 14200000, groups: 48600 });

  const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M+` : n >= 1000 ? `${Math.floor(n / 1000)}K+` : `${n}+`;

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">K</div>
          KonoBot
        </div>
        <div className="navbar-links">
          <a href="#features">Features</a>
          <a href="#party">Party</a>
          <a href="#commands">Commands</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="navbar-actions">
          <Link href="/auth"><button className="btn btn-ghost btn-sm">Login</button></Link>
          <Link href="/auth"><button className="btn btn-cyan btn-sm">Get Started</button></Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content animate-slide-up">
          <div className="hero-badge">
            ⚔️ &nbsp;God's Blessing on This Wonderful Bot
          </div>
          <h1 className="hero-title">
            The Most <span className="gradient-text">Legendary</span><br />
            WhatsApp Bot <span className="gold-text">Platform</span>
          </h1>
          <p className="hero-subtitle">
            Summon the power of Kazuma's party for your WhatsApp groups.
            Auto-moderation, 200+ commands, analytics, and more — powered by the adventurer spirit.
          </p>
          <div className="hero-actions">
            <Link href="/auth">
              <button className="btn btn-cyan btn-lg">⚡ Start Free Today</button>
            </Link>
            <a href="#commands">
              <button className="btn btn-outline btn-lg">📜 View Commands</button>
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{fmtNum(stats.users)}</span>
              <span className="hero-stat-label">Active Users</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{fmtNum(stats.bots)}</span>
              <span className="hero-stat-label">Bots Deployed</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{fmtNum(stats.messages)}</span>
              <span className="hero-stat-label">Messages Handled</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{fmtNum(stats.groups)}</span>
              <span className="hero-stat-label">Groups Served</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="section-header">
          <div className="section-tag">⚔️ Arsenal</div>
          <h2 className="section-title">Everything Your Party Needs</h2>
          <p className="section-desc">From Kazuma's cunning moderation to Megumin's explosive fun — your groups will never be the same.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card feature-card">
              <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="glow-divider" />

      {/* PARTY / CHARACTERS */}
      <div className="section-bg-subtle">
        <section id="party" className="section">
          <div className="section-header">
            <div className="section-tag">🎭 The Party</div>
            <h2 className="section-title">Meet the Adventurers</h2>
            <p className="section-desc">Each bot personality is inspired by KonoSuba's iconic party members. Choose your style.</p>
          </div>
          <div className="party-grid">
            <div className="glass-card character-card kazuma">
              <div className="character-avatar kazuma">K</div>
              <div className="character-name">Kazuma Mode</div>
              <div className="character-class kazuma">Adventurer</div>
              <p className="character-desc">Strategic and cunning. Perfect balance of every feature — moderation, fun, and analytics all in one smooth operator.</p>
            </div>
            <div className="glass-card character-card aqua">
              <div className="character-avatar aqua">A</div>
              <div className="character-name">Aqua Mode</div>
              <div className="character-class aqua">Arch Priest</div>
              <p className="character-desc">Warmth and welcome. Spectacular greeting cards, blessing-level spam protection, and community-focused features.</p>
            </div>
            <div className="glass-card character-card megumin">
              <div className="character-avatar megumin">M</div>
              <div className="character-name">Megumin Mode</div>
              <div className="character-class megumin">Arch Wizard</div>
              <p className="character-desc">Explosive entertainment. Maximum fun commands, anime content, games, and EXPLOSION power at full charge.</p>
            </div>
            <div className="glass-card character-card darkness">
              <div className="character-avatar darkness">D</div>
              <div className="character-name">Darkness Mode</div>
              <div className="character-class darkness">Crusader</div>
              <p className="character-desc">Unbreakable defense. Iron-clad moderation, anti-raid protection, and the most aggressive spam-blocking shield available.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="glow-divider" />

      {/* COMMANDS */}
      <section id="commands" className="section">
        <div className="section-header">
          <div className="section-tag">📜 Grimoire</div>
          <h2 className="section-title">200+ Powerful Commands</h2>
          <p className="section-desc">Every spell in the book. Browse by category or search what you need.</p>
        </div>
        <div className="commands-wrapper">
          <div className="commands-sidebar">
            {COMMAND_TABS.map((t) => (
              <button key={t.id} className={`cmd-tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div>
            <div className="commands-list">
              {(COMMANDS[activeTab] || []).map((cmd) => (
                <div key={cmd.name} className="command-item">
                  <span className="command-name">{cmd.name}</span>
                  <span className="command-desc">{cmd.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="glow-divider" />

      {/* PRICING */}
      <div className="section-bg-subtle">
        <section id="pricing" className="section">
          <div className="section-header">
            <div className="section-tag">💎 Plans</div>
            <h2 className="section-title">Choose Your Class</h2>
            <p className="section-desc">Every adventurer starts somewhere. Upgrade as your party grows.</p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((p) => (
              <div key={p.name} className={`glass-card pricing-card${p.featured ? " featured" : ""}`}>
                {p.badge && <div className="pricing-badge">{p.badge}</div>}
                <div className="pricing-name">{p.name}</div>
                <div className="pricing-price">
                  <span className="pricing-currency">$</span>
                  <span className="pricing-amount">{p.price}</span>
                </div>
                <p className="pricing-period">{p.period}</p>
                <ul className="pricing-features">
                  {p.features.map((f) => (
                    <li key={f.text}>
                      <span className={f.ok ? "check" : "x"}>{f.ok ? "✓" : "✗"}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <Link href="/auth">
                  <button className={`btn ${p.ctaCls} w-full`} style={{ width: "100%" }}>{p.cta}</button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="glow-divider" />

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="section-header">
          <div className="section-tag">⭐ Testimonials</div>
          <h2 className="section-title">What the Guild Says</h2>
          <p className="section-desc">Adventurers from across the realm share their experience with KonoBot.</p>
        </div>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.author} className="glass-card testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.initials}</div>
                <div>
                  <div className="testimonial-name">{t.author}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="section-bg-subtle">
        <section className="section" style={{ textAlign: "center" }}>
          <div className="section-tag">🚀 Ready?</div>
          <h2 className="section-title">Begin Your Adventure</h2>
          <p className="section-desc" style={{ marginBottom: "36px" }}>
            Join over 12,000+ communities who chose KonoBot to power their WhatsApp groups. Free to start, legendary forever.
          </p>
          <div className="hero-actions">
            <Link href="/auth">
              <button className="btn btn-cyan btn-lg">⚔️ Create Free Account</button>
            </Link>
            <a href="https://wa.me/demo" target="_blank" rel="noopener noreferrer">
              <button className="btn btn-outline btn-lg">💬 Try Demo Bot</button>
            </a>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="navbar-logo" style={{ position: "static" }}>
                <div className="navbar-logo-icon">K</div>
                KonoBot
              </div>
              <p>God's blessing on your wonderful WhatsApp groups. The most powerful anime-themed bot platform on the internet.</p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#commands">Commands</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                  <li><a href="#party">Bot Modes</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Support</h4>
                <ul>
                  <li><a href="#">Documentation</a></li>
                  <li><a href="#">FAQ</a></li>
                  <li><a href="#">Discord Server</a></li>
                  <li><a href="#">WhatsApp Support</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                  <li><a href="#">DMCA</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 KonoBot. All rights reserved. Not affiliated with KonoSuba or Yen Press.</p>
            <p style={{ color: "var(--cyan)", fontSize: "0.8rem" }}>Made with ⚡ and explosion magic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
