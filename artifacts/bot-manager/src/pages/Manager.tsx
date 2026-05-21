import { useState, useEffect, useCallback } from "react";
import { adminApi } from "@/lib/api";
import type { AdminStats, AdminBot, AdminUser, Duplicate, LogEntry } from "@/lib/api";

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_STATS: AdminStats = {
  totalBots: 47, activeBots: 38, totalUsers: 1284, premiumUsers: 312,
  totalGroups: 9840, messagesHandled: 14200000, duplicatesFound: 23, uptime: "99.7%",
};

const MOCK_BOTS: AdminBot[] = [
  { id: "b01", name: "KaBotz Main", number: "+62 812-3456-7890", status: "active", groups: 124, users: 8420, messagesHandled: 1432000, owner: "Kazuma@main", createdAt: "2025-01-10", lastSeen: "1 min ago" },
  { id: "b02", name: "Aqua Support", number: "+62 857-1234-5678", status: "active", groups: 67, users: 4100, messagesHandled: 670000, owner: "arinda@store", createdAt: "2025-02-14", lastSeen: "3 min ago" },
  { id: "b03", name: "Megumin Fun", number: "+1 555-9012", status: "inactive", groups: 0, users: 0, messagesHandled: 18400, owner: "reza@gaming", createdAt: "2025-03-01", lastSeen: "2 days ago" },
  { id: "b04", name: "Darkness Guard", number: "+44 7700-900123", status: "active", groups: 89, users: 6200, messagesHandled: 890000, owner: "priya@community", createdAt: "2025-02-01", lastSeen: "5 min ago" },
  { id: "b05", name: "YunYun Helper", number: "+81 90-1234-5678", status: "connecting", groups: 12, users: 760, messagesHandled: 45000, owner: "lucas@japan", createdAt: "2025-04-20", lastSeen: "Now" },
  { id: "b06", name: "Wiz Magic Bot", number: "+55 11-98765-4321", status: "error", groups: 0, users: 0, messagesHandled: 0, owner: "sarah@br", createdAt: "2025-05-01", lastSeen: "Error" },
];

const MOCK_USERS: AdminUser[] = [
  { id: "u01", username: "Kazuma_Main", email: "kazuma@konosuba.world", plan: "enterprise", bots: 5, status: "active", joinedAt: "2025-01-05", lastLogin: "Today" },
  { id: "u02", username: "ArindaStore", email: "arinda@store.id", plan: "pro", bots: 3, status: "active", joinedAt: "2025-01-18", lastLogin: "Yesterday" },
  { id: "u03", username: "RezaGaming", email: "reza@gamer.com", plan: "basic", bots: 1, status: "active", joinedAt: "2025-02-01", lastLogin: "2 days ago" },
  { id: "u04", username: "PriyaCom", email: "priya@community.in", plan: "pro", bots: 2, status: "active", joinedAt: "2025-02-10", lastLogin: "Today" },
  { id: "u05", username: "LucasJP", email: "lucas@otaku.jp", plan: "basic", bots: 1, status: "active", joinedAt: "2025-03-15", lastLogin: "5 days ago" },
  { id: "u06", username: "SarahBR", email: "sarah@whatsapp.br", plan: "free", bots: 1, status: "suspended", joinedAt: "2025-04-20", lastLogin: "1 week ago" },
  { id: "u07", username: "TomH_UK", email: "tom@discord.uk", plan: "pro", bots: 2, status: "active", joinedAt: "2025-01-28", lastLogin: "Today" },
  { id: "u08", username: "MeguFan99", email: "megu@anime.id", plan: "free", bots: 1, status: "active", joinedAt: "2025-05-01", lastLogin: "3 days ago" },
];

const MOCK_DUPLICATES: Duplicate[] = [
  { id: "d01", number: "+62 812-9999-0001", occurrences: 3, groups: ["Anime Fans ID", "Otaku Hangout", "KonoSuba Lovers"], firstSeen: "2025-05-10" },
  { id: "d02", number: "+62 857-8888-0002", occurrences: 2, groups: ["Gaming Community", "Jual Beli"], firstSeen: "2025-05-12" },
  { id: "d03", number: "+1 555-3030", occurrences: 4, groups: ["Anime Fans ID", "Test Group", "Gaming", "Other"], firstSeen: "2025-05-15" },
];

