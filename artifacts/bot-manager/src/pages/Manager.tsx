import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminUser, PaginationInfo, DuplicateGroup, MigrationResult } from '../lib/api';

type MainTab = 'dashboard' | 'users' | 'duplicates' | 'migration' | 'actions';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }
interface Confirm { title: string; message: string; action: () => Promise<void>; }

const NAV: { id: MainTab; icon: string; label: string }[] = [
  { id: 'dashboard',  icon: '◈',  label: 'Dashboard' },
  { id: 'users',      icon: '👥', label: 'Users' },
  { id: 'duplicates', icon: '🔍', label: 'Duplicates' },
  { id: 'migration',  icon: '⚙️', label: 'Migration' },
  { id: 'actions',    icon: '⚡', label: 'Actions' },
];

export default function Manager() {
  const [tab, setTab]           = useState<MainTab>('dashboard');
  const [keyInput, setKeyInput] = useState('');
  const [authed, setAuthed]     = useState(!!localStorage.getItem('adminKey'));
  const [collapsed, setCollapsed] = useState(false);

  const [stats, setStats]               = useState<Stats>({});
  const [users, setUsers]               = useState<AdminUser[]>([]);
  const [pagination, setPagination]     = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch]             = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editMode, setEditMode]         = useState(false);
  const [editData, setEditData]         = useState<Partial<AdminUser>>({});

  const [dupGroups, setDupGroups]     = useState<DuplicateGroup[]>([]);
  const [dupLoading, setDupLoading]   = useState(false);
  const [dupScanned, setDupScanned]   = useState(false);
  const [mergingGroup, setMergingGroup] = useState<DuplicateGroup | null>(null);
  const [mergePrimary, setMergePrimary] = useState('');

  const [migResult, setMigResult]   = useState<MigrationResult | null>(null);
  const [migLoading, setMigLoading] = useState(false);

  const [actionMsg, setActionMsg] = useState('');
  const [confirm, setConfirm]     = useState<Confirm | null>(null);
  const [toast, setToast]         = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }
  function doConfirm(c: Confirm)  { setConfirm(c); }
  async function runConfirm() {
    if (!confirm) return;
    try { await confirm.action(); } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
    setConfirm(null);
  }

  function login() {
    if (!keyInput.trim()) return;
    localStorage.setItem('adminKey', keyInput.trim()); setAuthed(true);
  }
  function logout() { localStorage.removeItem('adminKey'); setAuthed(false); setKeyInput(''); }

  const loadStats = useCallback(async () => {
    if (!authed) return;
    try { setStats(await adminApi.getStats() as Stats); } catch {}
  }, [authed]);

  const loadUsers = useCallback(async (page = 1, q = search) => {
    if (!authed) return;
    setUsersLoading(true);
    try {
      const res = await adminApi.listUsers(page, 20, q);
      setUsers(res.users); setPagination(res.pagination);
    } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Failed')); }
    finally { setUsersLoading(false); }
  }, [authed, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'users') loadUsers(1, search); }, [tab]); // eslint-disable-line

  // ── LOGIN SCREEN ────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="manager-login">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {/* Real KonoSuba — Kazuma as the admin character */}
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 1rem' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.2), transparent)', animation: 'ping 2s ease-in-out infinite' }} />
            <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0,212,255,0.4)', background: 'rgba(0,0,20,0.8)', boxShadow: '0 0 30px rgba(0,212,255,0.25)' }}>
              <img
                src="https://static.wikia.nocookie.net/konosuba/images/4/4f/Kazuma_Anime.png/revision/latest?width=200"
                alt="Kazuma"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              />
            </div>
          </div>
          <h1 className="login-title">Bot Manager</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Enter your admin key to access the control panel</p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Key</label>
          <input className="m-input" type="password" placeholder="Enter your admin password..." value={keyInput}
            onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        <button className="m-btn m-btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', justifyContent: 'center' }} onClick={login}>
          Unlock Dashboard →
        </button>
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Website</a>
        </div>
      </div>
    </div>
  );

  // ── MAIN LAYOUT ─────────────────────────────────────────────────────────────
  return (
    <div className="manager-layout">

      {/* TOAST */}
      {toast && <div className="toast">{toast}</div>}

      {/* CONFIRM MODAL */}
      {confirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <h3 className="modal-title">{confirm.title}</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{confirm.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="m-btn m-btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={runConfirm}>Confirm</button>
              <button className="m-btn m-btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MERGE MODAL */}
      {mergingGroup && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">🔀 Merge Duplicate Accounts</h3>
            <div className="info-box" style={{ marginBottom: '1rem' }}>
              Select the <strong>primary account</strong> to keep. The other account's data will be merged into it and permanently deleted.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {mergingGroup.users.map(u => (
                <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: mergePrimary === u.phone ? 'rgba(0,212,255,0.08)' : 'rgba(0,0,0,0.4)', border: `1px solid ${mergePrimary === u.phone ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="radio" name="primary" value={u.phone} checked={mergePrimary === u.phone} onChange={() => setMergePrimary(u.phone)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.name}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>+{u.phone}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>{u.jid || u.lid || 'No WA ID'}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--gold)', fontWeight: 700 }}>₿ {(u.wallet + u.bank).toLocaleString()}</div>
                    <div style={{ color: 'var(--text-dim)' }}>Lv {u.level} · {u.xp} XP</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="m-btn m-btn-primary" disabled={!mergePrimary} style={{ justifyContent: 'center', flex: 1 }} onClick={async () => {
                const secondary = mergingGroup.users.find(u => u.phone !== mergePrimary);
                if (!secondary || !mergePrimary) return;
                try {
                  const r = await adminApi.mergeUsers(mergePrimary, secondary.phone);
                  if (r.success) {
                    showToast(`✅ Merged! Net worth: ₿${(r.summary.wallet as number + (r.summary.bank as number)).toLocaleString()}`);
                    setMergingGroup(null); setMergePrimary(''); setDupScanned(false); setDupGroups([]);
                  }
                } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Merge failed')); }
              }}>🔀 Merge</button>
              <button className="m-btn m-btn-ghost" style={{ justifyContent: 'center' }} onClick={() => { setMergingGroup(null); setMergePrimary(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 className="modal-title" style={{ marginBottom: 0 }}>👤 {selectedUser.name}</h3>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: 2 }}>+{selectedUser.phone}</div>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }} onClick={() => { setSelectedUser(null); setEditMode(false); }}>×</button>
            </div>

            {!editMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {([
                    ['Status', selectedUser.banned ? '🚫 Banned' : '✅ Active'],
                    ['Role', selectedUser.isAdmin ? 'Admin' : selectedUser.isMod ? 'Mod' : 'Member'],
                    ['Level', String(selectedUser.level)],
                    ['XP', String(selectedUser.xp)],
                    ['Wallet', `₿ ${selectedUser.wallet.toLocaleString()}`],
                    ['Bank', `₿ ${selectedUser.bank.toLocaleString()}`],
                    ['Net Worth', `₿ ${selectedUser.netWorth.toLocaleString()}`],
                    ['Warnings', String(selectedUser.warnings)],
                    ['Joined', selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'],
                    ['JID', selectedUser.jid || '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, fontSize: '0.85rem', wordBreak: 'break-all' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {selectedUser.inventory && selectedUser.inventory.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ color: 'var(--cyan)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.5rem' }}>INVENTORY</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {selectedUser.inventory.map((item, i) => (
                        <span key={i} className="badge badge-cyan">📦 {item.item} ×{item.qty}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="m-btn m-btn-ghost m-btn-sm" onClick={() => { setEditMode(true); setEditData({ wallet: selectedUser.wallet, bank: selectedUser.bank, bankLimit: selectedUser.bankLimit, level: selectedUser.level, xp: selectedUser.xp, name: selectedUser.name, isMod: selectedUser.isMod, isAdmin: selectedUser.isAdmin }); }}>✏️ Edit</button>
                  <button className="m-btn m-btn-ghost m-btn-sm" onClick={() => doConfirm({ title: 'Reset Cooldowns', message: `Reset all cooldowns for ${selectedUser.name}?`, action: async () => { await adminApi.resetCooldowns(selectedUser.phone); showToast('✅ Cooldowns reset'); loadUsers(pagination.page); setSelectedUser(null); } })}>⏱️ Reset CD</button>
                  {selectedUser.banned
                    ? <button className="m-btn m-btn-success m-btn-sm" onClick={() => doConfirm({ title: 'Unban User', message: `Unban ${selectedUser.name}?`, action: async () => { await adminApi.unbanUser(selectedUser.phone); showToast('✅ Unbanned'); loadUsers(pagination.page); setSelectedUser(null); } })}>✅ Unban</button>
                    : <button className="m-btn m-btn-danger m-btn-sm" onClick={() => doConfirm({ title: 'Ban User', message: `Ban ${selectedUser.name}?`, action: async () => { await adminApi.banUser(selectedUser.phone); showToast('🚫 Banned'); loadUsers(pagination.page); setSelectedUser(null); } })}>🚫 Ban</button>
                  }
                  <button className="m-btn m-btn-danger m-btn-sm" style={{ background: 'rgba(239,68,68,0.25)' }} onClick={() => doConfirm({ title: '⚠️ Delete User', message: `Permanently delete ALL data for ${selectedUser.name}? This cannot be undone.`, action: async () => { await adminApi.deleteUser(selectedUser.phone); showToast('🗑️ Deleted'); loadUsers(pagination.page); setSelectedUser(null); } })}>🗑️ Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                try { await adminApi.editUser(selectedUser.phone, editData); showToast('✅ User updated'); setEditMode(false); loadUsers(pagination.page); setSelectedUser(null); }
                catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.25rem' }}>Edit {selectedUser.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {([['Name', 'name', 'text'], ['Wallet', 'wallet', 'number'], ['Bank', 'bank', 'number'], ['Bank Limit', 'bankLimit', 'number'], ['Level', 'level', 'number'], ['XP', 'xp', 'number']] as [string, keyof AdminUser, string][]).map(([label, field, type]) => (
                    <div key={String(field)}>
                      <label style={{ color: 'var(--text-dim)', fontSize: '0.78rem', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                      <input className="m-input" type={type} value={String(editData[field] ?? '')} onChange={e => setEditData(d => ({ ...d, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[['isMod', 'Moderator'], ['isAdmin', 'Admin']].map(([f, l]) => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input type="checkbox" checked={(editData as Record<string, unknown>)[f] as boolean ?? false} onChange={e => setEditData(d => ({ ...d, [f]: e.target.checked }))} />
                      {l}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="m-btn m-btn-primary">Save Changes</button>
                  <button type="button" className="m-btn m-btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <a href="/" className="sidebar-brand">
          <div className="sidebar-logo">🤖</div>
          <span>KONOSUBA</span>
        </a>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Control Panel</div>
          {NAV.map(item => (
            <button key={item.id} className={`sidebar-item${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                <span style={{ color: 'var(--green)', fontSize: '0.73rem', fontWeight: 700 }}>SYSTEM ONLINE</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>All services operational</div>
            </div>
          )}
          <button className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '→' : '← Collapse'}
          </button>
          <button className="sidebar-toggle" style={{ marginTop: '0.5rem', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }} onClick={logout}>
            {collapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={`manager-main${collapsed ? ' collapsed' : ''}`}>
        {/* TOPBAR */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
              {NAV.find(n => n.id === tab)?.icon} {NAV.find(n => n.id === tab)?.label}
            </div>
          </div>
          <div className="topbar-right">
            <div className="status-dot">Online</div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--cyan),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🛡</div>
          </div>
        </div>

        <div className="page-content">

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div>
              <div className="page-header">
                <h1 className="page-title">Command Center</h1>
                <p className="page-subtitle">Real-time bot platform overview and analytics</p>
              </div>

              <div className="stats-row">
                {[
                  { icon: '👥', label: 'Total Users', value: stats.totalUsers?.toLocaleString() ?? '—', change: '+12%' },
                  { icon: '⚡', label: 'Active This Week', value: stats.activeUsers?.toLocaleString() ?? '—', change: '+8%' },
                  { icon: '💰', label: 'Coins Circulating', value: stats.totalCoinsInCirculation ? `${(stats.totalCoinsInCirculation / 1000).toFixed(0)}K` : '—', change: '+3%' },
                  { icon: '🤖', label: 'Active Bots', value: stats.activeBots?.toString() ?? '—', change: '0%' },
                ].map(s => (
                  <div key={s.label} className="m-stat-card">
                    <div className="m-stat-icon">{s.icon}</div>
                    <div className="m-stat-value">{s.value}</div>
                    <div className="m-stat-label">{s.label}</div>
                    <div className={`m-stat-change ${s.change.startsWith('+') ? 'pos' : 'neg'}`}>↑ {s.change} this week</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="m-panel">
                  <div className="m-panel-header">
                    <span className="m-panel-title">⚡ Quick Actions</span>
                  </div>
                  <div className="m-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { icon: '👥', label: 'Manage Users', desc: 'Search, edit, ban/unban members', action: () => setTab('users') },
                      { icon: '🔍', label: 'Find Duplicates', desc: 'Detect & merge duplicate accounts', action: () => setTab('duplicates') },
                      { icon: '⚙️', label: 'Run Migration', desc: 'Normalize identity fields', action: () => setTab('migration') },
                      { icon: '⚡', label: 'Global Actions', desc: 'Wipe economy, export data', action: () => setTab('actions') },
                    ].map(item => (
                      <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.85rem 1rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', color: 'inherit', fontFamily: 'inherit', width: '100%' }}
                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.2)'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.label}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.desc}</div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="m-panel">
                  <div className="m-panel-header">
                    <span className="m-panel-title">📋 System Info</span>
                    <button className="m-btn m-btn-ghost m-btn-sm" onClick={loadStats}>↻ Refresh</button>
                  </div>
                  <div className="m-panel-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        ['Platform', 'Konosuba Bot v2.0'],
                        ['Database', 'MongoDB Atlas'],
                        ['Runtime', 'Node.js 18+'],
                        ['Bot Framework', 'Baileys (WA-Multi)'],
                        ['Status', '🟢 All Systems Online'],
                        ['Data', `${stats.totalUsers ?? 0} registered users`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{k}</span>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {tab === 'users' && (
            <div>
              <div className="page-header">
                <h1 className="page-title">User Management</h1>
                <p className="page-subtitle">Search, edit, and manage all registered users</p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="m-input" style={{ flex: '1 1 220px', maxWidth: 380 }} type="search" placeholder="Search by name or phone..."
                  value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers(1)} />
                <button className="m-btn m-btn-primary" onClick={() => loadUsers(1)}>Search</button>
                <button className="m-btn m-btn-ghost" onClick={() => { setSearch(''); loadUsers(1, ''); }}>Clear</button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: 'auto' }}>{pagination.total} users found</span>
              </div>

              {usersLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 2s linear infinite' }}>⚙️</div>
                  <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                  Loading users...
                </div>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Phone</th>
                        <th>Balance</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found</td></tr>
                      ) : users.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--cyan),var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>⚔</div>
                              <div>
                                <div className="name-cell">{u.name}</div>
                                {(u.isAdmin || u.isMod) && <span className={`badge ${u.isAdmin ? 'badge-gold' : 'badge-purple'}`} style={{ fontSize: '0.62rem' }}>{u.isAdmin ? 'Admin' : 'Mod'}</span>}
                              </div>
                            </div>
                          </td>
                          <td><span className="phone-cell">+{u.phone}</span></td>
                          <td><span className="balance-cell">₿ {(u.wallet + u.bank).toLocaleString()}</span></td>
                          <td><span className="level-cell">Lv {u.level}</span></td>
                          <td><span className={`badge ${u.banned ? 'badge-red' : 'badge-green'}`}>{u.banned ? 'Banned' : 'Active'}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                          <td>
                            <button className="m-btn m-btn-ghost m-btn-sm" onClick={() => { setSelectedUser(u); setEditMode(false); }}>View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {pagination.pages > 1 && (
                    <div className="pagination">
                      <button className="page-btn" disabled={pagination.page <= 1} onClick={() => loadUsers(pagination.page - 1)}>‹</button>
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const p = Math.max(1, pagination.page - 2) + i;
                        if (p > pagination.pages) return null;
                        return <button key={p} className={`page-btn${p === pagination.page ? ' active' : ''}`} onClick={() => loadUsers(p)}>{p}</button>;
                      })}
                      <button className="page-btn" disabled={pagination.page >= pagination.pages} onClick={() => loadUsers(pagination.page + 1)}>›</button>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Page {pagination.page} of {pagination.pages}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ DUPLICATES ══ */}
          {tab === 'duplicates' && (
            <div>
              <div className="page-header">
                <h1 className="page-title">Duplicate Detection</h1>
                <p className="page-subtitle">Find and merge duplicate user accounts</p>
              </div>

              <div className="info-box">
                <strong>How it works:</strong> Scans all user records, extracts phone numbers from JIDs, and groups records sharing the same phone. Merging combines wallet + bank balances, best level/XP, merged inventories & achievements. The secondary account is permanently deleted.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button className="m-btn m-btn-primary" disabled={dupLoading} onClick={async () => {
                  setDupLoading(true); setDupScanned(false);
                  try {
                    const res = await adminApi.detectDuplicates();
                    setDupGroups(res.duplicates); setDupScanned(true);
                    showToast(res.totalGroups === 0 ? '✅ No duplicates found!' : `⚠️ ${res.totalGroups} duplicate group(s) found`);
                  } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Scan failed')); }
                  finally { setDupLoading(false); }
                }}>
                  {dupLoading ? '⏳ Scanning…' : '🔍 Scan for Duplicates'}
                </button>
                {dupScanned && dupGroups.length > 0 && (
                  <button className="m-btn m-btn-ghost" onClick={() => doConfirm({
                    title: '⚡ Auto-Merge All Duplicates',
                    message: `Auto-merge all ${dupGroups.length} duplicate group(s)? For each group, the oldest account will be kept as primary. This cannot be undone.`,
                    action: async () => {
                      let merged = 0, failed = 0;
                      for (const g of dupGroups) {
                        const sorted = [...g.users].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                        const primary = sorted[0];
                        for (let i = 1; i < sorted.length; i++) {
                          try { await adminApi.mergeUsers(primary.phone, sorted[i].phone); merged++; }
                          catch { failed++; }
                        }
                      }
                      showToast(`✅ Auto-merge: ${merged} merged, ${failed} failed`);
                      setDupGroups([]); setDupScanned(false);
                    },
                  })}>
                    ⚡ Auto-Merge All ({dupGroups.length})
                  </button>
                )}
              </div>

              {dupScanned && dupGroups.length === 0 && (
                <div className="success-box" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <div style={{ fontWeight: 700 }}>No duplicate accounts found</div>
                  <div style={{ fontSize: '0.85rem', marginTop: 4 }}>All user records have unique phone numbers</div>
                </div>
              )}

              {dupGroups.map(group => (
                <div key={group.phone} style={{ background: 'rgba(8,8,25,0.9)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fca5a5' }}>⚠️ {group.count} accounts for +{group.phone}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>These need to be merged into one record</div>
                    </div>
                    <button className="m-btn m-btn-primary m-btn-sm" onClick={() => { setMergingGroup(group); setMergePrimary(''); }}>🔀 Merge</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {group.users.map(u => (
                      <div key={u._id} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '0.75rem 1rem', flex: '1 1 160px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{u.jid || u.lid || 'No WA ID'}</div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.85rem' }}>₿ {(u.wallet + u.bank).toLocaleString()}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Lv {u.level}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ MIGRATION ══ */}
          {tab === 'migration' && (
            <div>
              <div className="page-header">
                <h1 className="page-title">Identity Migration</h1>
                <p className="page-subtitle">Normalize phone fields from JID identifiers</p>
              </div>

              <div className="info-box">
                <strong>What this does:</strong> Scans every user document, derives the canonical phone number from each JID (<code style={{ color: 'var(--cyan)' }}>2348012345678@s.whatsapp.net</code> → <code style={{ color: 'var(--cyan)' }}>2348012345678</code>), sets the indexed <code style={{ color: 'var(--cyan)' }}>phone</code> field if missing, and reports any conflicts. Safe to run multiple times.
              </div>

              <button className="m-btn m-btn-primary" disabled={migLoading} onClick={async () => {
                setMigLoading(true);
                try { setMigResult(await adminApi.runMigration()); showToast('✅ Migration complete'); }
                catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Failed')); }
                finally { setMigLoading(false); }
              }}>
                {migLoading ? '⏳ Running…' : '▶ Run Migration'}
              </button>

              {migResult && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div className={migResult.conflicts > 0 ? 'warning-box' : 'success-box'}>
                    <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
                      {migResult.conflicts > 0 ? '⚠️ Migration complete with conflicts' : '✅ Migration complete — no conflicts'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.6rem' }}>
                      {[['📋 Normalized', migResult.normalized], ['✅ Already Set', migResult.alreadySet], ['🔗 LID-only', migResult.lidOnly], ['⚠️ Conflicts', migResult.conflicts]].map(([label, val]) => (
                        <div key={String(label)} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.65rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--cyan)' }}>{String(val)}</div>
                          <div style={{ fontSize: '0.75rem', marginTop: 2, opacity: 0.8 }}>{String(label)}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.85rem', margin: '0.75rem 0 0' }}>{migResult.message}</p>
                  </div>

                  {migResult.conflictList.length > 0 && (
                    <div className="m-panel" style={{ marginTop: '1rem' }}>
                      <div className="m-panel-header"><span className="m-panel-title">⚠️ Conflict List</span></div>
                      <div className="m-panel-body" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {migResult.conflictList.map((c, i) => (
                            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                              Phone <span style={{ color: 'var(--cyan)' }}>+{c.phone}</span> → user A: <code style={{ color: 'var(--text-primary)' }}>{c.userA}</code> · user B: <code style={{ color: 'var(--text-primary)' }}>{c.userB}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ ACTIONS ══ */}
          {tab === 'actions' && (
            <div>
              <div className="page-header">
                <h1 className="page-title">Global Actions</h1>
                <p className="page-subtitle">Bulk operations and data management tools</p>
              </div>

              {actionMsg && <div className="success-box" style={{ marginBottom: '1.5rem' }}>{actionMsg}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 640 }}>
                {[
                  { icon: '💸', title: 'Wipe All Economy', desc: 'Reset all wallets to ₿500 and bank to ₿0. Inventories preserved.', danger: true, fn: async () => { const r = await adminApi.wipeEconomy(); setActionMsg('✅ ' + r.message); } },
                  { icon: '✨', title: 'Wipe All XP & Levels', desc: 'Reset every user XP to 0 and level to 1. Cannot be undone.', danger: true, fn: async () => { const r = await adminApi.wipeXP(); setActionMsg('✅ ' + r.message); } },
                  { icon: '🎒', title: 'Wipe All Inventories', desc: 'Clear all items from every user inventory. Cannot be undone.', danger: true, fn: async () => { const r = await adminApi.wipeInventory(); setActionMsg('✅ ' + r.message); } },
                  { icon: '📥', title: 'Export All Users (CSV)', desc: 'Download a CSV with phone, wallet, level, ban status, and join dates.', danger: false, fn: async () => { adminApi.exportUsers(); setActionMsg('✅ Download started'); } },
                ].map(item => (
                  <div key={item.title} style={{ background: 'rgba(8,8,25,0.9)', border: `1px solid ${item.danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <button className={`m-btn ${item.danger ? 'm-btn-danger' : 'm-btn-primary'}`} style={{ flexShrink: 0 }}
                      onClick={() => item.danger
                        ? doConfirm({ title: `⚠️ ${item.title}`, message: `${item.desc} This cannot be undone.`, action: item.fn })
                        : item.fn()
                      }>
                      {item.danger ? '⚠️ Run' : '▶ Run'}
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
