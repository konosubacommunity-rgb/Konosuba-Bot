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
  const [tab, setTab]               = useState<Tab>('overview');
  const [profile, setProfile]       = useState<Record<string, unknown> | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [inventory, setInventory]   = useState<{ item: string; qty: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const phone = currentUser?.phone as string | undefined;

  const loadData = useCallback(async () => {
    if (!phone) { setLoading(false); setError('Could not determine phone. Please log out and back in.'); return; }
    try {
      const [p, a, inv, lb] = await Promise.all([api.profile(phone), api.activity(phone), api.inventory(phone), api.leaderboard()]);
      setProfile(p as Record<string, unknown>);
      setActivities(a as ActivityItem[]);
      setInventory(inv as { item: string; qty: number }[]);
      setLeaderboard(lb as LeaderboardEntry[]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load data'); }
    finally { setLoading(false); }
  }, [phone]);

  useEffect(() => {
    if (!getToken() || !currentUser) { navigate('/auth'); return; }
    loadData();
  }, [loadData, currentUser, navigate]);

  function logout() { removeToken(); navigate('/auth'); }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
      <div style={{ width:42, height:42, border:'3px solid rgba(78,255,255,0.2)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ color:'var(--accent)', fontFamily:'Cinzel,serif', fontSize:'0.88rem' }}>Loading your adventure...</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
      <ShieldAlert size={32} color="#fca5a5"/>
      <div style={{ color:'#fca5a5' }}>{error}</div>
      <button onClick={logout} className="btn">Logout</button>
    </div>
  );

  const p        = profile || {};
  const netWorth = (p.netWorth as number) ?? (p.totalBalance as number) ?? 0;
  const xpPct    = Math.min(100, (Number(p.xp||0) / (Number(p.level||1) * 100)) * 100);
  const userChar = charForLevel(Number(p.level||1));

  const TABS: {id:Tab; label:string; icon:React.ReactNode}[] = [
    { id:'overview',    label:'Overview',    icon:<LayoutDashboard size={13}/> },
    { id:'activity',    label:'Activity',    icon:<Activity size={13}/> },
    { id:'inventory',   label:'Inventory',   icon:<Package size={13}/> },
    { id:'leaderboard', label:'Leaderboard', icon:<Trophy size={13}/> },
  ];

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh' }}>
      {/* Navbar */}
      <nav className="dashboard-nav">
        <Link to="/" className="nav-logo" style={{ textDecoration:'none' }}>⚔ KONOSUBA</Link>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.55rem' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', border:`2px solid ${userChar.color}40`, flexShrink:0 }}>
              <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ width:'100%', height:'100%', borderRadius:'50%' }} initial={userChar.name.charAt(0)} />
            </div>
            <span style={{ color:'var(--accent)', fontWeight:600, fontSize:'0.87rem' }}>{String(p.name||phone||'Adventurer')}</span>
          </div>
          {(p.isAdmin || p.isMod) && (
            <Link to="/admin" style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'5px 12px', background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:7, color:'var(--gold)', fontSize:'0.75rem', fontWeight:700, textDecoration:'none' }}>
              <ShieldAlert size={11}/> Admin
            </Link>
          )}
          <button onClick={logout} className="btn sm" style={{ color:'#fca5a5', borderColor:'rgba(239,68,68,0.2)' }}>
            <LogOut size={11} style={{ display:'inline', marginRight:3 }}/>Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-body">
        {/* Profile hero */}
        <div className="profile-hero">
          <div style={{ position:'absolute', right:0, bottom:0, height:'120%', opacity:0.07, pointerEvents:'none', display:'flex', alignItems:'flex-end' }}>
            <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ height:'100%', width:'auto', borderRadius:0, filter:`drop-shadow(0 0 30px ${userChar.color}80)` }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.4rem', position:'relative', zIndex:1 }}>
            <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', border:`3px solid ${userChar.color}50`, background:'rgba(0,0,0,0.6)', flexShrink:0 }}>
              <CharAvatar src={userChar.img} alt={userChar.name} color={userChar.color} style={{ width:'100%', height:'100%', borderRadius:'50%' }} initial={userChar.name.charAt(0)} />
            </div>
            <div style={{ flex:1 }}>
              <h1 style={{ fontSize:'1.35rem', fontWeight:800, fontFamily:'Cinzel,serif' }}>{String(p.name||phone||'Adventurer')}</h1>
              <div style={{ color:userChar.color, fontSize:'0.82rem', marginTop:2 }}>Level {String(p.level||1)} · {userChar.name} class</div>
              <div style={{ color:'var(--muted)', fontSize:'0.74rem', marginTop:1 }}>+{phone}</div>
            </div>
            <div>
              {p.isAdmin && <span className="badge-admin">Admin</span>}
              {p.isMod && !p.isAdmin && <span className="badge-mod">Mod</span>}
            </div>
          </div>
          <div style={{ marginBottom:'1.4rem', position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.74rem', color:'var(--muted)', marginBottom:5 }}>
              <span>XP Progress</span><span>{Number(p.xp||0)} / {Number(p.level||1)*100}</span>
            </div>
            <div className="xp-bar"><div className="xp-fill" style={{ width:`${xpPct}%` }}/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))', gap:'0.6rem', position:'relative', zIndex:1 }}>
            {[['Wallet',`₿${Number(p.wallet||0).toLocaleString()}`],['Bank',`₿${Number(p.bank||0).toLocaleString()}`],['Net Worth',`₿${netWorth.toLocaleString()}`],['Level',String(p.level||1)],['XP',String(p.xp||0)],['Rank',`#${p.rank||'?'}`]].map(([k,v])=>(
              <div key={k} className="mini-stat"><div className="mini-stat-value">{v}</div><div className="mini-stat-label">{k}</div></div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="db-tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`db-tab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem' }}>{t.icon}{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab==='overview' && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' }}>
            <h3 style={{ color:'var(--accent)', fontFamily:'Cinzel,serif', fontSize:'0.92rem', marginBottom:'1rem', fontWeight:700 }}>Account Overview</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))', gap:'0.6rem' }}>
              {([['Phone',`+${phone}`],['Status',p.banned?'Banned':'Active'],['Role',p.isAdmin?'Admin':p.isMod?'Moderator':'Member'],['Joined',p.joinedAt?new Date(p.joinedAt as string).toLocaleDateString():'Unknown'],['Bank Limit',`₿${Number(p.bankLimit||10000).toLocaleString()}`],['Warnings',String(p.warnings||0)]] as [string,string][]).map(([k,v])=>(
                <div key={k} style={{ background:'rgba(0,0,0,0.28)', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ color:'var(--muted)', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k}</div>
                  <div style={{ fontWeight:600, marginTop:4, fontSize:'0.88rem', color:k==='Status'?(p.banned?'#fca5a5':'#22c55e'):'var(--text)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='activity' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
            {activities.length===0 ? (
              <div style={{ textAlign:'center', padding:'4rem', color:'var(--muted)' }}>
                <Activity size={38} style={{ margin:'0 auto 0.75rem', opacity:0.25, display:'block' }}/>
                No activity recorded yet.
              </div>
            ) : activities.map((a,i)=>(
              <div key={a._id||i} className="activity-item">
                <div style={{ fontSize:'1.3rem', flexShrink:0 }}>{a.icon||'📌'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{a.title||'Activity'}</div>
                  <div style={{ color:'var(--muted)', fontSize:'0.79rem', marginTop:2 }}>{a.description||'No description'}</div>
                  <div style={{ color:'var(--muted)', fontSize:'0.7rem', marginTop:3, opacity:0.7 }}>{a.createdAt?new Date(a.createdAt).toLocaleString():''}</div>
                </div>
                {a.type && <span style={{ background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:6, padding:'2px 8px', fontSize:'0.7rem', color:'#a78bfa', alignSelf:'flex-start' }}>{a.type}</span>}
              </div>
            ))}
          </div>
        )}

        {tab==='inventory' && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' }}>
            <h3 style={{ color:'var(--accent)', fontFamily:'Cinzel,serif', fontSize:'0.92rem', marginBottom:'1rem', fontWeight:700, display:'flex', alignItems:'center', gap:'0.45rem' }}><Package size={14}/>Item Inventory</h3>
            {inventory.length===0 ? (
              <div style={{ textAlign:'center', padding:'3rem', color:'var(--muted)' }}><Package size={36} style={{ margin:'0 auto 0.75rem', opacity:0.2, display:'block' }}/>Your inventory is empty.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:'0.7rem' }}>
                {inventory.map((item,i)=>(
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                    <Package size={22} style={{ margin:'0 auto 6px', color:'var(--accent)', display:'block' }}/>
                    <div style={{ fontWeight:600, fontSize:'0.8rem' }}>{item.item}</div>
                    <div style={{ color:'var(--accent)', fontSize:'0.75rem', marginTop:2 }}>×{item.qty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==='leaderboard' && (
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' }}>
            <h3 style={{ color:'var(--gold)', fontFamily:'Cinzel,serif', fontSize:'0.92rem', marginBottom:'1rem', fontWeight:700, display:'flex', alignItems:'center', gap:'0.45rem' }}><Trophy size={14}/>Global Leaderboard</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
              {leaderboard.slice(0,20).map((u,i)=>{
                const worth  = u.netWorth ?? u.totalBalance ?? 0;
                const medal  = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${u.rank}`;
                const isMe   = u.phone===phone;
                const lbChar = charForIndex(i);
                return (
                  <div key={i} className={`lb-row${isMe?' is-me':''}`}>
                    <div style={{ width:36, textAlign:'center', fontWeight:700, fontSize:'0.87rem', flexShrink:0 }}>{medal}</div>
                    <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', border:`2px solid ${isMe?lbChar.color:'var(--border)'}40`, background:'rgba(0,0,0,0.5)', flexShrink:0 }}>
                      <CharAvatar src={lbChar.img} alt={lbChar.name} color={lbChar.color} style={{ width:'100%', height:'100%', borderRadius:'50%' }} initial={lbChar.name.charAt(0)}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:'0.87rem', color:isMe?'var(--accent)':'var(--text)' }}>{u.name}{isMe?' (You)':''}</div>
                      <div style={{ color:'var(--muted)', fontSize:'0.72rem' }}>Level {u.level}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700, color:'var(--gold)', fontSize:'0.87rem' }}>₿{worth.toLocaleString()}</div>
                      <div style={{ color:'var(--muted)', fontSize:'0.7rem' }}>net worth</div>
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
