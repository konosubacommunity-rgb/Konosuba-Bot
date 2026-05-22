import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { adminApi, getAdminKey, setAdminKey, removeAdminKey, api, AdminUser, Pagination } from '../lib/api';
import { Users, BarChart3, Zap, LogOut, ShieldAlert, Search, ChevronLeft, ChevronRight, RefreshCw, Download, Trash2, Ban, UserCheck, Edit3, X, Check, AlertTriangle } from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'actions';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }

export default function Admin() {
  const [key, setKey]           = useState(getAdminKey() || '');
  const [authed, setAuthed]     = useState(!!getAdminKey());
  const [keyError, setKeyError] = useState('');
  const [tab, setTab]           = useState<AdminTab>('overview');

  const [stats, setStats]                 = useState<Stats>({});
  const [users, setUsers]                 = useState<AdminUser[]>([]);
  const [pagination, setPagination]       = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch]               = useState('');
  const [usersLoading, setUsersLoading]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState<AdminUser | null>(null);
  const [editMode, setEditMode]           = useState(false);
  const [editData, setEditData]           = useState<Partial<AdminUser>>({});
  const [actionMsg, setActionMsg]         = useState('');
  const [confirm, setConfirm]             = useState<{ title: string; msg: string; fn: () => void } | null>(null);
  const [toast, setToast]                 = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function doConfirm(title: string, msg: string, fn: () => void) { setConfirm({ title, msg, fn }); }

  async function tryLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminApi.getUsers(1, 1, '');
      setAdminKey(key); setAuthed(true); setKeyError('');
    } catch {
      setKeyError('Invalid admin key. Access denied.');
    }
  }

  const loadUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const data = await adminApi.getUsers(page, pagination.limit, search);
      setUsers(data.users); setPagination(data.pagination);
    } catch (e: unknown) { showToast('Failed to load users: ' + (e instanceof Error ? e.message : 'Error')); }
    finally { setUsersLoading(false); }
  }, [search, pagination.limit]);

  useEffect(() => {
    if (!authed) return;
    api.stats().then(s => setStats(s as Stats)).catch(() => {});
  }, [authed]);

  useEffect(() => {
    if (authed && tab === 'users') loadUsers(1);
  }, [authed, tab, loadUsers]);

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,215,0,0.05), transparent)' }} />
      {['⚔', '✦', '◈', '⬡', '✧'].map((r, i) => (
        <div key={i} className="rune" style={{ left: `${10 + i * 20}%`, top: `${20 + (i % 2) * 55}%`, animationDelay: `${i * 1.2}s` }}>{r}</div>
      ))}
      <div className="glass-card" style={{ padding: '2.5rem', maxWidth: 400, width: '100%', margin: '1rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldAlert size={36} style={{ color: 'var(--gold)', margin: '0 auto 0.75rem', display: 'block' }} />
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--gold), #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Guild Master Access</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 0.4 }}>Enter your admin key to continue</div>
        </div>
        <form onSubmit={tryLogin}>
          <div className="form-group">
            <label className="form-label">Admin Key</label>
            <input className="form-input" type="password" placeholder="Enter admin password" value={key} onChange={e => setKey(e.target.value)} autoFocus />
          </div>
          {keyError && <div className="auth-error">{keyError}</div>}
          <button type="submit" className="gold-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
            <ShieldAlert size={15}/> Access Control Center
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );

  const NAV = [
    { id: 'overview' as AdminTab, label: 'Overview',    icon: <BarChart3 size={15}/> },
    { id: 'users'    as AdminTab, label: 'Users',       icon: <Users size={15}/> },
    { id: 'actions'  as AdminTab, label: 'Actions',     icon: <Zap size={15}/> },
  ];

  return (
    <div className="admin-page">
      {/* Toast */}
      {toast && <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000, background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, padding: '0.75rem 1.25rem', color: 'var(--cyan)', fontSize: '0.88rem', fontWeight: 600, backdropFilter: 'blur(12px)', animation: 'fadeIn 0.3s ease' }}>{toast}</div>}

      {/* Confirm modal */}
      {confirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <AlertTriangle size={22} color="#fcd34d" />
              <h3 style={{ fontFamily: 'Cinzel, serif', color: '#fff', fontSize: '1rem' }}>{confirm.title}</h3>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.65 }}>{confirm.msg}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="admin-btn admin-btn-ghost" onClick={() => setConfirm(null)}><X size={14}/> Cancel</button>
              <button className="admin-btn admin-btn-danger" onClick={() => { confirm.fn(); setConfirm(null); }}><Check size={14}/> Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* User detail modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => { setSelectedUser(null); setEditMode(false); }}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Cinzel, serif', color: '#fff', fontSize: '1rem' }}>{selectedUser.name}</h3>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 2 }}>+{selectedUser.phone}</div>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => { setSelectedUser(null); setEditMode(false); }}><X size={20}/></button>
            </div>
            {!editMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', marginBottom: '1.4rem' }}>
                  {([
                    ['Status',    selectedUser.banned ? 'Banned' : 'Active'],
                    ['Role',      selectedUser.isAdmin ? 'Admin' : selectedUser.isMod ? 'Mod' : 'Member'],
                    ['Level',     String(selectedUser.level)],
                    ['XP',        String(selectedUser.xp)],
                    ['Wallet',    `₿ ${selectedUser.wallet.toLocaleString()}`],
                    ['Bank',      `₿ ${selectedUser.bank.toLocaleString()}`],
                    ['Net Worth', `₿ ${selectedUser.netWorth.toLocaleString()}`],
                    ['Warnings',  String(selectedUser.warnings)],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.38)', borderRadius: 8, padding: '0.62rem 0.85rem' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                      <div style={{ color: k === 'Status' ? (selectedUser.banned ? '#fca5a5' : '#22c55e') : 'var(--text-primary)', fontWeight: 600, marginTop: 2, fontSize: '0.84rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="admin-btn admin-btn-ghost" onClick={() => { setEditMode(true); setEditData({ wallet: selectedUser.wallet, bank: selectedUser.bank, bankLimit: selectedUser.bankLimit, level: selectedUser.level, xp: selectedUser.xp, name: selectedUser.name, isMod: selectedUser.isMod, isAdmin: selectedUser.isAdmin }); }}><Edit3 size={13}/> Edit</button>
                  <button className="admin-btn admin-btn-ghost" onClick={() => doConfirm('Reset Cooldowns', `Reset all cooldowns for ${selectedUser.name}?`, async () => { await adminApi.resetCooldowns(selectedUser.phone); showToast('Cooldowns reset'); loadUsers(pagination.page); setSelectedUser(null); })}><RefreshCw size={13}/> Reset CD</button>
                  {selectedUser.banned
                    ? <button className="admin-btn" style={{ background: 'rgba(34,197,94,0.18)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }} onClick={() => doConfirm('Unban User', `Unban ${selectedUser.name}?`, async () => { await adminApi.unbanUser(selectedUser.phone); showToast('Unbanned'); loadUsers(pagination.page); setSelectedUser(null); })}><UserCheck size={13}/> Unban</button>
                    : <button className="admin-btn admin-btn-danger" onClick={() => doConfirm('Ban User', `Ban ${selectedUser.name}?`, async () => { await adminApi.banUser(selectedUser.phone); showToast('Banned'); loadUsers(pagination.page); setSelectedUser(null); })}><Ban size={13}/> Ban</button>
                  }
                  <button className="admin-btn admin-btn-danger" onClick={() => doConfirm('Delete User', `Permanently delete ALL data for ${selectedUser.name}?`, async () => { await adminApi.deleteUser(selectedUser.phone); showToast('Deleted'); loadUsers(pagination.page); setSelectedUser(null); })}><Trash2 size={13}/> Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                try { await adminApi.editUser(selectedUser.phone, editData); showToast('Updated'); setEditMode(false); loadUsers(pagination.page); setSelectedUser(null); }
                catch (e: unknown) { showToast('Error: ' + (e instanceof Error ? e.message : 'Unknown')); }
              }}>
                <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.88rem' }}>Edit {selectedUser.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '0.75rem' }}>
                  {(['name', 'wallet', 'bank', 'bankLimit', 'level', 'xp'] as const).map(field => (
                    <div key={field}>
                      <label style={{ color: 'var(--text-dim)', fontSize: '0.72rem', display: 'block', marginBottom: 3, textTransform: 'capitalize' }}>{field}</label>
                      <input className="admin-input" type={field === 'name' ? 'text' : 'number'} value={String(editData[field] ?? '')} onChange={e => setEditData(d => ({ ...d, [field]: field === 'name' ? e.target.value : Number(e.target.value) }))} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  {(['isMod', 'isAdmin'] as const).map(f => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={editData[f] ?? false} onChange={e => setEditData(d => ({ ...d, [f]: e.target.checked }))} />{f === 'isMod' ? 'Moderator' : 'Admin'}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="admin-btn admin-btn-primary"><Check size={13}/> Save</button>
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditMode(false)}><X size={13}/> Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">⚔ KONOSUBA<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'Poppins, sans-serif', WebkitTextFillColor: 'var(--text-muted)', marginTop: 2 }}>Guild Master Panel</div></div>
        <nav className="admin-nav">
          {NAV.map(n => <button key={n.id} className={`admin-nav-item${tab === n.id ? ' active' : ''}`} onClick={() => setTab(n.id)}>{n.icon}{n.label}</button>)}
          <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.75rem 0.85rem' }} />
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.62rem 0.85rem', borderRadius: 9, color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}>
            <BarChart3 size={15}/> Dashboard
          </Link>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.62rem 0.85rem', borderRadius: 9, color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}>
            <ChevronLeft size={15}/> Home
          </Link>
        </nav>
        <div style={{ padding: '0.75rem 0.85rem', borderTop: '1px solid var(--glass-border)' }}>
          <button className="admin-nav-item" style={{ color: '#fca5a5', width: '100%' }} onClick={() => { removeAdminKey(); setAuthed(false); setKey(''); }}>
            <LogOut size={15}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {NAV.find(n => n.id === tab)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: '0.28rem 0.75rem', fontSize: '0.73rem', fontWeight: 700, color: '#22c55e' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />ONLINE
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
              <ShieldAlert size={16} color="#000" />
            </div>
          </div>
        </div>

        <div className="admin-content">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.35rem' }}>Command Center</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Real-time platform overview and analytics</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { label: 'Total Users',    value: stats.totalUsers?.toLocaleString() ?? '—',       color: 'var(--cyan)',   icon: <Users size={18}/> },
                  { label: 'Active/Week',    value: stats.activeUsers?.toLocaleString() ?? '—',      color: '#22c55e',       icon: <BarChart3 size={18}/> },
                  { label: 'Coins in Circ.', value: stats.totalCoinsInCirculation ? `${Math.round(stats.totalCoinsInCirculation / 1000)}K` : '—', color: 'var(--gold)', icon: <Zap size={18}/> },
                  { label: 'Active Bots',    value: stats.activeBots?.toString() ?? '—',             color: 'var(--purple)', icon: <ShieldAlert size={18}/> },
                ].map(s => (
                  <div key={s.label} className="admin-stat-card">
                    <div style={{ color: s.color, marginBottom: '0.75rem' }}>{s.icon}</div>
                    <div className="admin-stat-value" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}88)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                    <div className="admin-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ color: 'var(--cyan)', fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '0.92rem', marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Manage Users',   desc: 'Search, edit, ban/unban members', action: () => setTab('users'),   color: 'var(--cyan)' },
                    { label: 'Global Actions', desc: 'Wipe economy, export data',        action: () => setTab('actions'), color: 'var(--gold)' },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '1rem', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', width: '100%', transition: 'all 0.2s' }}
                      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${item.color}28`; }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: item.color }}>{item.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.35rem' }}>User Management</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Search, view, and manage all platform users</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="admin-input" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.2rem' }} onKeyDown={e => e.key === 'Enter' && loadUsers(1)} />
                </div>
                <button className="admin-btn admin-btn-primary" onClick={() => loadUsers(1)}><Search size={14}/> Search</button>
                <button className="admin-btn admin-btn-ghost" onClick={() => { setSearch(''); loadUsers(1); }}><RefreshCw size={14}/> Reset</button>
              </div>
              <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th><th>Phone</th><th>Wallet</th><th>Level</th><th>Status</th><th>Role</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading users...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found</td></tr>
                      ) : users.map(u => (
                        <tr key={u._id}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: '0.8rem' }}>+{u.phone}</td>
                          <td style={{ color: 'var(--gold)' }}>₿{u.wallet.toLocaleString()}</td>
                          <td>{u.level}</td>
                          <td><span className={u.banned ? 'badge-banned' : 'badge-active'}>{u.banned ? 'Banned' : 'Active'}</span></td>
                          <td>
                            {u.isAdmin && <span className="badge-admin">Admin</span>}
                            {u.isMod && !u.isAdmin && <span className="badge-mod">Mod</span>}
                          </td>
                          <td>
                            <button className="admin-btn admin-btn-ghost" style={{ padding: '0.28rem 0.65rem', fontSize: '0.75rem' }} onClick={() => { setSelectedUser(u); setEditMode(false); }}>
                              <Edit3 size={12}/> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {pagination.total} users · Page {pagination.page} of {pagination.pages}
                    </div>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button className="admin-btn admin-btn-ghost" disabled={pagination.page <= 1} onClick={() => loadUsers(pagination.page - 1)} style={{ padding: '0.38rem 0.65rem' }}><ChevronLeft size={14}/></button>
                      <button className="admin-btn admin-btn-ghost" disabled={pagination.page >= pagination.pages} onClick={() => loadUsers(pagination.page + 1)} style={{ padding: '0.38rem 0.65rem' }}><ChevronRight size={14}/></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          {tab === 'actions' && (
            <div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '1.6rem', marginBottom: '0.35rem' }}>Global Actions</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Bulk operations and data management tools</p>
              {actionMsg && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '0.85rem 1rem', color: '#22c55e', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Check size={14}/>{actionMsg}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxWidth: 640 }}>
                {[
                  { label: 'Wipe All Economy',    desc: 'Reset all wallets to ₿500 and bank to ₿0.',              danger: true,  fn: async () => { const r = await adminApi.wipeEconomy(); setActionMsg(r.message); } },
                  { label: 'Wipe All XP & Levels', desc: 'Reset every user XP to 0 and level to 1.',             danger: true,  fn: async () => { const r = await adminApi.wipeXP(); setActionMsg(r.message); } },
                  { label: 'Wipe All Inventories', desc: 'Clear all items from every user inventory.',           danger: true,  fn: async () => { const r = await adminApi.wipeInventory(); setActionMsg(r.message); } },
                  { label: 'Export Users (CSV)',   desc: 'Download a CSV with phone, wallet, level, ban status.', danger: false, fn: async () => { adminApi.exportUsers(); setActionMsg('Download started'); } },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(8,8,22,0.9)', border: `1px solid ${item.danger ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 14, padding: '1.2rem 1.4rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <button
                      className={`admin-btn ${item.danger ? 'admin-btn-danger' : 'admin-btn-gold'}`}
                      onClick={() => item.danger ? doConfirm(`${item.label}`, `${item.desc} This cannot be undone.`, item.fn) : item.fn()}>
                      {item.danger ? <><AlertTriangle size={13}/> Run</> : <><Download size={13}/> Export</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
