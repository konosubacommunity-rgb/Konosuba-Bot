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
  const [stats, setStats]       = useState<Stats>({});
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page:1, limit:20, total:0, pages:1 });
  const [search, setSearch]     = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser|null>(null);
  const [editMode, setEditMode]   = useState(false);
  const [editData, setEditData]   = useState<Partial<AdminUser>>({});
  const [actionMsg, setActionMsg] = useState('');
  const [confirm, setConfirm]     = useState<{title:string;msg:string;fn:()=>void}|null>(null);
  const [toast, setToast]         = useState('');

  function showToast(msg:string) { setToast(msg); setTimeout(()=>setToast(''),3000); }
  function doConfirm(title:string, msg:string, fn:()=>void) { setConfirm({title,msg,fn}); }

  async function tryLogin(e:React.FormEvent) {
    e.preventDefault();
    try { setAdminKey(key); await adminApi.getUsers(1,1,''); setAuthed(true); setKeyError(''); }
    catch { removeAdminKey(); setKeyError('Invalid admin key. Access denied.'); }
  }

  const loadUsers = useCallback(async (page=1) => {
    setUsersLoading(true);
    try { const data = await adminApi.getUsers(page, pagination.limit, search); setUsers(data.users); setPagination(data.pagination); }
    catch (e:unknown) { showToast('Failed: '+(e instanceof Error?e.message:'Error')); }
    finally { setUsersLoading(false); }
  }, [search, pagination.limit]);

  useEffect(() => { if(authed) api.stats().then(s=>setStats(s as Stats)).catch(()=>{}); }, [authed]);
  useEffect(() => { if(authed && tab==='users') loadUsers(1); }, [authed, tab, loadUsers]);

  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'2.5rem', maxWidth:400, width:'100%', boxShadow:'var(--shadow)' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <ShieldAlert size={34} style={{ color:'var(--gold)', margin:'0 auto 0.75rem', display:'block' }}/>
          <div style={{ fontFamily:'Cinzel,serif', fontSize:'1.3rem', fontWeight:900, color:'var(--gold)' }}>Guild Master Access</div>
          <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginTop:4 }}>Enter your admin key to continue</div>
        </div>
        <form onSubmit={tryLogin}>
          <div className="form-group">
            <label className="form-label">Admin Key</label>
            <input className="form-input" type="password" placeholder="Enter admin password" value={key} onChange={e=>setKey(e.target.value)} autoFocus/>
          </div>
          {keyError && <div className="auth-error">{keyError}</div>}
          <button type="submit" className="btn gold" style={{ width:'100%', justifyContent:'center', borderRadius:10, padding:'12px' }}>
            <ShieldAlert size={14}/> Access Control Center
          </button>
        </form>
        <div style={{ textAlign:'center', marginTop:'1.25rem' }}>
          <Link to="/" style={{ color:'var(--muted)', fontSize:'0.82rem', textDecoration:'none' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );

  const NAV = [
    {id:'overview' as AdminTab, label:'Overview',  icon:<BarChart3 size={14}/>},
    {id:'users'    as AdminTab, label:'Users',      icon:<Users size={14}/>},
    {id:'actions'  as AdminTab, label:'Actions',    icon:<Zap size={14}/>},
  ];

  return (
    <div className="admin-page">
      {toast && <div style={{ position:'fixed', top:'1.25rem', right:'1.25rem', zIndex:2000, background:'rgba(78,255,255,0.1)', border:'1px solid rgba(78,255,255,0.28)', borderRadius:10, padding:'10px 18px', color:'var(--accent)', fontSize:'0.87rem', fontWeight:600, backdropFilter:'blur(12px)', animation:'fadeIn 0.3s ease' }}>{toast}</div>}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:400 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.25rem' }}>
              <AlertTriangle size={20} color="#fcd34d"/><h3 style={{ fontFamily:'Cinzel,serif', color:'var(--text)', fontSize:'0.98rem' }}>{confirm.title}</h3>
            </div>
            <p style={{ color:'var(--muted)', fontSize:'0.87rem', marginBottom:'1.5rem', lineHeight:1.6 }}>{confirm.msg}</p>
            <div style={{ display:'flex', gap:'0.7rem', justifyContent:'flex-end' }}>
              <button className="btn sm" onClick={()=>setConfirm(null)}><X size={12}/> Cancel</button>
              <button className="btn danger sm" onClick={()=>{confirm.fn();setConfirm(null);}}><Check size={12}/> Confirm</button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="modal-overlay" onClick={()=>{setSelectedUser(null);setEditMode(false);}}>
          <div className="modal-box" style={{ maxWidth:520 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.4rem' }}>
              <div>
                <h3 style={{ fontFamily:'Cinzel,serif', color:'var(--text)', fontSize:'0.98rem' }}>{selectedUser.name}</h3>
                <div style={{ color:'var(--muted)', fontSize:'0.78rem', marginTop:2 }}>+{selectedUser.phone}</div>
              </div>
              <button style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }} onClick={()=>{setSelectedUser(null);setEditMode(false);}}><X size={18}/></button>
            </div>
            {!editMode ? (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'1.4rem' }}>
                  {([['Status',selectedUser.banned?'Banned':'Active'],['Role',selectedUser.isAdmin?'Admin':selectedUser.isMod?'Mod':'Member'],['Level',String(selectedUser.level)],['XP',String(selectedUser.xp)],['Wallet',`₿${selectedUser.wallet.toLocaleString()}`],['Bank',`₿${selectedUser.bank.toLocaleString()}`],['Net Worth',`₿${selectedUser.netWorth.toLocaleString()}`],['Warnings',String(selectedUser.warnings)]] as [string,string][]).map(([k,v])=>(
                    <div key={k} style={{ background:'rgba(0,0,0,0.3)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ color:'var(--muted)', fontSize:'0.67rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k}</div>
                      <div style={{ color:k==='Status'?(selectedUser.banned?'#fca5a5':'#22c55e'):'var(--text)', fontWeight:600, marginTop:3, fontSize:'0.83rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                  <button className="btn sm" onClick={()=>{setEditMode(true);setEditData({wallet:selectedUser.wallet,bank:selectedUser.bank,bankLimit:selectedUser.bankLimit,level:selectedUser.level,xp:selectedUser.xp,name:selectedUser.name,isMod:selectedUser.isMod,isAdmin:selectedUser.isAdmin});}}><Edit3 size={12}/> Edit</button>
                  <button className="btn sm" onClick={()=>doConfirm('Reset Cooldowns',`Reset all cooldowns for ${selectedUser.name}?`,async()=>{await adminApi.resetCooldowns(selectedUser.phone);showToast('Cooldowns reset');loadUsers(pagination.page);setSelectedUser(null);})}><RefreshCw size={12}/> Reset CD</button>
                  {selectedUser.banned
                    ? <button className="btn sm" style={{ background:'rgba(34,197,94,0.1)', borderColor:'rgba(34,197,94,0.25)', color:'#22c55e' }} onClick={()=>doConfirm('Unban',`Unban ${selectedUser.name}?`,async()=>{await adminApi.unbanUser(selectedUser.phone);showToast('Unbanned');loadUsers(pagination.page);setSelectedUser(null);})}><UserCheck size={12}/> Unban</button>
                    : <button className="btn danger sm" onClick={()=>doConfirm('Ban',`Ban ${selectedUser.name}?`,async()=>{await adminApi.banUser(selectedUser.phone);showToast('Banned');loadUsers(pagination.page);setSelectedUser(null);})}><Ban size={12}/> Ban</button>
                  }
                  <button className="btn danger sm" onClick={()=>doConfirm('Delete',`Permanently delete all data for ${selectedUser.name}?`,async()=>{await adminApi.deleteUser(selectedUser.phone);showToast('Deleted');loadUsers(pagination.page);setSelectedUser(null);})}><Trash2 size={12}/> Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={async e=>{e.preventDefault();try{await adminApi.editUser(selectedUser.phone,editData);showToast('Updated');setEditMode(false);loadUsers(pagination.page);setSelectedUser(null);}catch(e:unknown){showToast('Error: '+(e instanceof Error?e.message:'Unknown'));}}}>
                <div style={{ color:'var(--accent)', fontWeight:700, marginBottom:'0.75rem', fontSize:'0.87rem' }}>Edit {selectedUser.name}</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.65rem', marginBottom:'0.75rem' }}>
                  {(['name','wallet','bank','bankLimit','level','xp'] as const).map(field=>(
                    <div key={field}>
                      <label style={{ color:'var(--muted)', fontSize:'0.72rem', display:'block', marginBottom:3, textTransform:'capitalize' }}>{field}</label>
                      <input className="admin-input" type={field==='name'?'text':'number'} value={String(editData[field]??'')} onChange={e=>setEditData(d=>({...d,[field]:field==='name'?e.target.value:Number(e.target.value)}))}/>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'1.25rem', marginBottom:'1.25rem' }}>
                  {(['isMod','isAdmin'] as const).map(f=>(
                    <label key={f} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--muted)', cursor:'pointer', fontSize:'0.84rem' }}>
                      <input type="checkbox" checked={editData[f]??false} onChange={e=>setEditData(d=>({...d,[f]:e.target.checked}))}/>{f==='isMod'?'Moderator':'Admin'}
                    </label>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'0.65rem' }}>
                  <button type="submit" className="btn primary sm"><Check size={12}/> Save</button>
                  <button type="button" className="btn sm" onClick={()=>setEditMode(false)}><X size={12}/> Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">⚔ KONOSUBA<div style={{ fontSize:'0.6rem', color:'var(--muted)', fontFamily:'Poppins,sans-serif', WebkitTextFillColor:'var(--muted)', marginTop:2 }}>Guild Master Panel</div></div>
        <nav className="admin-nav">
          {NAV.map(n=><button key={n.id} className={`admin-nav-item${tab===n.id?' active':''}`} onClick={()=>setTab(n.id)}>{n.icon}{n.label}</button>)}
          <div style={{ height:1, background:'var(--border)', margin:'8px 10px' }}/>
          <Link to="/dashboard" style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, color:'var(--muted)', fontSize:'0.85rem', textDecoration:'none', transition:'0.2s' }}><BarChart3 size={14}/> Dashboard</Link>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:8, color:'var(--muted)', fontSize:'0.85rem', textDecoration:'none' }}><ChevronLeft size={14}/> Home</Link>
        </nav>
        <div style={{ padding:'10px', borderTop:'1px solid var(--border)' }}>
          <button className="admin-nav-item" style={{ color:'#fca5a5', width:'100%' }} onClick={()=>{removeAdminKey();setAuthed(false);setKey('');}}>
            <LogOut size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div style={{ fontFamily:'Cinzel,serif', fontWeight:700, fontSize:'0.92rem' }}>{NAV.find(n=>n.id===tab)?.label}</div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.18)', borderRadius:20, padding:'4px 12px', fontSize:'0.72rem', fontWeight:700, color:'#22c55e' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e' }}/>ONLINE
            </div>
          </div>
        </div>

        <div className="admin-content">
          {/* OVERVIEW */}
          {tab==='overview' && (
            <div>
              <h2 className="section-header" style={{ marginBottom:'1.5rem' }}>Command <span className="accent">Center</span></h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
                {[{label:'Total Users',value:stats.totalUsers?.toLocaleString()??'—',color:'var(--accent)',icon:<Users size={16}/>},{label:'Active / Week',value:stats.activeUsers?.toLocaleString()??'—',color:'#22c55e',icon:<BarChart3 size={16}/>},{label:'Coins Circ.',value:stats.totalCoinsInCirculation?`${Math.round(stats.totalCoinsInCirculation/1000)}K`:'—',color:'var(--gold)',icon:<Zap size={16}/>},{label:'Active Bots',value:stats.activeBots?.toString()??'—',color:'#a78bfa',icon:<ShieldAlert size={16}/>}].map(s=>(
                  <div key={s.label} className="admin-stat-card">
                    <div style={{ color:s.color, marginBottom:8 }}>{s.icon}</div>
                    <div className="admin-stat-value" style={{ color:s.color }}>{s.value}</div>
                    <div className="admin-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' }}>
                <h3 style={{ color:'var(--accent)', fontFamily:'Cinzel,serif', fontSize:'0.9rem', marginBottom:'1rem' }}>Quick Actions</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.7rem' }}>
                  {[{label:'Manage Users',desc:'Search, edit, ban/unban members',action:()=>setTab('users'),color:'var(--accent)'},{label:'Global Actions',desc:'Wipe economy, export data',action:()=>setTab('actions'),color:'var(--gold)'}].map(item=>(
                    <button key={item.label} onClick={item.action} style={{ display:'flex', flexDirection:'column', gap:4, background:'rgba(0,0,0,0.28)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', cursor:'pointer', textAlign:'left', color:'inherit', fontFamily:'inherit', width:'100%', transition:'all 0.2s' }}>
                      <div style={{ fontWeight:700, fontSize:'0.88rem', color:item.color }}>{item.label}</div>
                      <div style={{ color:'var(--muted)', fontSize:'0.78rem' }}>{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab==='users' && (
            <div>
              <h2 className="section-header" style={{ marginBottom:'1.5rem' }}>User <span className="accent">Management</span></h2>
              <div style={{ display:'flex', gap:'0.65rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200, position:'relative' }}>
                  <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                  <input className="admin-input" placeholder="Search by name or phone..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:'2.1rem' }} onKeyDown={e=>e.key==='Enter'&&loadUsers(1)}/>
                </div>
                <button className="btn primary sm" onClick={()=>loadUsers(1)}><Search size={13}/> Search</button>
                <button className="btn sm" onClick={()=>{setSearch('');loadUsers(1);}}><RefreshCw size={13}/> Reset</button>
              </div>
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table className="admin-table">
                    <thead><tr><th>User</th><th>Phone</th><th>Wallet</th><th>Level</th><th>Status</th><th>Role</th><th>Actions</th></tr></thead>
                    <tbody>
                      {usersLoading ? <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--muted)' }}>Loading...</td></tr>
                       : users.length===0 ? <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--muted)' }}>No users found</td></tr>
                       : users.map(u=>(
                        <tr key={u._id}>
                          <td style={{ fontWeight:600 }}>{u.name}</td>
                          <td style={{ color:'var(--muted)', fontFamily:'monospace', fontSize:'0.79rem' }}>+{u.phone}</td>
                          <td style={{ color:'var(--gold)' }}>₿{u.wallet.toLocaleString()}</td>
                          <td>{u.level}</td>
                          <td><span className={u.banned?'badge-banned':'badge-active'}>{u.banned?'Banned':'Active'}</span></td>
                          <td>{u.isAdmin&&<span className="badge-admin">Admin</span>}{u.isMod&&!u.isAdmin&&<span className="badge-mod">Mod</span>}</td>
                          <td><button className="btn sm" onClick={()=>{setSelectedUser(u);setEditMode(false);}}><Edit3 size={11}/> View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages>1 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
                    <div style={{ color:'var(--muted)', fontSize:'0.77rem' }}>{pagination.total} users · Page {pagination.page} of {pagination.pages}</div>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <button className="btn sm" disabled={pagination.page<=1} onClick={()=>loadUsers(pagination.page-1)} style={{ padding:'5px 10px' }}><ChevronLeft size={13}/></button>
                      <button className="btn sm" disabled={pagination.page>=pagination.pages} onClick={()=>loadUsers(pagination.page+1)} style={{ padding:'5px 10px' }}><ChevronRight size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ACTIONS */}
          {tab==='actions' && (
            <div>
              <h2 className="section-header" style={{ marginBottom:'1.5rem' }}>Global <span className="accent">Actions</span></h2>
              {actionMsg && <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.22)', borderRadius:10, padding:'10px 14px', color:'#22c55e', fontSize:'0.85rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:8 }}><Check size={13}/>{actionMsg}</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', maxWidth:640 }}>
                {[{label:'Wipe All Economy',desc:'Reset all wallets to ₿500 and bank to ₿0.',danger:true,fn:async()=>{const r=await adminApi.wipeEconomy();setActionMsg(r.message);}},{label:'Wipe All XP & Levels',desc:'Reset every user XP to 0 and level to 1.',danger:true,fn:async()=>{const r=await adminApi.wipeXP();setActionMsg(r.message);}},{label:'Wipe All Inventories',desc:'Clear all items from every user inventory.',danger:true,fn:async()=>{const r=await adminApi.wipeInventory();setActionMsg(r.message);}},{label:'Export Users (CSV)',desc:'Download a CSV with phone, wallet, level, ban status.',danger:false,fn:async()=>{adminApi.exportUsers();setActionMsg('Download started');}}].map(item=>(
                  <div key={item.label} style={{ background:'var(--card)', border:`1px solid ${item.danger?'rgba(239,68,68,0.15)':'var(--border)'}`, borderRadius:14, padding:'16px 20px', display:'flex', gap:'1rem', alignItems:'center' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{item.label}</div>
                      <div style={{ color:'var(--muted)', fontSize:'0.79rem', marginTop:3 }}>{item.desc}</div>
                    </div>
                    <button className={`btn sm${item.danger?' danger':''}`} onClick={()=>item.danger?doConfirm(item.label,`${item.desc} This cannot be undone.`,item.fn):item.fn()}>
                      {item.danger?<><AlertTriangle size={12}/> Run</>:<><Download size={12}/> Export</>}
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
