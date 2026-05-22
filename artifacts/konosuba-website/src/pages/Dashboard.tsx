import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api, removeToken } from '../lib/api';

interface User {
  _id: string;
  username: string;
  email: string;
  userId: string;
  guildXP: number;
  guildRank: number;
  coins: number;
  joinDate: string;
}

interface GuildStats {
  totalMembers: number;
  activeMembers: number;
  totalCommands: number;
  premiumTier: string;
}

const RANKS = [
  { rank: 1, name: 'Novice Adventurer', color: '#gray' },
  { rank: 2, name: 'Seasoned Warrior', color: '#d4af37' },
  { rank: 3, name: 'Guild Master', color: '#d4af37' },
  { rank: 4, name: 'Legendary Hero', color: '#f4d35e' },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<GuildStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalCommands: 0,
    premiumTier: 'free',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.user()
      .then(u => {
        setUser(u as User);
        setStats({
          totalMembers: Math.floor(Math.random() * 1000) + 100,
          activeMembers: Math.floor(Math.random() * 500) + 50,
          totalCommands: Math.floor(Math.random() * 50000) + 5000,
          premiumTier: Math.random() > 0.7 ? 'premium' : 'free',
        });
      })
      .catch(() => navigate('/auth'))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔</div>
          <p style={{ color: 'var(--text-dim)' }}>Loading Guild Dashboard...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    removeToken();
    navigate('/');
  };

  const getRankInfo = (rank: number) => {
    return RANKS.find(r => r.rank === Math.min(rank, 4)) || RANKS[0];
  };

  const xpPercentage = (user?.guildXP || 0) % 100;
  const rankInfo = getRankInfo(user?.guildRank || 1);

  return (
    <div className="dashboard-page">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <div className="dashboard-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ⚔ Guild Dashboard
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="ghost-btn"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
        >
          Logout
        </button>
      </div>

      <div className="dashboard-body">
        {/* ── Profile Hero ────────────────────────────────────────────────── */}
        <div className="profile-hero">
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div className="profile-avatar" style={{
              width: '80px', height: '80px',
              background: 'linear-gradient(135deg, var(--gold), var(--amber))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', flex: 0,
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
              border: '3px solid var(--gold)'
            }}>
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {user?.username || 'Adventurer'}
                </h2>
                <span style={{
                  padding: '0.4rem 1rem', borderRadius: '999px',
                  background: 'rgba(212, 175, 55, 0.2)', color: 'var(--gold)',
                  fontSize: '0.8rem', fontWeight: 700
                }}>
                  {rankInfo.name}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Guild XP: {(user?.guildXP || 0).toLocaleString()} • Rank #{user?.guildRank || 1}
              </p>
              <div style={{ maxWidth: '400px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  XP Progress: {xpPercentage}%
                </div>
                <div className="xp-bar">
                  <div className="xp-fill" style={{ width: `${xpPercentage}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────– */}
        <div className="dashboard-tabs">
          {['overview', 'economy', 'guild', 'settings'].map(tab => (
            <button
              key={tab}
              className={`dashboard-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1.2rem',
                background: activeTab === tab ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(184, 134, 11, 0.2))' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(212, 175, 55, 0.4)' : 'none',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                color: activeTab === tab ? 'var(--gold)' : 'var(--text-dim)',
                fontWeight: activeTab === tab ? 700 : 600, fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem',
                flex: 1, minWidth: '120px'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ────────────────────────────────────────────────– */}
        {activeTab === 'overview' && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              ⚔ Guild Overview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              {[
                { label: 'Guild Members', value: stats.totalMembers, icon: '👥' },
                { label: 'Active Members', value: stats.activeMembers, icon: '⚡' },
                { label: 'Commands Used', value: stats.totalCommands, icon: '📊' },
                { label: 'Your Balance', value: `${(user?.coins || 0).toLocaleString()} Gold`, icon: '💰' },
              ].map((stat, i) => (
                <div key={i} className="mini-stat">
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                  <div className="mini-stat-value">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
                  <div className="mini-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              ◈ Top Members
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'Kazuma', xp: 45230, isMe: user?.username === 'Kazuma' },
                { name: 'Aqua', xp: 42100, isMe: user?.username === 'Aqua' },
                { name: 'Megumin', xp: 38900, isMe: user?.username === 'Megumin' },
                { name: user?.username || 'You', xp: user?.guildXP || 0, isMe: true },
              ].map((member, i) => (
                <div
                  key={i}
                  className="leaderboard-row"
                  style={{
                    background: member.isMe ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(212, 175, 55, 0.05))' : 'var(--glass)',
                    border: member.isMe ? '2px solid rgba(212, 175, 55, 0.35)' : '2px solid rgba(212, 175, 55, 0.15)',
                    borderRadius: '8px', padding: '1rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '1.8rem', minWidth: '40px' }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: member.isMe ? 'var(--gold)' : 'var(--text-primary)' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {member.xp.toLocaleString()} Guild XP
                    </div>
                  </div>
                  {member.isMe && (
                    <span style={{
                      padding: '0.3rem 0.8rem', borderRadius: '4px',
                      background: 'rgba(212, 175, 55, 0.3)', color: 'var(--gold)',
                      fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                    }}>
                      You
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Economy Tab ──────────────────────────────────────────────────– */}
        {activeTab === 'economy' && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              💰 Guild Treasury
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Wallet Balance</div>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {(user?.coins || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, marginTop: '0.5rem' }}>GOLD</div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Bank Balance</div>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--amber), var(--gold-dark))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {Math.floor((user?.coins || 0) * 0.4).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, marginTop: '0.5rem' }}>GOLD</div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Daily Reward</div>
                <div style={{
                  fontSize: '2.5rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--gold-light), var(--gold))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  500
                </div>
                <button className="glow-btn" style={{
                  width: '100%', padding: '0.5rem', marginTop: '1rem',
                  fontSize: '0.9rem', fontWeight: 700
                }}>
                  Claim Daily
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              ⚡ Recent Transactions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { type: 'Daily Reward', amount: '+500', time: '2 hours ago' },
                { type: 'Quest Completion', amount: '+2000', time: '5 hours ago' },
                { type: 'Transfer to Guild', amount: '-300', time: '1 day ago' },
              ].map((trans, i) => (
                <div key={i} className="activity-item">
                  <span style={{ fontSize: '1.5rem' }}>
                    {trans.amount.startsWith('-') ? '📤' : '📥'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {trans.type}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {trans.time}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.1rem', fontWeight: 800,
                    color: trans.amount.startsWith('-') ? '#e74c3c' : '#27ae60'
                  }}>
                    {trans.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Guild Tab ────────────────────────────────────────────────────– */}
        {activeTab === 'guild' && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              ⚔ Guild Management
            </h3>
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Guild Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Guild Name
                  </label>
                  <input
                    type="text"
                    defaultValue="My Awesome Guild"
                    style={{
                      width: '100%', padding: '0.75rem', background: 'rgba(29, 20, 16, 0.6)',
                      border: '2px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px',
                      color: '#fff', fontFamily: "'Poppins', sans-serif"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Guild Leader
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.username || 'Adventurer'}
                    disabled
                    style={{
                      width: '100%', padding: '0.75rem', background: 'rgba(29, 20, 16, 0.4)',
                      border: '2px solid rgba(212, 175, 55, 0.2)', borderRadius: '6px',
                      color: '#fff', fontFamily: "'Poppins', sans-serif", opacity: 0.7
                    }}
                  />
                </div>
              </div>
              <button className="glow-btn" style={{ marginTop: '1.5rem', padding: '0.75rem 2rem' }}>
                Save Changes
              </button>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              📜 Guild Logs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { event: 'Kazuma joined the guild', time: '3 hours ago' },
                { event: 'Premium tier upgraded', time: '1 day ago' },
                { event: 'Megumin earned achievement', time: '2 days ago' },
              ].map((log, i) => (
                <div key={i} className="activity-item">
                  <span style={{ fontSize: '1.5rem' }}>📋</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {log.event}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings Tab ─────────────────────────────────────────────────– */}
        {activeTab === 'settings' && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: '1.5rem', fontFamily: 'Cinzel, serif' }}>
              ⚙️ Settings
            </h3>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Account Settings
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Email Notifications</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive updates about your guild</div>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Public Profile</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Show your stats on leaderboards</div>
                    </div>
                    <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>
              <button className="ghost-btn" style={{ width: '100%', padding: '0.9rem', marginTop: '1.5rem' }}>
                Change Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
