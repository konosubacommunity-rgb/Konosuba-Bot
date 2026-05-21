import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Stats {
  totalUsers?: number;
  activeUsers?: number;
  totalCoinsInCirculation?: number;
  activeBots?: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    api.stats().then(s => setStats(s as Stats)).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#fff', fontFamily: 'sans-serif' }}>
      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚔️ KONOSUBA
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/auth" style={{ padding: '0.5rem 1.2rem', background: 'rgba(167,139,250,0.15)', border: '1px solid #a78bfa', borderRadius: 8, color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
            Login
          </Link>
          <Link to="/auth?mode=register" style={{ padding: '0.5rem 1.2rem', background: 'linear-gradient(90deg, #a78bfa, #f472b6)', borderRadius: 8, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
            Join
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '6rem 2rem 4rem' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>⚔️</div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 900, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #f472b6, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Konosuba Community
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#c4b5fd', marginTop: '1rem', maxWidth: 600, margin: '1rem auto 0' }}>
          Your ultimate WhatsApp RPG adventure. Earn coins, level up, battle monsters, and rise through the ranks.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
          <Link to="/auth?mode=register" style={{ padding: '0.9rem 2.2rem', background: 'linear-gradient(90deg, #a78bfa, #f472b6)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
            Start Adventure →
          </Link>
          <Link to="/auth" style={{ padding: '0.9rem 2.2rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
            Login
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Adventurers', value: stats.totalUsers?.toLocaleString() ?? '—', icon: '👥' },
          { label: 'Active This Week',  value: stats.activeUsers?.toLocaleString() ?? '—', icon: '⚡' },
          { label: 'Coins in Circulation', value: stats.totalCoinsInCirculation ? `${(stats.totalCoinsInCirculation / 1000).toFixed(0)}K` : '—', icon: '💰' },
          { label: 'Active Bots',       value: stats.activeBots?.toString() ?? '—', icon: '🤖' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '1.5rem 2rem', textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: '2rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa' }}>{s.value}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', padding: '3rem 2rem', flexWrap: 'wrap' }}>
        {[
          { icon: '💸', title: 'Economy',         desc: 'Earn coins, deposit to bank, trade with others' },
          { icon: '⚔️', title: 'RPG Battles',     desc: 'Fight monsters, level up, unlock abilities' },
          { icon: '🏆', title: 'Leaderboard',     desc: 'Compete globally and claim the top rank' },
          { icon: '🐾', title: 'Pets & Pokémon',  desc: 'Catch, train, and battle companions' },
          { icon: '🎰', title: 'Gambling',         desc: 'Slots, blackjack, coin flip, and more' },
          { icon: '🎯', title: 'Quests',           desc: 'Complete missions and earn rewards' },
        ].map(f => (
          <div key={f.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', width: 200, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>{f.icon}</div>
            <div style={{ fontWeight: 700, marginTop: '0.5rem' }}>{f.title}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '2rem' }}>
        © 2025 Konosuba Community Bot
      </div>
    </div>
  );
}
