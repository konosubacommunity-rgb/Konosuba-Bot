import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Wallet, Zap, Star, Trophy, Fish, Pickaxe, TrendingUp, LogOut, RefreshCw, Users, Swords, Sparkles, Activity, Loader2 } from "lucide-react";
import { getToken, getCurrentUser, clearSession, apiGetUser, apiGetActivities, apiGetLeaderboard, formatMoney, formatTime } from "@/lib/api";

interface UserData {
  username?: string;
  name?: string;
  phone?: string;
  country?: string;
  level?: number;
  xp?: number;
  xpNeeded?: number;
  wallet?: number;
  bank?: number;
  totalBalance?: number;
  health?: number;
  maxHealth?: number;
  wins?: number;
  losses?: number;
  streak?: number;
  dailyStreak?: number;
  lastDaily?: string;
  class?: string;
  rank?: number;
  joinedDate?: string;
  pokemon?: unknown[];
  stats?: {
    fishCaught?: number;
    itemsDug?: number;
    monstersKilled?: number;
    pokemonCaught?: number;
    timesGambled?: number;
    totalGambleWon?: number;
  };
}

interface ActivityItem {
  _id?: string;
  type?: string;
  description?: string;
  desc?: string;
  title?: string;
  amount?: number;
  createdAt?: string;
  timestamp?: string;
}