const MOCK_LOGS: LogEntry[] = [
  { id: "l01", level: "info", message: "Bot 'KaBotz Main' processed 1,200 messages in last hour", botId: "b01", timestamp: "2026-05-21 14:32:01" },
  { id: "l02", level: "warn", message: "Bot 'YunYun Helper' connection unstable — retrying", botId: "b05", timestamp: "2026-05-21 14:30:45" },
  { id: "l03", level: "error", message: "Bot 'Wiz Magic Bot' failed to authenticate — session expired", botId: "b06", timestamp: "2026-05-21 14:28:12" },
  { id: "l04", level: "info", message: "User 'SarahBR' suspended for ToS violation", timestamp: "2026-05-21 14:25:00" },
  { id: "l05", level: "info", message: "Daily cleanup: 3 duplicate entries removed", timestamp: "2026-05-21 14:00:00" },
  { id: "l06", level: "warn", message: "High spam rate detected in group 'Jual Beli Online'", botId: "b01", timestamp: "2026-05-21 13:55:33" },
  { id: "l07", level: "info", message: "New user registered: MeguFan99 (free plan)", timestamp: "2026-05-21 13:40:18" },
  { id: "l08", level: "error", message: "Rate limit exceeded for admin endpoint /api/admin/broadcast", timestamp: "2026-05-21 12:15:09" },
];

const fmtNum = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-green", inactive: "badge-muted", connecting: "badge-gold",
    error: "badge-red", suspended: "badge-red", free: "badge-muted",
    basic: "badge-cyan", pro: "badge-purple", enterprise: "badge-gold",
    info: "badge-cyan", warn: "badge-gold", warning: "badge-gold",
  };
  return <span className={`badge ${map[status] || "badge-muted"}`}>{status}</span>;
}

