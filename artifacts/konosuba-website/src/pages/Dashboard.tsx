import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { api, getToken, getCurrentUser, removeToken } from '../lib/api';
import { CharAvatar, charForLevel, charForIndex } from '../components/CharAvatar';
import { LogOut, LayoutDashboard, Activity, Package, Trophy, ShieldAlert } from 'lucide-react';

type Tab = 'overview' | 'activity' | 'inventory' | 'leaderboard';

interface ActivityItem { _id?: string; icon?: string; title?: string; description?: string; type?: string; createdAt?: string; }
interface LeaderboardEntry { rank: number; name: string; phone: string; level: number; wallet: number; bank: number; netWorth?: number; totalBalance?: number; }

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [currentUser] = useState(() => getCurrentUser());
  const [tab, setTab]             = useState<Tab>('overview');
  const [profile, setProfile]     = useState<Record<string, unknown> | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [inventory, setInventory]   = useState<{ item: string; qty: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const phone = currentUser?.phone as string | undefined;

  const loadData = useCallback(async () => {
    if (!phone) { setLoading(false); setError('Could not determine your phone number. Please log out and log in again.'); return; }
    try {
      const [p, a, inv, lb] = await Promise.all([api.profile(phone), api.activity(phone), api.inventory(phone), api.leaderboard()]);
      setProfile(p as Record<string, unknown>);
      setActivities(a as ActivityItem[]);
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
      <div style={{ width: 48, height: 48, border: '3px solid rgba(0,212,255,0.2)', borderTopColor: 'var(--cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: 'var(--cyan)', fontFamily: 'Cinzel, serif', fontSize: '0.9rem' }}>Loading your adventure...</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <ShieldAlert size={36} color="#fca5a5" />
      <div style={{ color: '#fca5a5', fontFamily: 'Cinzel, serif' }}>{error}</div>
      <button onClick={logout} className="ghost-btn">Logout</button>
    </div>
  );

  const p        = profile || {};
  const netWorth = (p.netWorth as number) ?? (p.totalBalance as number) ?? 0;
  const xpPct    = Math.min(100, (Number(p.xp || 0) / (Number(p.level || 1) * 100)) * 100);
  const userChar = charForLevel(Number(p.level || 1));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <LayoutDashboard size={14}/> },
    { id: 'activity',    label: 'Activity',    icon: <Activity size={14}/> },
    { id: 'inventory',   label: 'Inventory',   icon: <Package size={14}/> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14}/> },
  ];

  const statCards = [
    { label: 'Wallet',      value: `₿ ${Number(p.wallet || 0).toLocaleString()}` },
    { label: 'Bank',        value: `₿ ${Number(p.bank || 0).toLocaleString()}` },
    { label: 'Net Worth',   value: `₿ ${netWorth.toLocaleString()}` },
    { label: 'Level',       value: String(p.level || 1) },
    { label: 'XP',          value: String(p.xp || 0) },
    { label: 'Global Rank', value: `#${p.rank || '?'}` },
  ];

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <Link to="/" className="navbar-logo" style={{ fontSize: '1.15rem' }}>⚔ KONOSUBA</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${userChar.color}45`, flexShrink: 0 }}>
              <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ width: '100%', height: '100%', borderRadius: '50%' }} initial={userChar.name.charAt(0)} />
            </div>
            <span style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.88rem' }}>{String(p.name || phone || 'Adventurer')}</span>
          </div>
          {(p.isAdmin || p.isMod) && (
            <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.38rem 0.75rem', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.22)', borderRadius: 7, color: 'var(--gold)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
              <ShieldAlert size={12}/> Admin
            </Link>
          )}
          <button onClick={logout} className="ghost-btn" style={{ padding: '0.42rem 0.9rem', fontSize: '0.8rem', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.25)' }}>
            <LogOut size={12} style={{ display: 'inline', marginRight: 4 }} />Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-body">
        <div className="profile-hero" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', bottom: 0, height: '110%', width: 'auto', opacity: 0.09, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end' }}>
            <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ height: '100%', width: 'auto', borderRadius: 0, filter: `drop-shadow(0 0 30px ${userChar.color}60)` }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${userChar.color}55`, background: 'rgba(0,0,20,0.8)', flexShrink: 0, boxShadow: `0 0 20px ${userChar.color}28` }}>
              <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ width: '100%', height: '100%', borderRadius: '50%' }} initial={userChar.name.charAt(0)} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'Cinzel, serif', color: '#fff' }}>{String(p.name || phone || 'Adventurer')}</h1>
              <div style={{ color: userChar.color, fontSize: '0.85rem', marginTop: 2 }}>Level {String(p.level || 1)} Adventurer · {userChar.name} class</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>+{phone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {p.isAdmin && <div style={{ fontSize: '0.72rem', color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(255,215,0,0.18)', borderRadius: 6, padding: '0.18rem 0.55rem' }}>Admin</div>}
              {p.isMod && !p.isAdmin && <div style={{ fontSize: '0.72rem', color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 6, padding: '0.18rem 0.55rem' }}>Mod</div>}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: '0.38rem' }}>
              <span>XP Progress to Level {Number(p.level || 1) + 1}</span>
              <span>{Number(p.xp || 0)} / {Number(p.level || 1) * 100}</span>
            </div>
            <div className="xp-bar"><div className="xp-fill" style={{ width: `${xpPct}%` }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.7rem', position: 'relative', zIndex: 1 }}>
            {statCards.map(s => (
              <div key={s.label} className="mini-stat">
                <div className="mini-stat-value">{s.value}</div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`dashboard-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.38rem' }}>{t.icon} {t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--cyan)', fontFamily: 'Cinzel,serif', fontSize: '0.95rem', marginBottom: '1rem', fontWeight: 700 }}>Account Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: '0.7rem' }}>
              {([
                ['Phone',      `+${phone}`],
                ['Status',     p.banned ? 'Banned' : 'Active'],
                ['Role',       p.isAdmin ? 'Admin' : p.isMod ? 'Moderator' : 'Member'],
                ['Joined',     p.joinedAt ? new Date(p.joinedAt as string).toLocaleDateString() : 'Unknown'],
                ['Bank Limit', `₿ ${Number(p.bankLimit || 10000).toLocaleString()}`],
                ['Net Worth',  `₿ ${netWorth.toLocaleString()}`],
                ['Warnings',   String(p.warnings || 0)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 10, padding: '0.82rem 1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.88rem', color: k === 'Status' ? (p.banned ? '#fca5a5' : '#22c55e') : 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <Activity size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3, display: 'block' }} />
                No activity recorded yet. Start using the bot to see your logs here.
              </div>
            ) : activities.map((a, i) => (
              <div key={a._id || i} className="activity-item">
                <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{a.icon || '📌'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.title || 'Activity'}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 2 }}>{a.description || 'No description'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.71rem', marginTop: 3 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
                </div>
                {a.type && <span style={{ background: 'var(--purple-dim)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 6, padding: '0.18rem 0.55rem', fontSize: '0.7rem', color: 'var(--purple)', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>{a.type}</span>}
              </div>
            ))}
          </div>
        )}

        {tab === 'inventory' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--cyan)', fontFamily: 'Cinzel,serif', fontSize: '0.95rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={16}/> Item Inventory
            </h3>
            {inventory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Package size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3, display: 'block' }} />
                Your inventory is empty. Earn items by completing quests!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px,1fr))', gap: '0.7rem' }}>
                {inventory.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 12, padding: '0.9rem', textAlign: 'center' }}>
                    <Package size={24} style={{ margin: '0 auto 0.4rem', color: 'var(--cyan)', display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{item.item}</div>
                    <div style={{ color: 'var(--cyan)', fontSize: '0.78rem', marginTop: 2 }}>×{item.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--gold)', fontFamily: 'Cinzel,serif', fontSize: '0.95rem', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={16}/> Global Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {leaderboard.slice(0, 20).map((u, i) => {
                const worth  = u.netWorth ?? u.totalBalance ?? 0;
                const medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${u.rank}`;
                const isMe   = u.phone === phone;
                const lbChar = charForIndex(i);
                return (
                  <div key={i} className={`leaderboard-row${isMe ? ' is-me' : ''}`}>
                    <div style={{ width: 38, textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0 }}>{medal}</div>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${isMe ? lbChar.color : 'rgba(255,255,255,0.07)'}45`, background: 'rgba(0,0,20,0.7)', flexShrink: 0 }}>
                      <CharAvatar src={lbChar.img} alt={lbChar.name} color={lbChar.color} style={{ width: '100%', height: '100%', borderRadius: '50%' }} initial={lbChar.name.charAt(0)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isMe ? 'var(--cyan)' : 'var(--text-primary)' }}>{u.name}{isMe ? ' (You)' : ''}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>Level {u.level}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.88rem' }}>₿ {worth.toLocaleString()}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>net worth</div>
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
