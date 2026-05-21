import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { api, getToken, getCurrentUser, removeToken } from '../lib/api';

type Tab = 'overview' | 'activity' | 'inventory' | 'leaderboard';

interface Activity { _id?: string; icon?: string; title?: string; description?: string; type?: string; createdAt?: string; }
interface LeaderboardEntry { rank: number; name: string; phone: string; level: number; wallet: number; bank: number; netWorth?: number; totalBalance?: number; }

// ── Real KonoSuba character images — Fandom Wiki CDN ─────────────────────────
const CHARS = [
  { img: 'https://static.wikia.nocookie.net/konosuba/images/4/4f/Kazuma_Anime.png/revision/latest?width=200', name: 'Kazuma',   color: '#00d4ff' },
  { img: 'https://static.wikia.nocookie.net/konosuba/images/9/9e/Aqua_Anime.png/revision/latest?width=200',  name: 'Aqua',     color: '#38bdf8' },
  { img: 'https://static.wikia.nocookie.net/konosuba/images/9/97/Megumin_Anime.png/revision/latest?width=200', name: 'Megumin', color: '#f472b6' },
  { img: 'https://static.wikia.nocookie.net/konosuba/images/d/d5/Darkness_Anime.png/revision/latest?width=200', name: 'Darkness', color: '#ffd700' },
  { img: 'https://static.wikia.nocookie.net/konosuba/images/e/eb/Wiz_Anime.png/revision/latest?width=200',   name: 'Wiz',      color: '#8b5cf6' },
  { img: 'https://static.wikia.nocookie.net/konosuba/images/5/57/Yunyun_Anime.png/revision/latest?width=200', name: 'Yunyun',  color: '#c084fc' },
];

// Pick a character based on user level
function charForLevel(level: number) {
  return CHARS[Math.max(0, Math.min(CHARS.length - 1, Math.floor((level - 1) / 5))) % CHARS.length];
}

