import { useState, useEffect, useCallback } from 'react';
import { adminApi, AdminUser, PaginationInfo, DuplicateGroup, MigrationResult } from '../lib/api';

type MainTab = 'dashboard' | 'users' | 'duplicates' | 'migration' | 'actions';

interface Stats { totalUsers?: number; activeUsers?: number; totalCoinsInCirculation?: number; activeBots?: number; }
interface Confirm { title: string; message: string; action: () => Promise<void>; }

export default function Manager() {
  const [tab, setTab]         = useState<MainTab>('dashboard');
  const [keyInput, setKeyInput] = useState('');
  const [authed, setAuthed]   = useState(!!localStorage.getItem('adminKey'));

  // ── Stats
  const [stats, setStats] = useState<Stats>({});

  // ── Users
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch]       = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState<Partial<AdminUser>>({});

  // ── Duplicates
  const [dupGroups, setDupGroups]   = useState<DuplicateGroup[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupScanned, setDupScanned] = useState(false);
  const [mergingGroup, setMergingGroup] = useState<DuplicateGroup | null>(null);
  const [mergePrimary, setMergePrimary] = useState('');

  // ── Migration
  const [migResult, setMigResult]   = useState<MigrationResult | null>(null);
  const [migLoading, setMigLoading] = useState(false);

  // ── Actions
  const [actionMsg, setActionMsg] = useState('');

  // ── UI
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast]     = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }
  function doConfirm(c: Confirm) { setConfirm(c); }

  async function runConfirm() {
    if (!confirm) return;
    try { await confirm.action(); } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
    setConfirm(null);
  }

  function login() {
    if (!keyInput.trim()) return;
    localStorage.setItem('adminKey', keyInput.trim());
    setAuthed(true);
  }

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
  useEffect(() => { if (tab === 'users') loadUsers(1, search); }, [tab]);

  if (!authed) return (
    <div style={s.page}>
      <div style={s.loginBox}>
        <div style={{ fontSize: '3rem', textAlign: 'center' }}>🤖</div>
        <h1 style={{ ...s.title, textAlign: 'center', fontSize: '1.4rem' }}>Bot Manager Admin</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>Enter your admin key to continue</p>
        <input style={s.input} type="password" placeholder="Admin password / key" value={keyInput}
          onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        <button style={s.primaryBtn} onClick={login}>Unlock →</button>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '0.75rem 1.25rem', color: '#fff', zIndex: 9999, maxWidth: 320 }}>
          {toast}
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '92%' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>{confirm.title}</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{confirm.message}</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button style={{ ...s.dangerBtn, flex: 1 }} onClick={runConfirm}>Confirm</button>
              <button style={{ ...s.secondaryBtn, flex: 1 }} onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MERGE DIALOG */}
      {mergingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9997 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: '2rem', maxWidth: 540, width: '95%' }}>
            <h3 style={{ color: '#fff', margin: '0 0 1rem' }}>🔀 Merge Duplicate Accounts</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 0, marginBottom: '1.5rem' }}>
              Select the <strong style={{ color: '#a78bfa' }}>primary account</strong> to keep. The other account's balances,
              inventory, XP, achievements, and cooldowns will be merged into it. The secondary account will be permanently deleted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {mergingGroup.users.map(u => (
                <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: mergePrimary === u.phone ? 'rgba(167,139,250,0.1)' : '#1e293b', border: `1px solid ${mergePrimary === u.phone ? '#a78bfa' : '#334155'}`, borderRadius: 12, padding: '1rem', cursor: 'pointer' }}>
                  <input type="radio" name="primary" value={u.phone} checked={mergePrimary === u.phone} onChange={() => setMergePrimary(u.phone)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{u.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>+{u.phone}</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                      {u.jid ? `JID: ${u.jid}` : u.lid ? `LID: ${u.lid}` : 'No WA ID'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                    <div style={{ color: '#a78bfa', fontWeight: 700 }}>₿ {(u.wallet + u.bank).toLocaleString()}</div>
                    <div style={{ color: '#64748b' }}>Lv {u.level} · {u.xp} XP</div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={s.primaryBtn} disabled={!mergePrimary} onClick={async () => {
                const secondary = mergingGroup.users.find(u => u.phone !== mergePrimary);
                if (!secondary || !mergePrimary) return;
                try {
                  const r = await adminApi.mergeUsers(mergePrimary, secondary.phone);
                  if (r.success) {
                    showToast(`✅ Merged! Net worth: ₿${(r.summary.wallet as number + (r.summary.bank as number)).toLocaleString()}`);
                    setMergingGroup(null); setMergePrimary('');
                    setDupScanned(false); setDupGroups([]);
                  }
                } catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Merge failed')); }
              }}>
                🔀 Merge →
              </button>
              <button style={s.secondaryBtn} onClick={() => { setMergingGroup(null); setMergePrimary(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL DRAWER */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9990 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: '2rem', maxWidth: 560, width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#fff', margin: 0 }}>👤 {selectedUser.name}</h2>
              <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => { setSelectedUser(null); setEditMode(false); }}>×</button>
            </div>

            {!editMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {([
                    ['📱 Phone',    `+${selectedUser.phone}`],
                    ['🎭 Status',   selectedUser.banned ? '🚫 Banned' : '✅ Active'],
                    ['🛡️ Role',    selectedUser.isAdmin ? 'Admin' : selectedUser.isMod ? 'Mod' : 'Member'],
                    ['⭐ Level',    String(selectedUser.level)],
                    ['✨ XP',       String(selectedUser.xp)],
                    ['💰 Wallet',   `₿ ${selectedUser.wallet.toLocaleString()}`],
                    ['🏦 Bank',     `₿ ${selectedUser.bank.toLocaleString()}`],
                    ['💎 Net Worth',`₿ ${selectedUser.netWorth.toLocaleString()}`],
                    ['⚠️ Warnings', String(selectedUser.warnings)],
                    ['📅 Joined',   selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Unknown'],
                    ['🔗 JID',      selectedUser.jid || '—'],
                    ['🔗 LID',      selectedUser.lid || '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem' }}>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{k}</div>
                      <div style={{ color: '#fff', fontWeight: 600, marginTop: 2, fontSize: '0.85rem', wordBreak: 'break-all' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {selectedUser.inventory && selectedUser.inventory.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: 8 }}>🎒 Inventory</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedUser.inventory.map((item, i) => (
                        <span key={i} style={{ background: '#1e293b', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.8rem', color: '#e2e8f0' }}>
                          📦 {item.item} ×{item.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button style={s.primaryBtn} onClick={() => { setEditMode(true); setEditData({ wallet: selectedUser.wallet, bank: selectedUser.bank, bankLimit: selectedUser.bankLimit, level: selectedUser.level, xp: selectedUser.xp, name: selectedUser.name, isMod: selectedUser.isMod, isAdmin: selectedUser.isAdmin }); }}>✏️ Edit</button>
                  <button style={s.secondaryBtn} onClick={() => doConfirm({ title: 'Reset Cooldowns', message: `Reset all cooldowns for ${selectedUser.name}?`, action: async () => { await adminApi.resetCooldowns(selectedUser.phone); showToast('✅ Cooldowns reset'); loadUsers(pagination.page); setSelectedUser(null); } })}>⏱️ Reset CD</button>
                  {selectedUser.banned
                    ? <button style={s.successBtn} onClick={() => doConfirm({ title: 'Unban User', message: `Unban ${selectedUser.name}?`, action: async () => { await adminApi.unbanUser(selectedUser.phone); showToast('✅ Unbanned'); loadUsers(pagination.page); setSelectedUser(null); } })}>✅ Unban</button>
                    : <button style={s.dangerBtn}  onClick={() => doConfirm({ title: 'Ban User',   message: `Ban ${selectedUser.name}?`,   action: async () => { await adminApi.banUser(selectedUser.phone);   showToast('🚫 Banned');   loadUsers(pagination.page); setSelectedUser(null); } })}>🚫 Ban</button>
                  }
                  <button style={{ ...s.dangerBtn, background: 'rgba(239,68,68,0.3)' }} onClick={() => doConfirm({ title: '⚠️ Delete User', message: `Permanently delete ALL data for ${selectedUser.name}? This cannot be undone.`, action: async () => { await adminApi.deleteUser(selectedUser.phone); showToast('🗑️ Deleted'); loadUsers(pagination.page); setSelectedUser(null); } })}>🗑️ Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={async e => {
                e.preventDefault();
                try { await adminApi.editUser(selectedUser.phone, editData); showToast('✅ User updated'); setEditMode(false); loadUsers(pagination.page); setSelectedUser(null); }
                catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Error')); }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ color: '#a78bfa', margin: 0 }}>✏️ Edit {selectedUser.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {([['Name', 'name', 'text'], ['Wallet', 'wallet', 'number'], ['Bank', 'bank', 'number'], ['Bank Limit', 'bankLimit', 'number'], ['Level', 'level', 'number'], ['XP', 'xp', 'number']] as [string, keyof AdminUser, string][]).map(([label, field, type]) => (
                    <div key={field}>
                      <label style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input style={{ ...s.input, margin: 0 }} type={type} value={String(editData[field] ?? '')} onChange={e => setEditData(d => ({ ...d, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {[['isMod', 'Mod'], ['isAdmin', 'Admin']].map(([f, l]) => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(editData as Record<string, unknown>)[f] as boolean ?? false} onChange={e => setEditData(d => ({ ...d, [f]: e.target.checked }))} />
                      {l}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" style={s.primaryBtn}>Save</button>
                  <button type="button" style={s.secondaryBtn} onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* LAYOUT */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* SIDEBAR */}
        <aside style={{ width: 230, background: '#0f172a', borderRight: '1px solid #1e293b', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, background: 'linear-gradient(90deg,#a78bfa,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 Bot Manager</div>
            <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: 2 }}>Admin Panel</div>
          </div>
          {([
            { id: 'dashboard',  label: '📊 Dashboard'  },
            { id: 'users',      label: '👥 Users'       },
            { id: 'duplicates', label: '🔍 Duplicates'  },
            { id: 'migration',  label: '⚙️ Migration'   },
            { id: 'actions',    label: '⚡ Actions'     },
          ] as { id: MainTab; label: string }[]).map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ textAlign: 'left', padding: '0.65rem 1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s',
                background: tab === item.id ? 'rgba(167,139,250,0.15)' : 'transparent',
                color:      tab === item.id ? '#a78bfa' : '#64748b',
                borderLeft: tab === item.id ? '2px solid #a78bfa' : '2px solid transparent',
              }}>
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
            <button style={{ ...s.secondaryBtn, width: '100%', fontSize: '0.8rem' }} onClick={() => { localStorage.removeItem('adminKey'); setAuthed(false); }}>🔒 Logout</button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden' }}>

          {/* ══ DASHBOARD ══ */}
          {tab === 'dashboard' && (
            <div>
              <h2 style={s.pageTitle}>📊 Dashboard</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { icon: '👥', label: 'Total Users',    value: stats.totalUsers?.toLocaleString() ?? '—' },
                  { icon: '⚡', label: 'Active (7d)',     value: stats.activeUsers?.toLocaleString() ?? '—' },
                  { icon: '💰', label: 'Coins (Total)',   value: stats.totalCoinsInCirculation ? `${(stats.totalCoinsInCirculation / 1000).toFixed(0)}K` : '—' },
                  { icon: '🤖', label: 'Active Bots',    value: stats.activeBots?.toString() ?? '—' },
                ].map(stat => (
                  <div key={stat.label} style={s.statCard}>
                    <div style={{ fontSize: '2rem' }}>{stat.icon}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', marginTop: 4 }}>{stat.value}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              <button style={s.primaryBtn} onClick={loadStats}>🔄 Refresh</button>
            </div>
          )}

          {/* ══ USERS ══ */}
          {tab === 'users' && (
            <div>
              <h2 style={s.pageTitle}>👥 User Management</h2>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input style={{ ...s.input, flex: 1, minWidth: 200, margin: 0 }} placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers(1, search)} />
                <button style={s.primaryBtn}     onClick={() => loadUsers(1, search)}>🔍 Search</button>
                <button style={s.secondaryBtn}   onClick={() => { setSearch(''); loadUsers(1, ''); }}>✕ Clear</button>
                <button style={s.secondaryBtn}   onClick={() => adminApi.exportUsers()}>📥 Export CSV</button>
              </div>

              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 80px 100px', gap: '0.5rem', padding: '0.75rem 1rem', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>
                  <span>NAME</span><span>PHONE</span><span>WALLET</span><span>LEVEL</span><span>STATUS</span><span>ROLE</span><span>ACTIONS</span>
                </div>
                {usersLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading…</div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No users found</div>
                ) : users.map(u => (
                  <div key={u._id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 80px 100px', gap: '0.5rem', padding: '0.75rem 1rem', borderTop: '1px solid #1e293b', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{u.name}</span>
                    <span style={{ color: '#94a3b8' }}>+{u.phone}</span>
                    <span style={{ color: '#a78bfa' }}>₿ {u.wallet.toLocaleString()}</span>
                    <span style={{ color: '#94a3b8' }}>Lv {u.level}</span>
                    <span>{u.banned ? <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem' }}>Banned</span> : <span style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', borderRadius: 6, padding: '2px 8px', fontSize: '0.75rem' }}>Active</span>}</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.isAdmin ? '👑 Admin' : u.isMod ? '🛡️ Mod' : 'Member'}</span>
                    <button style={{ ...s.secondaryBtn, padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => setSelectedUser(u)}>View →</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                <span>{pagination.total} total · Page {pagination.page}/{pagination.pages}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={s.secondaryBtn} disabled={pagination.page <= 1} onClick={() => loadUsers(pagination.page - 1, search)}>← Prev</button>
                  <button style={s.secondaryBtn} disabled={pagination.page >= pagination.pages} onClick={() => loadUsers(pagination.page + 1, search)}>Next →</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ DUPLICATES ══ */}
          {tab === 'duplicates' && (
            <div>
              <h2 style={s.pageTitle}>🔍 Duplicate Detection & Merge</h2>
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: '#c4b5fd', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
                  <strong>How it works:</strong> Scans all user records, extracts the phone number from each JID, and groups records that share the same phone number. Duplicates happen when Baileys returns a different identifier (JID vs LID) for the same user, creating two separate MongoDB documents.
                </p>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                  Merging combines: wallet + bank balances, best level/XP, merged inventories &amp; achievements, earlier join date, highest role, and most lenient cooldowns. The secondary account is permanently deleted.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button style={s.primaryBtn} disabled={dupLoading} onClick={async () => {
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
                  <button style={s.secondaryBtn} onClick={() => doConfirm({
                    title: '⚡ Auto-Merge All Duplicates',
                    message: `Auto-merge all ${dupGroups.length} duplicate group(s)? For each group, the oldest account (earliest createdAt) will be kept as primary. This cannot be undone.`,
                    action: async () => {
                      let merged = 0; let failed = 0;
                      for (const g of dupGroups) {
                        const sorted = [...g.users].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                        const primary = sorted[0];
                        for (let i = 1; i < sorted.length; i++) {
                          try { await adminApi.mergeUsers(primary.phone, sorted[i].phone); merged++; }
                          catch { failed++; }
                        }
                      }
                      showToast(`✅ Auto-merge done: ${merged} merged, ${failed} failed`);
                      setDupGroups([]); setDupScanned(false);
                    },
                  })}>
                    ⚡ Auto-Merge All ({dupGroups.length})
                  </button>
                )}
              </div>

              {dupScanned && dupGroups.length === 0 && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: '2rem', textAlign: 'center', color: '#4ade80' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                  <div style={{ fontWeight: 700 }}>No duplicate accounts found</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>All user records have unique phone numbers</div>
                </div>
              )}

              {dupGroups.map(group => (
                <div key={group.phone} style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fca5a5' }}>⚠️ {group.count} accounts for +{group.phone}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>These need to be merged into one record</div>
                    </div>
                    <button style={s.primaryBtn} onClick={() => { setMergingGroup(group); setMergePrimary(''); }}>
                      🔀 Merge
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {group.users.map(u => (
                      <div key={u._id} style={{ background: '#1e293b', borderRadius: 12, padding: '0.75rem 1rem', flex: '1 1 180px' }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{u.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.jid || u.lid || 'No WA ID'}</div>
                        <div style={{ marginTop: 6, fontSize: '0.85rem' }}>
                          <span style={{ color: '#a78bfa' }}>₿ {(u.wallet + u.bank).toLocaleString()}</span>
                          <span style={{ color: '#64748b' }}> · Lv {u.level}</span>
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: 2 }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</div>
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
              <h2 style={s.pageTitle}>⚙️ Identity Migration</h2>
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: '#c4b5fd', margin: '0 0 0.5rem', fontWeight: 700 }}>What this does:</p>
                <ul style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Scans every user document in MongoDB</li>
                  <li>Derives the canonical phone number from each JID (<code style={{ color: '#a78bfa' }}>2348012345678@s.whatsapp.net</code> → <code style={{ color: '#a78bfa' }}>2348012345678</code>)</li>
                  <li>Sets the indexed <code style={{ color: '#a78bfa' }}>phone</code> field if it's missing</li>
                  <li>Reports any conflicts (same phone number on two records) so you can merge them</li>
                  <li>LID-only users are skipped — their phone can't be derived from the LID alone</li>
                </ul>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.75rem', marginBottom: 0 }}>
                  ✅ Safe to run multiple times — already-migrated records are skipped.
                  Run this once after deploying, then use the Duplicates tab to resolve any conflicts.
                </p>
              </div>

              <button style={s.primaryBtn} disabled={migLoading} onClick={async () => {
                setMigLoading(true);
                try { setMigResult(await adminApi.runMigration()); showToast('✅ Migration complete'); }
                catch (e: unknown) { showToast('❌ ' + (e instanceof Error ? e.message : 'Failed')); }
                finally { setMigLoading(false); }
              }}>
                {migLoading ? '⏳ Running…' : '▶ Run Migration'}
              </button>

              {migResult && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ background: migResult.conflicts > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${migResult.conflicts > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: migResult.conflicts > 0 ? '#fca5a5' : '#4ade80', marginBottom: '0.75rem' }}>
                      {migResult.conflicts > 0 ? '⚠️ Migration complete with conflicts' : '✅ Migration complete — no conflicts'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                      {[
                        ['📋 Normalized', migResult.normalized],
                        ['✅ Already Set', migResult.alreadySet],
                        ['🔗 LID-only',    migResult.lidOnly],
                        ['⚠️ Conflicts',   migResult.conflicts],
                      ].map(([label, val]) => (
                        <div key={label as string} style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>{String(val)}</div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>{label as string}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '1rem 0 0' }}>{migResult.message}</p>
                  </div>

                  {migResult.conflictList.length > 0 && (
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '1.25rem' }}>
                      <div style={{ color: '#fca5a5', fontWeight: 700, marginBottom: '0.75rem' }}>Conflict List — go to Duplicates tab to merge these</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                        {migResult.conflictList.map((c, i) => (
                          <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                            Phone <span style={{ color: '#a78bfa' }}>+{c.phone}</span> → user A: <code>{c.userA}</code> · user B: <code>{c.userB}</code>
                          </div>
                        ))}
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
              <h2 style={s.pageTitle}>⚡ Global Actions</h2>
              {actionMsg && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '0.75rem 1rem', color: '#4ade80', marginBottom: '1.5rem' }}>
                  {actionMsg}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 580 }}>
                {[
                  { icon: '💸', title: 'Wipe All Economy',    desc: 'Reset all wallets to ₿500 and bank to ₿0. Inventories preserved.', danger: true,  fn: async () => { const r = await adminApi.wipeEconomy();   setActionMsg('✅ ' + r.message); } },
                  { icon: '✨', title: 'Wipe All XP & Levels',desc: 'Reset every user XP to 0 and level to 1.',                         danger: true,  fn: async () => { const r = await adminApi.wipeXP();        setActionMsg('✅ ' + r.message); } },
                  { icon: '🎒', title: 'Wipe All Inventories', desc: 'Clear all items from every user inventory.',                       danger: true,  fn: async () => { const r = await adminApi.wipeInventory(); setActionMsg('✅ ' + r.message); } },
                  { icon: '📥', title: 'Export All Users (CSV)',desc: 'Download a CSV with phone, wallet, level, ban status, dates.',    danger: false, fn: async () => { adminApi.exportUsers(); setActionMsg('✅ Download started'); } },
                ].map(item => (
                  <div key={item.title} style={{ background: '#0f172a', border: `1px solid ${item.danger ? 'rgba(239,68,68,0.25)' : '#1e293b'}`, borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{item.title}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <button style={item.danger ? s.dangerBtn : s.primaryBtn}
                      onClick={() => item.danger ? doConfirm({ title: `⚠️ ${item.title}`, message: `${item.desc} This cannot be undone.`, action: item.fn }) : item.fn()}>
                      {item.danger ? '⚠️ Run' : '▶ Run'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:       { minHeight: '100vh', background: '#020817', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' },
  loginBox:   { display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 380, margin: '10vh auto 0' },
  title:      { color: '#fff', fontWeight: 800, fontSize: '1.6rem', margin: 0 },
  pageTitle:  { color: '#fff', fontWeight: 800, fontSize: '1.4rem', margin: '0 0 1.5rem' },
  input:      { width: '100%', padding: '0.7rem 1rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' },
  primaryBtn: { padding: '0.65rem 1.3rem', background: 'linear-gradient(90deg,#a78bfa,#f472b6)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  secondaryBtn:{ padding: '0.65rem 1.3rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' },
  dangerBtn:  { padding: '0.65rem 1.3rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, color: '#fca5a5', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  successBtn: { padding: '0.65rem 1.3rem', background: 'rgba(34,197,94,0.2)',  border: '1px solid rgba(34,197,94,0.4)',  borderRadius: 10, color: '#4ade80',  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  statCard:   { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '1.25rem', textAlign: 'center' as const },
};
