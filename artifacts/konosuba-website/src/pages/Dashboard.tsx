import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { api, getStoredToken, clearStoredToken } from "@/lib/api";
import type { User, Bot, DashboardData } from "@/lib/api";

const NAV = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "bots", label: "My Bots", icon: "🤖" },
  { id: "groups", label: "Groups", icon: "👥" },
  { id: "commands", label: "Commands", icon: "📜" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

const MOCK_BOTS: Bot[] = [
  { id: "b1", name: "KaBotz Main", number: "+62 812-3456-7890", status: "active", groups: 24, messagesHandled: 148320, createdAt: "2025-01-15" },
  { id: "b2", name: "Aqua Support Bot", number: "+62 857-1234-5678", status: "active", groups: 12, messagesHandled: 67440, createdAt: "2025-02-20" },
  { id: "b3", name: "Explosion Test Bot", number: "+1 555-0192", status: "inactive", groups: 0, messagesHandled: 1230, createdAt: "2025-04-01" },
];

const MOCK_ACTIVITY = [
  { id: "1", icon: "✅", text: "KaBotz Main auto-kicked a spammer in group 'Anime Fans ID'", time: "2 min ago" },
  { id: "2", icon: "👋", text: "Aqua Support Bot welcomed 3 new members in 'Gaming Community'", time: "8 min ago" },
  { id: "3", icon: "💥", text: "Explosion command used 12 times in 'Otaku Hangout'", time: "15 min ago" },
  { id: "4", icon: "⚠️", text: "Anti-link triggered in 'Jual Beli Online' — link deleted", time: "31 min ago" },
  { id: "5", icon: "🎉", text: "Group 'Konosubaku Lovers' reached 500 members milestone", time: "1h ago" },
  { id: "6", icon: "📊", text: "Weekly analytics report generated for all bots", time: "3h ago" },
];

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStoredToken()) { navigate("/auth"); return; }
    api.getMe()
      .then(u => setUser(u))
      .catch(() => {
        setUser({ id: "demo", username: "Kazuma", email: "kazuma@konosuba.world", plan: "pro", createdAt: "2025-01-01" });
      })
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearStoredToken();
    navigate("/");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px", animation: "float 1s ease-in-out infinite" }}>⚔️</div>
          <p style={{ color: "var(--text-secondary)" }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-logo">
          <div className="navbar-logo-icon">K</div>
          KonoBot
        </div>
        <div className="navbar-actions">
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            👤 {user?.username || "Adventurer"} &nbsp;·&nbsp;
            <span style={{ color: "var(--cyan)", textTransform: "capitalize" }}>{user?.plan}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-section">Navigation</div>
          {NAV.slice(0, 5).map(n => (
            <button key={n.id} className={`sidebar-link${activeTab === n.id ? " active" : ""}`} onClick={() => setActiveTab(n.id)}>
              {n.icon} {n.label}
              {n.id === "bots" && <span className="dot" />}
            </button>
          ))}
          <div className="sidebar-section">Account</div>
          {NAV.slice(5).map(n => (
            <button key={n.id} className={`sidebar-link${activeTab === n.id ? " active" : ""}`} onClick={() => setActiveTab(n.id)}>
              {n.icon} {n.label}
            </button>
          ))}
        </aside>

        {/* MAIN */}
        <main className="dashboard-main">
          {activeTab === "overview" && (
            <>
              <div className="dashboard-header">
                <div>
                  <h1 className="dashboard-title">Welcome back, {user?.username || "Adventurer"} ⚔️</h1>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>Here's what's happening across your bots today.</p>
                </div>
                <button className="btn btn-cyan btn-sm" onClick={() => setActiveTab("bots")}>+ Add Bot</button>
              </div>

              <div className="stats-grid">
                {[
                  { icon: "🤖", cls: "stat-icon-cyan", label: "Active Bots", value: "2", change: "↑ 1 this month", up: true },
                  { icon: "👥", cls: "stat-icon-gold", label: "Total Groups", value: "36", change: "↑ 4 this week", up: true },
                  { icon: "💬", cls: "stat-icon-purple", label: "Messages", value: fmtNum(215760), change: "↑ 12% vs last week", up: true },
                  { icon: "⚠️", cls: "stat-icon-red", label: "Actions Taken", value: "1,247", change: "Spam blocks & kicks", up: false },
                ].map(s => (
                  <div key={s.label} className="glass-card stat-card">
                    <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                    <div>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className={`stat-change ${s.up ? "up" : "down"}`}>{s.change}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-grid">
                <div className="glass-card" style={{ padding: "0" }}>
                  <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>🤖 Active Bots</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => setActiveTab("bots")}>Manage</button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Bot Name</th>
                          <th>Number</th>
                          <th>Groups</th>
                          <th>Status</th>
                          <th>Messages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_BOTS.map(bot => (
                          <tr key={bot.id}>
                            <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{bot.name}</td>
                            <td style={{ fontFamily: "monospace", color: "var(--cyan)", fontSize: "0.8rem" }}>{bot.number}</td>
                            <td>{bot.groups}</td>
                            <td><span className={`status-badge ${bot.status}`}>{bot.status}</span></td>
                            <td>{fmtNum(bot.messagesHandled)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "0" }}>
                  <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>⚡ Recent Activity</h3>
                  </div>
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {MOCK_ACTIVITY.map(a => (
                      <div key={a.id} style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "2px" }}>{a.icon}</span>
                        <div>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.text}</p>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "bots" && (
            <>
              <div className="dashboard-header">
                <h1 className="dashboard-title">🤖 My Bots</h1>
                <button className="btn btn-cyan btn-sm">+ Connect New Bot</button>
              </div>
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: "24px" }}>
                {MOCK_BOTS.map(bot => (
                  <div key={bot.id} className="glass-card" style={{ padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <span style={{ fontSize: "1.5rem" }}>🤖</span>
                      <span className={`status-badge ${bot.status}`}>{bot.status}</span>
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", marginBottom: "4px" }}>{bot.name}</h3>
                    <p style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "var(--cyan)", marginBottom: "16px" }}>{bot.number}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                      <div>
                        <div className="stat-label">Groups</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{bot.groups}</div>
                      </div>
                      <div>
                        <div className="stat-label">Messages</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{fmtNum(bot.messagesHandled)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-outline btn-sm" style={{ flex: 1 }}>⚙️ Config</button>
                      <button className="btn btn-ghost btn-sm">↺</button>
                    </div>
                  </div>
                ))}
                <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", border: "2px dashed var(--border)", cursor: "pointer", minHeight: "200px" }}>
                  <span style={{ fontSize: "2rem", opacity: 0.4 }}>+</span>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Connect New Bot</p>
                  <button className="btn btn-cyan btn-sm">Get Started</button>
                </div>
              </div>
            </>
          )}

          {(activeTab === "groups" || activeTab === "commands" || activeTab === "analytics" || activeTab === "billing" || activeTab === "settings") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "16px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>{NAV.find(n => n.id === activeTab)?.icon}</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>{NAV.find(n => n.id === activeTab)?.label}</h2>
              <p style={{ color: "var(--text-secondary)", maxWidth: "360px" }}>
                This section is coming soon. Connect your backend API to power this feature.
              </p>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab("overview")}>← Back to Overview</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