interface LeaderUser {
  username?: string;
  phone?: string;
  totalBalance?: number;
  netWorth?: number;
  wallet?: number;
  bank?: number;
  level?: number;
  rank?: number;
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: "1.2rem", display: "flex", flexDirection: "column", gap: ".5rem", transition: "all .2s", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 18px 0 80px", background: `${color}0a`, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <span style={{ fontSize: ".68rem", color: "#37474f", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#eceff1" }}>{value}</div>
      {sub && <div style={{ fontSize: ".72rem", color: "#455a64" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const token = getToken();
  // Use a ref so getCurrentUser() result is stable and doesn't cause
  // infinite re-renders via useCallback dependency changes
  const currentUserRef = useRef(getCurrentUser());
  const currentUser = currentUserRef.current;

  useEffect(() => {
    if (!token || !currentUser) {
      setLocation("/auth");
    }
  }, [token, currentUser, setLocation]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!currentUser?.phone) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [userData, actData, lbData] = await Promise.allSettled([
        apiGetUser(currentUser.phone),
        apiGetActivities(currentUser.phone),
        apiGetLeaderboard(),
      ]);
      if (userData.status === "fulfilled" && userData.value) {
        // API returns flat user object (not wrapped in { user: ... })
        setUser(userData.value.user ?? userData.value);
      }
      if (actData.status === "fulfilled") {
        setActivities(actData.value?.activities || []);
      }
      if (lbData.status === "fulfilled") {
        setLeaderboard(lbData.value?.users || lbData.value?.leaderboard || []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable: currentUser comes from ref

  useEffect(() => {
    if (currentUser) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  function handleLogout() {
    clearSession();
    setLocation("/auth");
  }

  const CHAR_IMGS: Record<string, string> = {
    "mage":       "https://cdn.myanimelist.net/images/characters/14/349249.jpg",
    "wizard":     "https://cdn.myanimelist.net/images/characters/14/349249.jpg",
    "cleric":     "https://cdn.myanimelist.net/images/characters/14/282523.jpg",
    "priest":     "https://cdn.myanimelist.net/images/characters/14/282523.jpg",
    "knight":     "https://cdn.myanimelist.net/images/characters/14/266229.jpg",
    "crusader":   "https://cdn.myanimelist.net/images/characters/14/266229.jpg",
    "rogue":      "https://cdn.myanimelist.net/images/characters/8/301302.jpg",
    "adventurer": "https://cdn.myanimelist.net/images/characters/8/301302.jpg",
  };
  const classImg = CHAR_IMGS[(user?.class || "").toLowerCase()] || "https://cdn.myanimelist.net/images/characters/8/301302.jpg";

  const hp      = user?.health ?? 100;
  const maxHp   = user?.maxHealth ?? 100;
  const xp      = user?.xp ?? 0;
  const xpNeeded = user?.xpNeeded ?? ((user?.level || 1) * 100);
  const xpPct   = Math.min(100, Math.round((xp / Math.max(xpNeeded, 1)) * 100));
  const hpPct   = Math.min(100, Math.round((hp / Math.max(maxHp, 1)) * 100));
  const dailyStreak = user?.dailyStreak ?? user?.streak ?? 0;
  const totalBalance = user?.totalBalance ?? ((user?.wallet || 0) + (user?.bank || 0));

  const ACTIVITY_ICONS: Record<string, string> = {
    daily: "🎁", fish: "🎣", dig: "⛏️", gamble: "🎰", battle: "⚔️",
    pokemon: "🐾", deposit: "🏦", withdraw: "💸", transfer: "📤",
    levelup: "⬆️", item: "📦", guild: "🏰", default: "⚡"
  };
  function getActIcon(type = "") {
    for (const [k, v] of Object.entries(ACTIVITY_ICONS)) {
      if (type.toLowerCase().includes(k)) return v;
    }
    return ACTIVITY_ICONS.default;
  }

  // Normalize activity fields — API may return desc/timestamp OR description/createdAt
  function getActDesc(a: ActivityItem) {
    return a.description || a.desc || a.title || a.type || "Activity";
  }
  function getActTime(a: ActivityItem) {
    const ts = a.createdAt || (a as { timestamp?: string }).timestamp;
    return ts ? formatTime(ts) : "";
  }

  // Leaderboard total balance field normalisation
  function lbBalance(u: LeaderUser) {
    return u.totalBalance ?? u.netWorth ?? ((u.wallet || 0) + (u.bank || 0));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080812", fontFamily: "'Poppins', sans-serif", color: "#eceff1" }}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .db-nav { display:flex; align-items:center; justify-content:space-between; padding:.85rem 1.5rem; background:rgba(8,8,18,.92); backdrop-filter:blur(24px); border-bottom:1px solid rgba(79,195,247,.1); position:sticky; top:0; z-index:100; gap:.7rem; flex-wrap:wrap; }
        .db-logo { display:flex; align-items:center; gap:.6rem; flex-shrink:0; }
        .db-logo-img { width:36px; height:36px; border-radius:9px; object-fit:cover; border:2px solid rgba(79,195,247,.4); flex-shrink:0; }
        .db-logo-name { font-size:1rem; font-weight:900; color:#fff; }
        .db-logo-sub { font-size:.58rem; color:#4fc3f7; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
        .db-user-chip { display:flex; align-items:center; gap:.5rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:50px; padding:.35rem .75rem .35rem .45rem; flex-shrink:0; }
        .db-user-avatar { width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(79,195,247,.35); flex-shrink:0; }
        .db-user-name { font-size:.78rem; font-weight:600; color:#eceff1; white-space:nowrap; }
        .db-user-lv { font-size:.62rem; color:#4fc3f7; font-weight:700; }
        .nav-actions { display:flex; gap:.6rem; align-items:center; }
        .icon-btn { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:#607d8b; padding:.42rem; border-radius:9px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; min-width:36px; min-height:36px; }
        .icon-btn:hover { color:#4fc3f7; border-color:rgba(79,195,247,.28); background:rgba(79,195,247,.06); }
        .db-inner { max-width:1200px; margin:0 auto; padding:1.8rem 1.5rem; }
        .welcome-banner { background:linear-gradient(135deg,rgba(79,195,247,.07),rgba(255,213,79,.04)); border:1px solid rgba(79,195,247,.12); border-radius:22px; padding:1.5rem 1.5rem; display:flex; align-items:center; gap:1.4rem; margin-bottom:1.8rem; overflow:hidden; position:relative; flex-wrap:wrap; }
        .welcome-char { width:72px; height:72px; border-radius:50%; object-fit:cover; object-position:top; border:3px solid rgba(79,195,247,.4); box-shadow:0 6px 22px rgba(79,195,247,.22); flex-shrink:0; }
        .welcome-text h2 { font-size:clamp(1.1rem,3vw,1.35rem); font-weight:800; color:#fff; margin-bottom:.2rem; }
        .welcome-text p { color:#455a64; font-size:.82rem; line-height:1.55; }
        .stat-badge { display:inline-flex; align-items:center; gap:.35rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:9px; padding:.28rem .7rem; font-size:.7rem; margin-top:.5rem; color:#78909c; }
        .stat-badge strong { color:#ffd54f; }
        .progress-row { display:flex; flex-direction:column; gap:.3rem; margin-top:.8rem; flex:1; min-width:160px; }
        .progress-label { display:flex; justify-content:space-between; font-size:.68rem; color:#455a64; }
        .progress-bar { height:7px; border-radius:50px; background:rgba(255,255,255,.06); overflow:hidden; }
        .progress-fill { height:100%; border-radius:50px; transition:width .8s ease; }
        .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:.8rem; margin-bottom:1.8rem; }
        .section-title { font-size:1.05rem; font-weight:800; color:#eceff1; margin-bottom:.9rem; display:flex; align-items:center; gap:.45rem; }
        .section-title svg { color:#4fc3f7; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.8rem; }
        .panel { background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); border-radius:20px; padding:1.3rem; }
        .activity-item { display:flex; align-items:flex-start; gap:.75rem; padding:.7rem 0; border-bottom:1px solid rgba(255,255,255,.04); }
        .activity-item:last-child { border-bottom:none; }
        .act-icon { width:32px; height:32px; border-radius:9px; background:rgba(79,195,247,.08); display:flex; align-items:center; justify-content:center; font-size:.95rem; flex-shrink:0; }
        .act-text { flex:1; min-width:0; }
        .act-desc { font-size:.8rem; color:#90a4ae; line-height:1.45; word-break:break-word; }
        .act-time { font-size:.65rem; color:#37474f; margin-top:.1rem; }
        .act-amount { font-size:.75rem; font-weight:700; flex-shrink:0; }
        .lb-item { display:flex; align-items:center; gap:.75rem; padding:.6rem 0; border-bottom:1px solid rgba(255,255,255,.04); }
        .lb-item:last-child { border-bottom:none; }
        .lb-rank { width:26px; height:26px; border-radius:8px; background:rgba(255,255,255,.05); font-size:.72rem; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#607d8b; }
        .lb-rank.top1 { background:linear-gradient(135deg,#ffd54f,#ffb300); color:#000; }
        .lb-rank.top2 { background:linear-gradient(135deg,#cfd8dc,#90a4ae); color:#000; }
        .lb-rank.top3 { background:linear-gradient(135deg,#ffb74d,#f57c00); color:#000; }
        .lb-name { flex:1; font-size:.82rem; font-weight:600; color:#90a4ae; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .lb-val { font-size:.75rem; font-weight:700; color:#ffd54f; flex-shrink:0; }
        .stats-list { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; }
        .stats-item { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05); border-radius:11px; padding:.65rem .8rem; display:flex; gap:.5rem; align-items:center; }
        .stats-item-icon { font-size:1rem; }
        .stats-item-val { font-size:.85rem; font-weight:700; color:#eceff1; }
        .stats-item-lbl { font-size:.63rem; color:#455a64; }
        .empty-state { text-align:center; padding:2rem 1rem; color:#37474f; font-size:.82rem; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .loading-center { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; gap:.8rem; color:#455a64; font-size:.9rem; }
        @media (max-width:700px) { .two-col { grid-template-columns:1fr; } .cards-grid { grid-template-columns:repeat(2,1fr); } .db-user-name { display:none; } .welcome-banner { flex-direction:column; align-items:flex-start; } .db-inner { padding:1.2rem 1rem; } .db-nav { padding:.75rem 1rem; } }
        @media (max-width:380px) { .cards-grid { grid-template-columns:repeat(2,1fr); } .stats-list { grid-template-columns:1fr; } }
      `}</style>

      <nav className="db-nav">
        <div className="db-logo">
          <img className="db-logo-img" src="https://cdn.myanimelist.net/images/characters/14/282523.jpg" alt="Aqua" />
          <div>
            <div className="db-logo-name">Konosuba</div>
            <div className="db-logo-sub">Dashboard</div>
          </div>
        </div>
        <div className="nav-actions">
          {user && (
            <div className="db-user-chip">
              <img className="db-user-avatar" src={classImg} alt={user.username} />
              <div>
                <div className="db-user-name">{user.username || user.name || currentUser?.username || "Adventurer"}</div>
                <div className="db-user-lv">Lv.{user.level || 1}</div>
              </div>
            </div>
          )}
          <button className="icon-btn" onClick={() => loadData(true)} disabled={refreshing} title="Refresh" aria-label="Refresh">
            <RefreshCw size={15} style={refreshing ? { animation: "spin .7s linear infinite" } : {}} />
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out" style={{ color: "#ef5350" }}>
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      <div className="db-inner">
        {loading ? (
          <div className="loading-center">
            <Loader2 size={36} style={{ animation: "spin .8s linear infinite", color: "#4fc3f7" }} />
            <span>Loading your adventure…</span>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ color: "#ef9a9a", marginBottom: ".6rem" }}>⚠️ {error}</div>
            <button onClick={() => loadData()} style={{ background: "rgba(79,195,247,.1)", border: "1px solid rgba(79,195,247,.25)", color: "#4fc3f7", borderRadius: 9, padding: ".5rem 1.2rem", cursor: "pointer", fontFamily: "inherit", fontSize: ".85rem" }}>Try Again</button>
          </div>
        ) : (
          <>
            <div className="welcome-banner">
              <img className="welcome-char" src={classImg} alt="character" />
              <div className="welcome-text" style={{ flex: 1 }}>
                <h2>Welcome back, {user?.username || user?.name || currentUser?.username || "Adventurer"}! ⚔️</h2>
                <p>Your Konosuba adventure continues. Class: <strong style={{ color: "#ffd54f" }}>{user?.class || "Adventurer"}</strong> · {user?.country || ""}</p>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  <span className="stat-badge">🏆 Rank <strong>#{user?.rank || "?"}</strong></span>
                  <span className="stat-badge">🔥 Streak <strong>{dailyStreak}d</strong></span>
                  {user?.wins !== undefined && <span className="stat-badge">⚔️ <strong>{user.wins}W / {user.losses || 0}L</strong></span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", minWidth: 160 }}>
                <div className="progress-row">
                  <div className="progress-label"><span>XP {xp.toLocaleString()}</span><span style={{ color: "#ffd54f" }}>Lv.{user?.level || 1} → {xpPct}%</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg,#ffd54f,#ff9800)" }} /></div>
                </div>
                <div className="progress-row">
                  <div className="progress-label"><span>HP {hp}/{maxHp}</span><span style={{ color: "#ef5350" }}>{hpPct}%</span></div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg,#ef5350,#e53935)" }} /></div>
                </div>
              </div>
            </div>

            <div className="cards-grid">
              <StatCard icon={<Wallet size={16} />} label="Wallet" value={formatMoney(user?.wallet || 0)} sub="Available cash" color="#4fc3f7" />
              <StatCard icon={<TrendingUp size={16} />} label="Bank" value={formatMoney(user?.bank || 0)} sub="Safely stored" color="#ffd54f" />
              <StatCard icon={<Zap size={16} />} label="Level" value={String(user?.level || 1)} sub={`${xp}/${xpNeeded} XP`} color="#ce93d8" />
              <StatCard icon={<Star size={16} />} label="Net Worth" value={formatMoney(totalBalance)} sub="Total balance" color="#ffb74d" />
            </div>

            <div className="two-col">
              <div className="panel">
                <div className="section-title"><Activity size={16} /> Recent Activity</div>
                {activities.length === 0 ? (
                  <div className="empty-state">No activity yet.<br />Start playing in WhatsApp!</div>
                ) : activities.slice(0, 10).map((a, i) => (
                  <div className="activity-item" key={(a as { _id?: string })._id || i}>
                    <div className="act-icon">{getActIcon(a.type)}</div>
                    <div className="act-text">
                      <div className="act-desc">{getActDesc(a)}</div>
                      <div className="act-time">{getActTime(a)}</div>
                    </div>
                    {a.amount != null && (
                      <div className="act-amount" style={{ color: a.amount >= 0 ? "#a5d6a7" : "#ef9a9a" }}>
                        {a.amount >= 0 ? "+" : ""}{formatMoney(a.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="panel">
                  <div className="section-title"><Trophy size={16} /> Leaderboard</div>
                  {leaderboard.length === 0 ? (
                    <div className="empty-state">No data yet</div>
                  ) : leaderboard.slice(0, 8).map((u, i) => (
                    <div className="lb-item" key={u.phone || i}>
                      <div className={`lb-rank${i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : ""}`}>{i + 1}</div>
                      <div className="lb-name" title={u.username}>{u.username || u.phone?.slice(-6)}</div>
                      <div className="lb-val">{formatMoney(lbBalance(u))}</div>
                    </div>
                  ))}
                </div>

                <div className="panel">
                  <div className="section-title"><Sparkles size={16} /> Your Stats</div>
                  <div className="stats-list">
                    {[
                      { icon: <Fish size={13} />, val: user?.stats?.fishCaught || 0, lbl: "Fish Caught" },
                      { icon: <Pickaxe size={13} />, val: user?.stats?.itemsDug || 0, lbl: "Items Dug" },
                      { icon: <Swords size={13} />, val: user?.stats?.monstersKilled || 0, lbl: "Monsters Killed" },
                      { icon: <Sparkles size={13} />, val: user?.stats?.pokemonCaught || (user?.pokemon?.length ?? 0), lbl: "Pokémon Caught" },
                      { icon: <TrendingUp size={13} />, val: user?.stats?.timesGambled || 0, lbl: "Gambles Played" },
                      { icon: <Users size={13} />, val: user?.pokemon?.length ?? 0, lbl: "Pokémon Owned" },
                    ].map((s, i) => (
                      <div className="stats-item" key={i}>
                        <span className="stats-item-icon" style={{ color: "#4fc3f7" }}>{s.icon}</span>
                        <div>
                          <div className="stats-item-val">{s.val.toLocaleString()}</div>
                          <div className="stats-item-lbl">{s.lbl}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