// Pick a character for leaderboard entries (cycling by index)
function charForIndex(i: number) { return CHARS[i % CHARS.length]; }

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [currentUser] = useState(() => getCurrentUser());
  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [inventory, setInventory] = useState<{ item: string; qty: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const phone = currentUser?.phone as string | undefined;

  const loadData = useCallback(async () => {
    if (!phone) return;
    try {
      const [p, a, inv, lb] = await Promise.all([
        api.profile(phone), api.activity(phone), api.inventory(phone), api.leaderboard(),
      ]);
      setProfile(p as Record<string, unknown>);
      setActivities(a as Activity[]);
      setInventory(inv as { item: string; qty: number }[]);
      setLeaderboard(lb as LeaderboardEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally { setLoading(false); }
  }, [phone]);

  useEffect(() => {
    if (!getToken() || !currentUser) { navigate('/auth'); return; }
    loadData();
  }, [loadData, currentUser, navigate]);

  function logout() { removeToken(); navigate('/auth'); }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>⚔️</div>
      <div style={{ color: 'var(--cyan)', fontFamily: 'Cinzel, serif' }}>Loading your adventure...</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ color: '#fca5a5', fontFamily: 'Cinzel, serif' }}>{error}</div>
      <button onClick={logout} className="ghost-btn">Logout</button>
    </div>
  );

  const p = profile || {};
  const netWorth = (p.netWorth as number) ?? (p.totalBalance as number) ?? 0;
  const xpPct = Math.min(100, (Number(p.xp || 0) / (Number(p.level || 1) * 100)) * 100);
  const userChar = charForLevel(Number(p.level || 1));

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: '◈' },
    { id: 'activity',    label: 'Activity',    icon: '📜' },
    { id: 'inventory',   label: 'Inventory',   icon: '🎒' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  const statCards = [
    { icon: '💰', label: 'Wallet',      value: `₿ ${Number(p.wallet || 0).toLocaleString()}` },
    { icon: '🏦', label: 'Bank',        value: `₿ ${Number(p.bank || 0).toLocaleString()}` },
    { icon: '💎', label: 'Net Worth',   value: `₿ ${netWorth.toLocaleString()}` },
    { icon: '⭐', label: 'Level',       value: String(p.level || 1) },
    { icon: '✨', label: 'XP',          value: String(p.xp || 0) },
    { icon: '🎯', label: 'Global Rank', value: `#${p.rank || '?'}` },
  ];

  return (
    <div className="dashboard-page">
      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="dashboard-nav">
        <a href="/" className="navbar-logo" style={{ fontSize: '1.2rem' }}>⚔ KONOSUBA</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Real character avatar in nav */}
            <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${userChar.color}50`, background: 'rgba(0,0,20,0.7)', flexShrink: 0 }}>
              <img src={userChar.img} alt={userChar.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
            <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.9rem' }}>{String(p.name || phone || 'Adventurer')}</span>
          </div>
          <button onClick={logout} className="ghost-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-body">
        {/* ── PROFILE HERO ─────────────────────────────────────────── */}
        <div className="profile-hero" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Decorative character art — large, background right */}
          <img
            src={userChar.img}
            alt={userChar.name}
            aria-hidden="true"
            style={{
              position: 'absolute', right: '-20px', bottom: 0,
              height: '105%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom',
              opacity: 0.12,
              filter: `drop-shadow(0 0 24px ${userChar.color}40)`,
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            {/* Real character as profile avatar */}
            <div style={{
              width: 68, height: 68, borderRadius: '50%', overflow: 'hidden',
              border: `3px solid ${userChar.color}60`,
              background: 'rgba(0,0,20,0.8)', flexShrink: 0,
              boxShadow: `0 0 20px ${userChar.color}30`,
            }}>
              <img src={userChar.img} alt={userChar.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Cinzel, serif', color: '#fff' }}>
                {String(p.name || phone || 'Adventurer')}
              </h1>
              <div style={{ color: userChar.color, fontSize: '0.88rem', marginTop: 2 }}>Level {String(p.level || 1)} Adventurer · {userChar.name} class</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>📱 +{phone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {p.isAdmin && <div style={{ fontSize: '0.75rem', color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem' }}>Admin</div>}
              {p.isMod && !p.isAdmin && <div style={{ fontSize: '0.75rem', color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem' }}>Mod</div>}
            </div>
          </div>

          {/* XP Bar */}
          <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
              <span>XP Progress to Level {Number(p.level || 1) + 1}</span>
              <span>{Number(p.xp || 0)} / {Number(p.level || 1) * 100}</span>
            </div>
            <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
            {statCards.map(s => (
              <div key={s.label} className="mini-stat">
                <div style={{ fontSize: '1.25rem' }}>{s.icon}</div>
                <div className="mini-stat-value" style={{ marginTop: '0.25rem' }}>{s.value}</div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ────────────────────────────────────────────────── */}
        <div className="dashboard-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`dashboard-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--cyan)', fontFamily: 'Cinzel,serif', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>Account Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '0.75rem' }}>
              {[
                ['Phone',      `+${phone}`],
                ['Status',     p.banned ? '🚫 Banned' : '✅ Active'],
                ['Role',       p.isAdmin ? 'Admin' : p.isMod ? 'Moderator' : 'Member'],
                ['Joined',     p.joinedAt ? new Date(p.joinedAt as string).toLocaleDateString() : 'Unknown'],
                ['Bank Limit', `₿ ${Number(p.bankLimit || 10000).toLocaleString()}`],
                ['Net Worth',  `₿ ${netWorth.toLocaleString()}`],
                ['Warnings',   String(p.warnings || 0)],
              ].map(([k, v]) => (
                <div key={k as string} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.85rem 1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.9rem' }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIVITY ────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📜</div>
                No activity recorded yet. Start using the bot to see your logs here.
              </div>
            ) : activities.map((a, i) => (
              <div key={a._id || i} className="activity-item">
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{a.icon || '📌'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title || 'Activity'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 2 }}>{a.description || 'No description'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: 4 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                </div>
                {a.type && (
                  <span style={{ background: 'var(--purple-dim)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.72rem', color: 'var(--purple)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
                    {a.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── INVENTORY ───────────────────────────────────────────── */}
        {tab === 'inventory' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--cyan)', fontFamily: 'Cinzel,serif', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>🎒 Item Inventory</h3>
            {inventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎒</div>
                Your inventory is empty. Earn items by completing quests!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: '0.75rem' }}>
                {inventory.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 12, padding: '1rem', textAlign: 'center', transition: 'all 0.2s', cursor: 'default' }}>
                    <div style={{ fontSize: '1.5rem' }}>📦</div>
                    <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.85rem' }}>{item.item}</div>
                    <div style={{ color: 'var(--cyan)', fontSize: '0.8rem', marginTop: 2 }}>×{item.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LEADERBOARD ─────────────────────────────────────────── */}
        {tab === 'leaderboard' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--gold)', fontFamily: 'Cinzel,serif', fontSize: '1rem', marginBottom: '1rem', fontWeight: 700 }}>🏆 Global Leaderboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboard.slice(0, 20).map((u, i) => {
                const worth = u.netWorth ?? u.totalBalance ?? 0;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${u.rank}`;
                const isMe = u.phone === phone;
                const lbChar = charForIndex(i);
                return (
                  <div key={i} className={`leaderboard-row${isMe ? ' is-me' : ''}`}>
                    <div style={{ width: 40, textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{medal}</div>
                    {/* Real character image as leaderboard avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${isMe ? lbChar.color : 'rgba(255,255,255,0.08)'}50`, background: 'rgba(0,0,20,0.7)', flexShrink: 0 }}>
                      <img src={lbChar.img} alt={lbChar.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} loading="lazy" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isMe ? 'var(--cyan)' : 'var(--text-primary)' }}>{u.name}{isMe ? ' (You)' : ''}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Level {u.level}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.9rem' }}>₿ {worth.toLocaleString()}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>net worth</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
