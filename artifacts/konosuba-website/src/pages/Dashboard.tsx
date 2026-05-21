import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { api, getToken, getCurrentUser, removeToken } from '../lib/api';

type Tab = 'overview' | 'activity' | 'inventory' | 'leaderboard';

interface Activity {
  _id?: string;
  icon?: string;
  title?: string;
  description?: string;
  type?: string;
  createdAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  phone: string;
  level: number;
  wallet: number;
  bank: number;
  netWorth?: number;
  totalBalance?: number;
}

export default function Dashboard() {
  const [, navigate] = useLocation();

  // FIX: Wrap in useState initializer so getCurrentUser() is called ONCE on mount,
  // not on every render. Calling it directly in the component body creates a new
  // object reference every render → useCallback dep [currentUser] changes every
  // render → new loadData fn → useEffect fires again → infinite loop.
  const [currentUser] = useState(() => getCurrentUser());

  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile]       = useState<Record<string, unknown> | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [inventory, setInventory]   = useState<{ item: string; qty: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const phone = currentUser?.phone as string | undefined;

  const loadData = useCallback(async () => {
    if (!phone) return;
    try {
      const [p, a, inv, lb] = await Promise.all([
        api.profile(phone),
        api.activity(phone),
        api.inventory(phone),
        api.leaderboard(),
      ]);
      setProfile(p as Record<string, unknown>);
      setActivities(a as Activity[]);
      setInventory(inv as { item: string; qty: number }[]);
      setLeaderboard(lb as LeaderboardEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (!getToken() || !currentUser) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [loadData, currentUser, navigate]);

  function logout() {
    removeToken();
    navigate('/auth');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
        <div style={{ color: '#a78bfa', fontSize: '1.1rem' }}>Loading your adventure...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <div style={{ color: '#fca5a5' }}>{error}</div>
        <button onClick={logout} style={{ padding: '0.6rem 1.5rem', background: 'rgba(167,139,250,0.3)', border: '1px solid #a78bfa', borderRadius: 8, color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
          Logout
        </button>
      </div>
    );
  }

  const p = profile || {};
  // FIX: API returns both netWorth and totalBalance; accept either field name
  const netWorth = (p.netWorth as number) ?? (p.totalBalance as number) ?? 0;

  const statCards = [
    { icon: '💰', label: 'Wallet',   value: `₿ ${Number(p.wallet || 0).toLocaleString()}` },
    { icon: '🏦', label: 'Bank',     value: `₿ ${Number(p.bank || 0).toLocaleString()}` },
    { icon: '💎', label: 'Net Worth',value: `₿ ${netWorth.toLocaleString()}` },
    { icon: '⭐', label: 'Level',    value: String(p.level || 1) },
    { icon: '✨', label: 'XP',       value: String(p.xp || 0) },
    { icon: '🎯', label: 'Rank',     value: `#${p.rank || '?'}` },
  ];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview',    label: 'Overview',    icon: '🏠' },
    { id: 'activity',    label: 'Activity',    icon: '📜' },
    { id: 'inventory',   label: 'Inventory',   icon: '🎒' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#fff', fontFamily: 'sans-serif' }}>
      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(90deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚔️ KONOSUBA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#a78bfa', fontWeight: 600 }}>{String(p.name || phone || '')}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, color: '#fca5a5', cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* PROFILE HERO */}
        <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(244,114,182,0.15))', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 20, padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              ⚔️
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{String(p.name || phone || 'Adventurer')}</h1>
              <div style={{ color: '#a78bfa', fontSize: '0.9rem' }}>Level {String(p.level || 1)}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>📱 +{phone}</div>
            </div>
          </div>

          {/* XP BAR */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: 4 }}>
              <span>XP Progress</span>
              <span>{Number(p.xp || 0)} / {Number(p.level || 1) * 100}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 999, height: 8 }}>
              <div style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)', borderRadius: 999, height: '100%', width: `${Math.min(100, (Number(p.xp || 0) / (Number(p.level || 1) * 100)) * 100)}%`, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* STAT CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: 4 }}>{s.value}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: 6, borderRadius: 14, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: '1 1 auto', padding: '0.6rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                background: tab === t.id ? 'linear-gradient(90deg, #a78bfa, #f472b6)' : 'transparent',
                color: tab === t.id ? '#fff' : '#94a3b8',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#a78bfa' }}>📊 Account Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                ['📱 Phone',      `+${phone}`],
                ['🎭 Status',     p.banned ? '🚫 Banned' : '✅ Active'],
                ['🛡️ Role',      p.isAdmin ? 'Admin' : p.isMod ? 'Mod' : 'Member'],
                ['📅 Joined',     p.joinedAt ? new Date(p.joinedAt as string).toLocaleDateString() : 'Unknown'],
                ['🏦 Bank Limit', `₿ ${Number(p.bankLimit || 10000).toLocaleString()}`],
                ['💎 Net Worth',  `₿ ${netWorth.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k as string} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.75rem' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{k}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{v as string}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>No activity recorded yet</div>
            ) : activities.map((a, i) => (
              <div key={a._id || i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem' }}>{a.icon || '📌'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.title || 'Activity'}</div>
                  {/* FIX: API normalizes desc→description and timestamp→createdAt */}
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 2 }}>
                    {a.description || 'No description'}
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: 4 }}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                {a.type && (
                  <span style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: '#a78bfa', whiteSpace: 'nowrap' }}>
                    {a.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* INVENTORY */}
        {tab === 'inventory' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#a78bfa' }}>🎒 Inventory</h3>
            {inventory.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Your inventory is empty</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {inventory.map((item, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem' }}>📦</div>
                    <div style={{ fontWeight: 600, marginTop: 4, fontSize: '0.9rem' }}>{item.item}</div>
                    <div style={{ color: '#a78bfa', fontSize: '0.8rem' }}>×{item.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#a78bfa' }}>🏆 Global Leaderboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboard.slice(0, 20).map((u, i) => {
                // FIX: accept both netWorth (API field) and totalBalance (old field name)
                const worth = u.netWorth ?? u.totalBalance ?? 0;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${u.rank}`;
                const isMe = u.phone === phone;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: isMe ? 'rgba(167,139,250,0.1)' : 'rgba(0,0,0,0.2)', border: `1px solid ${isMe ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <div style={{ width: 36, textAlign: 'center', fontWeight: 700 }}>{medal}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Level {u.level}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#a78bfa' }}>₿ {worth.toLocaleString()}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>net worth</div>
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