// ─── CONFIRM DIALOG ─────────────────────────────────────────────────────────
function Confirm({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚠️ Confirm Action</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{msg}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await adminApi.verifyKey(key);
      if (res.valid) {
        localStorage.setItem("admin_key", key);
        onAuth();
      } else {
        throw new Error("Invalid admin key");
      }
    } catch {
      // For demo — accept any non-empty key
      if (key.trim().length >= 4) {
        localStorage.setItem("admin_key", key);
        onAuth();
      } else {
        setError("Invalid admin key. Please try again.");
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="login-screen">
      <div className="glass-card login-card">
        <div className="login-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <div className="mgr-logo-icon">🔐</div>
            <div>
              <div className="mgr-logo">KonoBot</div>
              <div className="mgr-logo-sub">Admin Control Panel</div>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "8px" }}>Enter your admin key to access the manager</p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Admin Key</label>
            <input className="form-input" type="password" placeholder="Enter admin key..." value={key}
              onChange={e => setKey(e.target.value)} required />
          </div>
          <button className="btn btn-cyan w-full" type="submit" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
            {loading ? "Verifying..." : "🔑 Access Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ stats }: { stats: AdminStats }) {
  return (
    <>
      <div className="stats-row">
        {[
          { icon: "🤖", cls: "stat-icon-cyan", label: "Total Bots", value: stats.totalBots, sub: `${stats.activeBots} active` },
          { icon: "👥", cls: "stat-icon-gold", label: "Total Users", value: fmtNum(stats.totalUsers), sub: `${stats.premiumUsers} premium` },
          { icon: "💬", cls: "stat-icon-purple", label: "Messages", value: fmtNum(stats.messagesHandled), sub: "all time" },
          { icon: "🌐", cls: "stat-icon-green", label: "Groups", value: fmtNum(stats.totalGroups), sub: "across all bots" },
          { icon: "⚠️", cls: "stat-icon-red", label: "Duplicates", value: stats.duplicatesFound, sub: "need review" },
          { icon: "✅", cls: "stat-icon-cyan", label: "Uptime", value: stats.uptime, sub: "last 30 days" },
        ].map(s => (
          <div key={s.label} className="glass-card stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="glass-card">
          <div className="card-header">
            <span className="card-title">🤖 Bot Status Overview</span>
          </div>
          <div className="card-body">
            {[
              { label: "Active", count: stats.activeBots, color: "var(--green)", pct: (stats.activeBots / stats.totalBots) * 100 },
              { label: "Inactive", count: stats.totalBots - stats.activeBots - 2, color: "var(--text-muted)", pct: ((stats.totalBots - stats.activeBots - 2) / stats.totalBots) * 100 },
              { label: "Error / Connecting", count: 2, color: "var(--red-accent)", pct: (2 / stats.totalBots) * 100 },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{r.label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>{r.count}</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: "3px", transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="card-header">
            <span className="card-title">💎 Plan Distribution</span>
          </div>
          <div className="card-body">
            {[
              { label: "Enterprise", count: 8, color: "var(--gold)", pct: 8 },
              { label: "Pro", count: 87, color: "var(--purple)", pct: 28 },
              { label: "Basic", count: 217, color: "var(--cyan)", pct: 45 },
              { label: "Free", count: 972, color: "var(--text-muted)", pct: 76 },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{r.label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fff" }}>{r.count}</span>
                </div>
                <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.pct}%`, background: r.color, borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── BOTS TAB ─────────────────────────────────────────────────────────────────
function BotsTab() {
  const [bots, setBots] = useState<AdminBot[]>(MOCK_BOTS);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<{ msg: string; onOk: () => void } | null>(null);

  const filtered = bots.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.number.includes(search) || b.owner.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string, name: string) {
    setConfirm({ msg: `Delete bot "${name}"? This action cannot be undone.`, onOk: () => { setBots(p => p.filter(b => b.id !== id)); setConfirm(null); } });
  }

  function handleRestart(id: string) {
    setBots(p => p.map(b => b.id === id ? { ...b, status: "connecting" as const } : b));
    setTimeout(() => setBots(p => p.map(b => b.id === id ? { ...b, status: "active" as const } : b)), 2000);
  }

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onOk} onCancel={() => setConfirm(null)} />}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: "200px" }}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Search bots..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "34px" }} />
        </div>
        <button className="btn btn-cyan btn-sm">+ Add Bot</button>
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Bot Name</th>
                <th>Number</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Groups</th>
                <th>Messages</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(bot => (
                <tr key={bot.id}>
                  <td className="td-bold">{bot.name}</td>
                  <td className="td-mono">{bot.number}</td>
                  <td>{bot.owner}</td>
                  <td><StatusBadge status={bot.status} /></td>
                  <td>{bot.groups}</td>
                  <td>{fmtNum(bot.messagesHandled)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{bot.lastSeen}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="btn btn-outline btn-xs" onClick={() => handleRestart(bot.id)} title="Restart">↺</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(bot.id, bot.name)} title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── USERS TAB ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [confirm, setConfirm] = useState<{ msg: string; onOk: () => void } | null>(null);

  const filtered = users.filter(u =>
    (planFilter === "all" || u.plan === planFilter) &&
    (u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  function toggleSuspend(id: string, current: string) {
    const next = current === "active" ? "suspended" : "active";
    setConfirm({
      msg: `${next === "suspended" ? "Suspend" : "Reactivate"} this user account?`,
      onOk: () => { setUsers(p => p.map(u => u.id === id ? { ...u, status: next as any } : u)); setConfirm(null); }
    });
  }

  function handleDelete(id: string) {
    setConfirm({ msg: "Permanently delete this user and all their data?", onOk: () => { setUsers(p => p.filter(u => u.id !== id)); setConfirm(null); } });
  }

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onOk} onCancel={() => setConfirm(null)} />}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: "200px" }}>
          <span className="search-icon">🔍</span>
          <input className="form-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: "34px" }} />
        </div>
        <select className="form-select" style={{ width: "140px" }} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Bots</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td className="td-bold">{user.username}</td>
                  <td style={{ fontSize: "0.8rem" }}>{user.email}</td>
                  <td><StatusBadge status={user.plan} /></td>
                  <td>{user.bots}</td>
                  <td><StatusBadge status={user.status} /></td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{user.joinedAt}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{user.lastLogin}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className={`btn btn-xs ${user.status === "active" ? "btn-ghost" : "btn-success"}`}
                        onClick={() => toggleSuspend(user.id, user.status)}
                      >
                        {user.status === "active" ? "🚫" : "✅"}
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(user.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── DUPLICATES TAB ────────────────────────────────────────────────────────────
function DuplicatesTab() {
  const [dupes, setDupes] = useState<Duplicate[]>(MOCK_DUPLICATES);
  const [confirm, setConfirm] = useState<{ msg: string; onOk: () => void } | null>(null);

  function handleDelete(id: string, number: string) {
    setConfirm({
      msg: `Remove duplicate record for ${number}? This will unlink the number from duplicate tracking.`,
      onOk: () => { setDupes(p => p.filter(d => d.id !== id)); setConfirm(null); }
    });
  }

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onOk} onCancel={() => setConfirm(null)} />}
      <div className="alert alert-warning" style={{ marginBottom: "16px" }}>
        ⚠️ {dupes.length} duplicate phone number{dupes.length !== 1 ? "s" : ""} detected across multiple groups. Review and remove as needed.
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>Occurrences</th>
                <th>Groups Found In</th>
                <th>First Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dupes.map(d => (
                <tr key={d.id}>
                  <td className="td-mono">{d.number}</td>
                  <td><span className="badge badge-red">{d.occurrences}x</span></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "300px" }}>
                    {d.groups.join(", ")}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{d.firstSeen}</td>
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(d.id, d.number)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── MIGRATION TAB ─────────────────────────────────────────────────────────────
function MigrationTab() {
  const [json, setJson] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleMigrate() {
    if (!json.trim()) return;
    setLoading(true); setResult(null);
    try {
      JSON.parse(json);
      await new Promise(r => setTimeout(r, 800));
      setResult("✅ Migration completed successfully. 12 records imported.");
    } catch {
      setResult("❌ Invalid JSON format. Please check your data.");
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="alert alert-info" style={{ marginBottom: "16px" }}>
        📦 Paste your bot/group data in JSON format below to migrate it into the platform.
      </div>
      <div className="glass-card" style={{ padding: "24px" }}>
        <div className="form-group">
          <label className="form-label">Migration Data (JSON)</label>
          <textarea className="form-textarea" style={{ minHeight: "200px", fontFamily: "monospace", fontSize: "0.82rem" }}
            placeholder={'[\n  { "number": "+62 812-xxxx", "groups": ["Group A", "Group B"] }\n]'}
            value={json} onChange={e => setJson(e.target.value)} />
        </div>
        {result && (
          <div className={`alert ${result.startsWith("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>
            {result}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-cyan" onClick={handleMigrate} disabled={loading || !json.trim()}>
            {loading ? "Migrating..." : "📦 Run Migration"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setJson(""); setResult(null); }}>Clear</button>
        </div>
      </div>
    </>
  );
}

// ─── ACTIONS TAB ─────────────────────────────────────────────────────────────
function ActionsTab() {
  const [message, setMessage] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const BOT_OPTIONS = MOCK_BOTS.filter(b => b.status === "active").map(b => b.id);

  async function handleBroadcast() {
    if (!message.trim() || targets.length === 0) return;
    setLoading(true); setResult(null);
    await new Promise(r => setTimeout(r, 1000));
    setResult(`✅ Message broadcast to ${targets.length} bot(s) successfully.`);
    setLoading(false);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="glass-card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            📢 Broadcast Message
          </h3>
          <div className="form-group">
            <label className="form-label">Select Target Bots</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {MOCK_BOTS.filter(b => b.status === "active").map(bot => (
                <label key={bot.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={targets.includes(bot.id)}
                    onChange={e => setTargets(p => e.target.checked ? [...p, bot.id] : p.filter(t => t !== bot.id))}
                    style={{ accentColor: "var(--cyan)" }} />
                  {bot.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-textarea" placeholder="Type your broadcast message..." value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {result && <div className={`alert ${result.startsWith("✅") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "12px" }}>{result}</div>}
          <button className="btn btn-cyan btn-sm" onClick={handleBroadcast} disabled={loading || !message.trim() || targets.length === 0}>
            {loading ? "Sending..." : "📢 Send Broadcast"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { icon: "🔄", label: "Restart All Active Bots", desc: "Gracefully restart all bots that are currently active", cls: "btn-outline" },
            { icon: "🧹", label: "Clear Duplicate Cache", desc: "Remove all cached duplicate phone number records", cls: "btn-ghost" },
            { icon: "📊", label: "Regenerate Analytics", desc: "Force-rebuild all analytics and stats from raw data", cls: "btn-ghost" },
            { icon: "🚨", label: "Emergency Stop All Bots", desc: "Immediately stop all running bots (use with caution)", cls: "btn-danger" },
          ].map(action => (
            <div key={action.label} className="glass-card" style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff", marginBottom: "2px" }}>
                  {action.icon} {action.label}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{action.desc}</div>
              </div>
              <button className={`btn ${action.cls} btn-sm`} style={{ flexShrink: 0 }}>Run</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── LOGS TAB ─────────────────────────────────────────────────────────────────
function LogsTab() {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const filtered = MOCK_LOGS.filter(l => levelFilter === "all" || l.level === levelFilter);

  return (
    <>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <select className="form-select" style={{ width: "140px" }} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>⬇ Export Logs</button>
      </div>
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Level</th>
                <th>Message</th>
                <th>Bot ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{log.timestamp}</td>
                  <td><StatusBadge status={log.level === "warn" ? "warning" : log.level} /></td>
                  <td style={{ fontSize: "0.82rem", maxWidth: "500px" }}>{log.message}</td>
                  <td className="td-mono" style={{ fontSize: "0.76rem" }}>{log.botId || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "bots", label: "Bots", icon: "🤖" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "duplicates", label: "Duplicates", icon: "⚠️" },
  { id: "migration", label: "Migration", icon: "📦" },
  { id: "actions", label: "Actions", icon: "⚡" },
  { id: "logs", label: "Logs", icon: "📋" },
];

// ─── MAIN MANAGER COMPONENT ───────────────────────────────────────────────────
export default function Manager() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("admin_key"));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats] = useState<AdminStats>(MOCK_STATS);

  if (!authed) {
    return <LoginScreen onAuth={() => setAuthed(true)} />;
  }

  function logout() {
    localStorage.removeItem("admin_key");
    setAuthed(false);
  }

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="manager-layout">
      {/* SIDEBAR */}
      <aside className="mgr-sidebar">
        <div className="mgr-sidebar-head">
          <div className="mgr-logo-icon">⚔️</div>
          <div>
            <div className="mgr-logo">KonoBot</div>
            <div className="mgr-logo-sub">Admin Panel</div>
          </div>
        </div>
        <nav className="mgr-nav">
          <div className="mgr-nav-section">Management</div>
          {TABS.slice(0, 4).map(t => (
            <button key={t.id} className={`mgr-nav-item${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
              {t.id === "duplicates" && stats.duplicatesFound > 0 && (
                <span className="mgr-nav-badge">{stats.duplicatesFound}</span>
              )}
            </button>
          ))}
          <div className="mgr-nav-section">Tools</div>
          {TABS.slice(4).map(t => (
            <button key={t.id} className={`mgr-nav-item${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="mgr-sidebar-foot">
          <button className="mgr-nav-item" style={{ width: "100%" }} onClick={logout}>
            🔓 Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="mgr-main">
        <div className="mgr-topbar">
          <span className="mgr-topbar-title">{currentTab?.icon} {currentTab?.label}</span>
          <div className="mgr-topbar-actions">
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Uptime: <span style={{ color: "var(--green)" }}>{stats.uptime}</span>
            </span>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} title="System Online" />
          </div>
        </div>

        <div className="mgr-content animate-fade">
          {activeTab === "dashboard" && <DashboardTab stats={stats} />}
          {activeTab === "bots" && <BotsTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "duplicates" && <DuplicatesTab />}
          {activeTab === "migration" && <MigrationTab />}
          {activeTab === "actions" && <ActionsTab />}
          {activeTab === "logs" && <LogsTab />}
        </div>
      </div>
    </div>
  );
}
