import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, RefreshCw, Trash2, Key, RotateCcw, Bot, Lock, Eye, EyeOff,
  Upload, X, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff, Copy,
  Users, Search, Ban, Edit2, ChevronLeft, ChevronRight, Shield, Zap, DollarSign
} from "lucide-react";
import {
  apiFetchBots, apiAddBot, apiGetPairingCode, apiDeleteBot, apiRestartBot, fileToBase64,
  apiFetchUsers, apiSearchUser, apiEditUser, apiBanUser, apiResetUserCooldowns,
  apiResetUser, apiDeleteUser, apiDeleteAllUsers, apiMergeUsers,
  formatMoney, type UserRecord
} from "@/lib/api";

interface BotData {
  _id?: string;
  botId?: string;
  botName?: string;
  name?: string;
  phoneNumber?: string;
  phone?: string;
  isConnected?: boolean;
  status?: string;
  avatarData?: string;
  createdAt?: string;
  lastSeen?: string;
  jid?: string;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  const c = { success: { bg: "rgba(165,214,167,.1)", border: "rgba(165,214,167,.3)", text: "#a5d6a7", icon: "✅" }, error: { bg: "rgba(239,83,80,.1)", border: "rgba(239,83,80,.3)", text: "#ef9a9a", icon: "❌" }, info: { bg: "rgba(79,195,247,.08)", border: "rgba(79,195,247,.28)", text: "#80deea", icon: "ℹ️" } }[type];
  return (
    <div style={{ position: "fixed", top: "1.2rem", right: "1.2rem", zIndex: 9999, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: ".85rem 1.1rem", display: "flex", gap: ".6rem", alignItems: "flex-start", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,.5)", backdropFilter: "blur(16px)", animation: "slideIn .25s ease" }}>
      <span style={{ flexShrink: 0 }}>{c.icon}</span>
      <span style={{ color: c.text, fontSize: ".82rem", lineHeight: 1.5, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", padding: "2px", opacity: .7, flexShrink: 0 }}><X size={13} /></button>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0d1117", border: `1px solid ${danger ? "rgba(239,68,68,.25)" : "rgba(99,102,241,.2)"}`, borderRadius: 20, padding: "1.8rem", maxWidth: 380, width: "100%" }}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#e2e8f0", marginBottom: ".6rem" }}>{title}</div>
        <div style={{ color: "#475569", fontSize: ".85rem", lineHeight: 1.6, marginBottom: "1.4rem" }}>{message}</div>
        <div style={{ display: "flex", gap: ".7rem" }}>
          <button onClick={onCancel} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#64748b", borderRadius: 11, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, background: danger ? "rgba(239,68,68,.15)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: danger ? "1px solid rgba(239,68,68,.35)" : "none", color: danger ? "#f87171" : "#fff", borderRadius: 11, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pairing Modal ──────────────────────────────────────────────────────────────
function PairingModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(79,195,247,.2)", borderRadius: 22, padding: "2rem 1.8rem", maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,rgba(79,195,247,.15),rgba(79,195,247,.05))", border: "2px solid rgba(79,195,247,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
          <Key size={24} style={{ color: "#4fc3f7" }} />
        </div>
        <h3 style={{ color: "#eceff1", fontWeight: 800, fontSize: "1.15rem", marginBottom: ".4rem" }}>Pairing Code</h3>
        <p style={{ color: "#455a64", fontSize: ".82rem", marginBottom: "1.4rem", lineHeight: 1.6 }}>Open WhatsApp → Linked Devices → Link a device → Enter this code:</p>
        <div style={{ background: "rgba(79,195,247,.06)", border: "1px solid rgba(79,195,247,.25)", borderRadius: 14, padding: "1rem 1.2rem", marginBottom: "1.2rem" }}>
          <div style={{ fontFamily: "monospace", fontSize: "2rem", fontWeight: 900, letterSpacing: ".3em", color: "#4fc3f7", userSelect: "all" }}>{code}</div>
        </div>
        <div style={{ display: "flex", gap: ".7rem" }}>
          <button onClick={copy} style={{ flex: 1, background: copied ? "rgba(165,214,167,.1)" : "rgba(79,195,247,.1)", border: `1px solid ${copied ? "rgba(165,214,167,.3)" : "rgba(79,195,247,.3)"}`, color: copied ? "#a5d6a7" : "#4fc3f7", borderRadius: 10, padding: ".7rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
            {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#78909c", borderRadius: 10, padding: ".7rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Bot Modal ──────────────────────────────────────────────────────────────
function AddBotModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: { botName: string; phoneNumber: string; avatarData?: string }) => Promise<void> }) {
  const [botName, setBotName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { setError("Image must be under 3MB"); return; }
    setAvatar(await fileToBase64(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/[\s+\-()]/g, "");
    if (!botName.trim()) { setError("Bot name is required"); return; }
    if (!cleanPhone || cleanPhone.length < 10) { setError("Enter a valid phone number with country code"); return; }
    setLoading(true); setError("");
    try { await onAdd({ botName: botName.trim(), phoneNumber: cleanPhone, avatarData: avatar || undefined }); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to add bot"); }
    finally { setLoading(false); }
  }

  const inp = { width: "100%", padding: ".78rem 1rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, color: "#e2e8f0", fontSize: ".9rem", fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(99,102,241,.2)", borderRadius: 22, padding: "1.8rem", maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
          <h3 style={{ color: "#e2e8f0", fontWeight: 800, fontSize: "1.05rem" }}>Add New Bot</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.4rem" }}>
          <div style={{ position: "relative" }}>
            <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: "50%", background: avatar ? "transparent" : "rgba(99,102,241,.1)", border: `2px dashed ${avatar ? "rgba(99,102,241,.5)" : "rgba(99,102,241,.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden" }}>
              {avatar ? <img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="avatar" /> : <Upload size={22} style={{ color: "#6366f1" }} />}
            </div>
            {avatar && <button onClick={() => setAvatar(null)} style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={10} /></button>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          </div>
        </div>
        {error && <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, padding: ".6rem .9rem", fontSize: ".78rem", color: "#fca5a5", marginBottom: ".9rem" }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#475569", marginBottom: ".38rem", textTransform: "uppercase", letterSpacing: ".06em" }}>Bot Name</label>
            <input value={botName} onChange={e => setBotName(e.target.value)} placeholder="e.g. KonoBot Alpha" required style={inp} />
          </div>
          <div style={{ marginBottom: "1.4rem" }}>
            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#475569", marginBottom: ".38rem", textTransform: "uppercase", letterSpacing: ".06em" }}>WhatsApp Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="2348012345678 (with country code)" required style={inp} />
            <div style={{ fontSize: ".68rem", color: "#334155", marginTop: ".28rem" }}>No spaces, + or dashes — just numbers</div>
          </div>
          <div style={{ display: "flex", gap: ".7rem" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#64748b", borderRadius: 12, padding: ".78rem", fontFamily: "inherit", fontSize: ".88rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: ".78rem", fontFamily: "inherit", fontSize: ".88rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", opacity: loading ? .7 : 1 }}>
              {loading ? <><Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> Adding…</> : <><Plus size={14} /> Add Bot</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bot Card ───────────────────────────────────────────────────────────────────
function BotCard({ bot, adminPw, onRefresh, onToast }: { bot: BotData; adminPw: string; onRefresh: () => void; onToast: (msg: string, type: "success" | "error" | "info") => void }) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const botId     = bot.botId || bot._id || "";
  const connected = bot.isConnected || bot.status === "connected";
  const displayName = bot.botName || bot.name || "Unknown Bot";
  const displayPhone = bot.phoneNumber || bot.phone || bot.jid?.split("@")[0] || "—";

  async function getPairingCode() {
    setLoadingCode(true);
    try { const d = await apiGetPairingCode(adminPw, botId); setPairingCode(d.pairingCode || d.code); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed to get pairing code", "error"); }
    finally { setLoadingCode(false); }
  }

  async function doDelete() {
    setDeleting(true);
    try { await apiDeleteBot(adminPw, botId); onToast(`Bot "${displayName}" deleted`, "success"); onRefresh(); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed to delete bot", "error"); }
    finally { setDeleting(false); setConfirm(false); }
  }

  async function restartBot() {
    setRestarting(true);
    try { await apiRestartBot(adminPw, botId); onToast(`Bot "${displayName}" restarting…`, "info"); setTimeout(onRefresh, 3000); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed to restart", "error"); }
    finally { setRestarting(false); }
  }

  const btnBase = { borderRadius: 10, padding: ".6rem .5rem", fontFamily: "inherit", fontSize: ".75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".35rem", transition: "all .2s" } as const;

  return (
    <>
      {confirm && <ConfirmDialog title={`Delete "${displayName}"?`} message="This permanently removes the bot and its session. It cannot be undone." confirmLabel="Delete" danger onConfirm={doDelete} onCancel={() => setConfirm(false)} />}
      {pairingCode && <PairingModal code={pairingCode} onClose={() => setPairingCode(null)} />}
      <div style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${connected ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.06)"}`, borderRadius: 20, padding: "1.3rem", display: "flex", flexDirection: "column", gap: "1rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, borderRadius: "0 20px 0 100%", background: connected ? "rgba(99,102,241,.04)" : "rgba(255,255,255,.01)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: ".9rem" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {bot.avatarData
              ? <img src={bot.avatarData} style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "2px solid rgba(99,102,241,.35)" }} alt={displayName} />
              : <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,rgba(99,102,241,.2),rgba(79,195,247,.15))", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(99,102,241,.25)" }}><Bot size={22} style={{ color: "#6366f1" }} /></div>}
            <div style={{ position: "absolute", bottom: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: connected ? "#22c55e" : "#475569", border: "2px solid #0d1117", boxShadow: connected ? "0 0 6px rgba(34,197,94,.6)" : "none" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#e2e8f0", marginBottom: ".18rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
            <div style={{ fontSize: ".72rem", color: "#475569", fontFamily: "monospace" }}>{displayPhone}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: ".35rem", background: connected ? "rgba(34,197,94,.08)" : "rgba(71,85,105,.15)", border: `1px solid ${connected ? "rgba(34,197,94,.25)" : "rgba(71,85,105,.3)"}`, borderRadius: 50, padding: ".22rem .65rem", flexShrink: 0 }}>
            {connected ? <Wifi size={11} style={{ color: "#22c55e" }} /> : <WifiOff size={11} style={{ color: "#475569" }} />}
            <span style={{ fontSize: ".62rem", fontWeight: 700, color: connected ? "#22c55e" : "#475569" }}>{connected ? "Online" : (bot.status || "Offline")}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".55rem" }}>
          <button onClick={getPairingCode} disabled={loadingCode} style={{ ...btnBase, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", opacity: loadingCode ? .6 : 1, cursor: loadingCode ? "not-allowed" : "pointer" }}>
            {loadingCode ? <Loader2 size={12} style={{ animation: "spin .7s linear infinite" }} /> : <Key size={12} />} Pairing Code
          </button>
          <button onClick={restartBot} disabled={restarting} style={{ ...btnBase, background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.22)", color: "#fbbf24", opacity: restarting ? .6 : 1, cursor: restarting ? "not-allowed" : "pointer" }}>
            {restarting ? <Loader2 size={12} style={{ animation: "spin .7s linear infinite" }} /> : <RotateCcw size={12} />} Restart
          </button>
          <button onClick={() => setConfirm(true)} disabled={deleting} style={{ ...btnBase, gridColumn: "span 2", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", opacity: deleting ? .6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}>
            {deleting ? <Loader2 size={12} style={{ animation: "spin .7s linear infinite" }} /> : <Trash2 size={12} />} Delete Bot
          </button>
        </div>
        {bot.lastSeen && !connected && (
          <div style={{ fontSize: ".65rem", color: "#334155", display: "flex", alignItems: "center", gap: ".3rem" }}>
            <AlertCircle size={10} style={{ color: "#475569" }} /> Last seen: {new Date(bot.lastSeen).toLocaleString()}
          </div>
        )}
      </div>
    </>
  );
}

// ── Edit User Modal ────────────────────────────────────────────────────────────
function EditUserModal({ user, adminPw, onClose, onSave, onToast }: {
  user: UserRecord; adminPw: string; onClose: () => void;
  onSave: (u: UserRecord) => void; onToast: (msg: string, type: "success" | "error" | "info") => void;
}) {
  const [wallet, setWallet] = useState(String(user.wallet ?? 0));
  const [bank,   setBank]   = useState(String(user.bank   ?? 0));
  const [level,  setLevel]  = useState(String(user.level  ?? 1));
  const [xp,     setXp]     = useState(String(user.xp     ?? 0));
  const [streak, setStreak] = useState(String(user.streak ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await apiEditUser(adminPw, {
        phone:  user.phone,
        wallet: Number(wallet), bank: Number(bank),
        level:  Number(level),  xp:   Number(xp), streak: Number(streak),
      });
      onSave(result.user || { ...user, wallet: Number(wallet), bank: Number(bank), level: Number(level), xp: Number(xp), streak: Number(streak) });
      onToast("User updated", "success");
      onClose();
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally { setSaving(false); }
  }

  const inp = { width: "100%", padding: ".65rem .85rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: ".88rem", fontFamily: "inherit", outline: "none" };
  const lbl = { display: "block", fontSize: ".68rem", fontWeight: 700, color: "#475569", marginBottom: ".3rem", textTransform: "uppercase" as const, letterSpacing: ".06em" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(99,102,241,.2)", borderRadius: 20, padding: "1.8rem", maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div>
            <div style={{ fontWeight: 800, color: "#e2e8f0", fontSize: "1rem" }}>Edit User</div>
            <div style={{ fontSize: ".72rem", color: "#475569", fontFamily: "monospace" }}>{user.phone}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".85rem", marginBottom: "1.2rem" }}>
            {[["Wallet ($)", wallet, setWallet], ["Bank ($)", bank, setBank], ["Level", level, setLevel], ["XP", xp, setXp], ["Streak (days)", streak, setStreak]].map(([label, val, setter]) => (
              <div key={label as string}>
                <label style={lbl}>{label as string}</label>
                <input type="number" min={0} value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: ".7rem" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#64748b", borderRadius: 10, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 10, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
              {saving ? <><Loader2 size={14} style={{ animation: "spin .7s linear infinite" }} /> Saving…</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────────
function UsersTab({ adminPw, onToast }: { adminPw: string; onToast: (msg: string, type: "success" | "error" | "info") => void }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal]     = useState(0);
  const [page,  setPage]      = useState(1);
  const [pages, setPages]     = useState(1);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [confirm, setConfirm]   = useState<{ type: string; user?: UserRecord } | null>(null);
  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [showMerge, setShowMerge]     = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const d = await apiFetchUsers(adminPw, p, LIMIT, q);
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setPage(d.page || p);
      setPages(d.pages || 1);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed to load users", "error"); }
    finally { setLoading(false); }
  }, [adminPw, search, onToast]);

  useEffect(() => { load(1); }, []);

  async function handleBan(user: UserRecord, ban: boolean) {
    try {
      await apiBanUser(adminPw, user.phone, ban);
      onToast(`User ${user.phone} ${ban ? "banned" : "unbanned"}`, "success");
      load(page);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
    setConfirm(null);
  }

  async function handleResetCooldowns(user: UserRecord) {
    try { await apiResetUserCooldowns(adminPw, user.phone); onToast("Cooldowns reset", "success"); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
    setConfirm(null);
  }

  async function handleReset(user: UserRecord) {
    try { await apiResetUser(adminPw, user.phone); onToast(`Stats reset for ${user.phone}`, "success"); load(page); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
    setConfirm(null);
  }

  async function handleDelete(user: UserRecord) {
    try { await apiDeleteUser(adminPw, user.phone); onToast(`User ${user.phone} deleted`, "success"); load(page); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
    setConfirm(null);
  }

  async function handleDeleteAll() {
    try { const d = await apiDeleteAllUsers(adminPw); onToast(d.message || "All users deleted", "success"); load(1); }
    catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
    setConfirm(null);
  }

  async function handleMerge() {
    if (!mergeSource || !mergeTarget) { onToast("Enter both phone numbers", "error"); return; }
    try {
      const d = await apiMergeUsers(adminPw, mergeSource, mergeTarget);
      onToast(d.message || "Merged", "success");
      setShowMerge(false); setMergeSource(""); setMergeTarget(""); load(1);
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : "Failed", "error"); }
  }

  function doSearch(e: React.FormEvent) { e.preventDefault(); load(1, search); }

  const rowStyle = { display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.7fr auto", gap: ".5rem", alignItems: "center", padding: ".65rem .85rem", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: ".78rem" };

  return (
    <div>
      {editUser && <EditUserModal user={editUser} adminPw={adminPw} onClose={() => setEditUser(null)} onSave={u => { setUsers(prev => prev.map(x => x.phone === u.phone ? u : x)); }} onToast={onToast} />}

      {confirm?.type === "ban"    && <ConfirmDialog title="Ban User?" message={`Ban ${confirm.user?.phone}? They cannot use bot commands.`} confirmLabel="Ban" danger onConfirm={() => handleBan(confirm.user!, true)} onCancel={() => setConfirm(null)} />}
      {confirm?.type === "unban"  && <ConfirmDialog title="Unban User?" message={`Restore access for ${confirm.user?.phone}?`} confirmLabel="Unban" onConfirm={() => handleBan(confirm.user!, false)} onCancel={() => setConfirm(null)} />}
      {confirm?.type === "cooldowns" && <ConfirmDialog title="Reset Cooldowns?" message={`Clear all active cooldowns for ${confirm.user?.phone}?`} confirmLabel="Reset" onConfirm={() => handleResetCooldowns(confirm.user!)} onCancel={() => setConfirm(null)} />}
      {confirm?.type === "reset"  && <ConfirmDialog title="Reset User Stats?" message={`This wipes all economy, XP, inventory, and game data for ${confirm.user?.phone}. This cannot be undone.`} confirmLabel="Reset Stats" danger onConfirm={() => handleReset(confirm.user!)} onCancel={() => setConfirm(null)} />}
      {confirm?.type === "delete" && <ConfirmDialog title="Delete User?" message={`Permanently delete ${confirm.user?.phone} and ALL their data? This cannot be undone.`} confirmLabel="Delete Forever" danger onConfirm={() => handleDelete(confirm.user!)} onCancel={() => setConfirm(null)} />}
      {confirm?.type === "deleteAll" && <ConfirmDialog title="Delete ALL Users?" message="This wipes every single user record from the database. This is IRREVERSIBLE." confirmLabel="Delete All" danger onConfirm={handleDeleteAll} onCancel={() => setConfirm(null)} />}

      {showMerge && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0d1117", border: "1px solid rgba(99,102,241,.2)", borderRadius: 20, padding: "1.8rem", maxWidth: 400, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
              <div style={{ fontWeight: 800, color: "#e2e8f0" }}>Merge Duplicate Users</div>
              <button onClick={() => setShowMerge(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px" }}><X size={18} /></button>
            </div>
            <div style={{ color: "#475569", fontSize: ".8rem", lineHeight: 1.6, marginBottom: "1.2rem" }}>Source account is deleted after merging. Balances, XP, inventory and achievements are combined into the target account.</div>
            {[["Source Phone (to delete)", mergeSource, setMergeSource], ["Target Phone (to keep)", mergeTarget, setMergeTarget]].map(([label, val, setter]) => (
              <div key={label as string} style={{ marginBottom: ".9rem" }}>
                <label style={{ display: "block", fontSize: ".68rem", fontWeight: 700, color: "#475569", marginBottom: ".3rem", textTransform: "uppercase" as const }}>{label as string}</label>
                <input value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder="e.g. 2348012345678" style={{ width: "100%", padding: ".7rem .9rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: ".88rem", fontFamily: "inherit", outline: "none" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: ".7rem", marginTop: ".5rem" }}>
              <button onClick={() => setShowMerge(false)} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#64748b", borderRadius: 10, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleMerge} style={{ flex: 2, background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000", border: "none", borderRadius: 10, padding: ".72rem", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 700, cursor: "pointer" }}>Merge Accounts</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: ".7rem", marginBottom: "1.2rem", flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={doSearch} style={{ display: "flex", gap: ".5rem", flex: 1, minWidth: 200 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: ".75rem", top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone number…" style={{ width: "100%", padding: ".65rem .85rem .65rem 2.2rem", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, color: "#e2e8f0", fontSize: ".85rem", fontFamily: "inherit", outline: "none" }} />
          </div>
          <button type="submit" style={{ background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#818cf8", borderRadius: 10, padding: ".65rem 1rem", fontFamily: "inherit", fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>Search</button>
        </form>
        <button onClick={() => load(page)} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#475569", borderRadius: 10, padding: ".65rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <RefreshCw size={14} style={loading ? { animation: "spin .7s linear infinite", color: "#6366f1" } : {}} />
        </button>
        <button onClick={() => setShowMerge(true)} style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.22)", color: "#fbbf24", borderRadius: 10, padding: ".65rem .9rem", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem" }}>
          <Users size={13} /> Merge
        </button>
        <button onClick={() => setConfirm({ type: "deleteAll" })} style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", borderRadius: 10, padding: ".65rem .9rem", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: ".35rem" }}>
          <Trash2 size={13} /> Delete All
        </button>
      </div>

      <div style={{ color: "#334155", fontSize: ".75rem", marginBottom: ".7rem" }}>{total} user{total !== 1 ? "s" : ""} total</div>

      {/* Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ ...rowStyle, background: "rgba(255,255,255,.03)", fontSize: ".68rem", color: "#334155", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <span>User</span><span>Balance</span><span>Level</span><span>XP</span><span>Streak</span><span>Status</span><span>Actions</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem", gap: ".7rem", color: "#334155" }}>
            <Loader2 size={24} style={{ animation: "spin .8s linear infinite", color: "#6366f1" }} />
            <span style={{ fontSize: ".88rem" }}>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#334155", fontSize: ".85rem" }}>No users found</div>
        ) : users.map((u, i) => (
          <div key={u.phone || i} style={{ ...rowStyle, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: ".8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username || u.name || "—"}</div>
              <div style={{ fontSize: ".65rem", color: "#475569", fontFamily: "monospace" }}>{u.phone}</div>
              {u.guild && <div style={{ fontSize: ".62rem", color: "#6366f1", marginTop: ".1rem" }}>🏰 {u.guild}</div>}
            </div>
            <div>
              <div style={{ color: "#4fc3f7", fontWeight: 700, fontSize: ".78rem" }}>{formatMoney(u.totalBalance || 0)}</div>
              <div style={{ fontSize: ".62rem", color: "#475569" }}>W:{formatMoney(u.wallet || 0)} B:{formatMoney(u.bank || 0)}</div>
            </div>
            <div style={{ color: "#a78bfa", fontWeight: 700 }}>Lv.{u.level || 1}</div>
            <div style={{ color: "#94a3b8" }}>{(u.xp || 0).toLocaleString()}</div>
            <div style={{ color: "#fbbf24" }}>{u.streak || 0}d 🔥</div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
              {u.banned && <span style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", borderRadius: 6, padding: ".12rem .4rem", fontSize: ".6rem", fontWeight: 700 }}>BANNED</span>}
              {!u.registered && <span style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", color: "#fbbf24", borderRadius: 6, padding: ".12rem .4rem", fontSize: ".6rem", fontWeight: 700 }}>UNREG</span>}
              {u.registered && !u.banned && <span style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", color: "#22c55e", borderRadius: 6, padding: ".12rem .4rem", fontSize: ".6rem", fontWeight: 700 }}>ACTIVE</span>}
            </div>
            <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
              {[
                { icon: <Edit2 size={11} />, color: "#818cf8", bg: "rgba(99,102,241,.1)", border: "rgba(99,102,241,.25)", title: "Edit", onClick: () => setEditUser(u) },
                { icon: <Ban size={11} />, color: u.banned ? "#22c55e" : "#f87171", bg: u.banned ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: u.banned ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.2)", title: u.banned ? "Unban" : "Ban", onClick: () => setConfirm({ type: u.banned ? "unban" : "ban", user: u }) },
                { icon: <Zap size={11} />, color: "#fbbf24", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.22)", title: "Reset Cooldowns", onClick: () => setConfirm({ type: "cooldowns", user: u }) },
                { icon: <Shield size={11} />, color: "#fb923c", bg: "rgba(251,146,60,.08)", border: "rgba(251,146,60,.22)", title: "Reset Stats", onClick: () => setConfirm({ type: "reset", user: u }) },
                { icon: <Trash2 size={11} />, color: "#f87171", bg: "rgba(239,68,68,.06)", border: "rgba(239,68,68,.18)", title: "Delete User", onClick: () => setConfirm({ type: "delete", user: u }) },
              ].map(btn => (
                <button key={btn.title} title={btn.title} onClick={btn.onClick} style={{ background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, borderRadius: 7, padding: ".32rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 26, minHeight: 26 }}>
                  {btn.icon}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".6rem", marginTop: "1.2rem" }}>
          <button onClick={() => load(page - 1)} disabled={page <= 1} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: page <= 1 ? "#334155" : "#94a3b8", borderRadius: 9, padding: ".4rem .7rem", cursor: page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ color: "#475569", fontSize: ".8rem" }}>Page {page} of {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: page >= pages ? "#334155" : "#94a3b8", borderRadius: 9, padding: ".4rem .7rem", cursor: page >= pages ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Manager Component ─────────────────────────────────────────────────────
export default function Manager() {
  const [adminPw, setAdminPw]   = useState(() => localStorage.getItem("bm_pw") || "");
  const [showPw, setShowPw]     = useState(false);
  const [authed, setAuthed]     = useState(false);
  const [bots, setBots]         = useState<BotData[]>([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bots" | "users">("bots");
  const [toasts, setToasts]     = useState<{ id: number; msg: string; type: "success" | "error" | "info" }[]>([]);

  function addToast(msg: string, type: "success" | "error" | "info" = "info") {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
  }
  function removeToast(id: number) { setToasts(t => t.filter(x => x.id !== id)); }

  const loadBots = useCallback(async (isRefresh = false) => {
    if (!adminPw) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const d = await apiFetchBots(adminPw);
      setBots(Array.isArray(d) ? d : (d.bots || []));
      setAuthed(true);
      localStorage.setItem("bm_pw", adminPw);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg.toLowerCase().includes("unauthorized") || msg.includes("401") || msg.includes("403") || msg.includes("admin")) {
        setAuthError("Incorrect admin password");
        localStorage.removeItem("bm_pw");
      } else {
        addToast(msg, "error");
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, [adminPw]);

  useEffect(() => {
    const saved = localStorage.getItem("bm_pw");
    if (saved) { setAdminPw(saved); }
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    await loadBots();
  }

  async function handleAddBot(data: { botName: string; phoneNumber: string; avatarData?: string }) {
    await apiAddBot(adminPw, data);
    addToast(`Bot "${data.botName}" added!`, "success");
    await loadBots(true);
  }

  const onlineBots = bots.filter(b => b.isConnected || b.status === "connected").length;

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', 'Poppins', sans-serif", padding: "1.5rem" }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`*,*::before,*::after{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)}} @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,.2)} 50%{box-shadow:0 0 40px rgba(99,102,241,.5)}}`}</style>
        <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: "linear-gradient(135deg,rgba(99,102,241,.2),rgba(79,195,247,.1))", border: "2px solid rgba(99,102,241,.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", animation: "glow 3s ease-in-out infinite" }}>
            <Bot size={30} style={{ color: "#6366f1" }} />
          </div>
          <h1 style={{ color: "#e2e8f0", fontWeight: 900, fontSize: "1.6rem", marginBottom: ".3rem" }}>Bot Manager</h1>
          <p style={{ color: "#334155", fontSize: ".85rem", marginBottom: "2rem" }}>Admin access required</p>
          <form onSubmit={handleAuth}>
            <div style={{ position: "relative", marginBottom: ".9rem" }}>
              <Lock size={14} style={{ position: "absolute", left: ".9rem", top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none" }} />
              <input type={showPw ? "text" : "password"} value={adminPw} onChange={e => { setAdminPw(e.target.value); setAuthError(""); }} placeholder="Admin password" style={{ width: "100%", padding: ".85rem 2.8rem .85rem 2.6rem", background: "rgba(255,255,255,.04)", border: `1px solid ${authError ? "rgba(239,68,68,.5)" : "rgba(255,255,255,.08)"}`, borderRadius: 14, color: "#e2e8f0", fontSize: ".92rem", fontFamily: "inherit", outline: "none" }} />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: ".9rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, minHeight: 28 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {authError && <div style={{ color: "#f87171", fontSize: ".78rem", marginBottom: ".8rem" }}>⚠️ {authError}</div>}
            <button type="submit" disabled={loading || !adminPw} style={{ width: "100%", padding: ".9rem", background: loading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 14, fontFamily: "inherit", fontSize: ".92rem", fontWeight: 700, cursor: (loading || !adminPw) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: ".45rem", opacity: !adminPw ? .5 : 1, boxShadow: "0 8px 24px rgba(99,102,241,.25)" }}>
              {loading ? <><Loader2 size={16} style={{ animation: "spin .7s linear infinite" }} /> Authenticating…</> : "Access Manager"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main panel ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#030712", fontFamily: "'Inter', 'Poppins', sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`*,*::before,*::after{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)}}`}</style>

      {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => removeToast(t.id)} />)}
      {showAddModal && <AddBotModal onClose={() => setShowAddModal(false)} onAdd={handleAddBot} />}

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.5rem", background: "rgba(3,7,18,.92)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(99,102,241,.1)", position: "sticky", top: 0, zIndex: 100, gap: ".8rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(99,102,241,.25),rgba(79,195,247,.15))", border: "1.5px solid rgba(99,102,241,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bot size={18} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#e2e8f0", lineHeight: 1.1 }}>Bot Manager</div>
            <div style={{ fontSize: ".6rem", color: "#6366f1", fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase" }}>Admin Panel</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: ".35rem", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 11, padding: ".25rem" }}>
          {([["bots", <Bot size={13} />, "Bots"], ["users", <Users size={13} />, "Users"]] as const).map(([tab, icon, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? "rgba(99,102,241,.2)" : "transparent", border: activeTab === tab ? "1px solid rgba(99,102,241,.35)" : "1px solid transparent", color: activeTab === tab ? "#818cf8" : "#475569", borderRadius: 8, padding: ".38rem .75rem", fontFamily: "inherit", fontSize: ".78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: ".3rem", transition: "all .18s" }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <div style={{ background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", borderRadius: 9, padding: ".28rem .7rem", fontSize: ".7rem", fontWeight: 700, color: "#22c55e" }}>{onlineBots} online</div>
            <div style={{ background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.22)", borderRadius: 9, padding: ".28rem .7rem", fontSize: ".7rem", fontWeight: 700, color: "#818cf8" }}>{bots.length} bots</div>
          </div>
          {activeTab === "bots" && (
            <button onClick={() => loadBots(true)} disabled={refreshing} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#475569", borderRadius: 9, padding: ".42rem", cursor: "pointer", display: "flex", alignItems: "center", minWidth: 36, minHeight: 36, justifyContent: "center" }}>
              <RefreshCw size={14} style={refreshing ? { animation: "spin .7s linear infinite", color: "#6366f1" } : {}} />
            </button>
          )}
          <button onClick={() => { setAuthed(false); localStorage.removeItem("bm_pw"); setAdminPw(""); }} style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)", color: "#f87171", borderRadius: 9, padding: ".42rem .8rem", cursor: "pointer", fontFamily: "inherit", fontSize: ".75rem", fontWeight: 700 }}>Log Out</button>
          {activeTab === "bots" && (
            <button onClick={() => setShowAddModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 9, padding: ".5rem 1rem", cursor: "pointer", fontFamily: "inherit", fontSize: ".82rem", fontWeight: 700, display: "flex", alignItems: "center", gap: ".35rem", boxShadow: "0 4px 14px rgba(99,102,241,.3)" }}>
              <Plus size={14} /> Add Bot
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.8rem 1.5rem" }}>
        {activeTab === "bots" ? (
          loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: ".8rem", color: "#334155" }}>
              <Loader2 size={36} style={{ animation: "spin .8s linear infinite", color: "#6366f1" }} />
              <span style={{ fontSize: ".9rem" }}>Loading bots…</span>
            </div>
          ) : bots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(99,102,241,.08)", border: "2px dashed rgba(99,102,241,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2rem" }}>
                <Bot size={28} style={{ color: "#334155" }} />
              </div>
              <div style={{ color: "#475569", fontWeight: 700, fontSize: "1rem", marginBottom: ".4rem" }}>No bots yet</div>
              <div style={{ color: "#1e293b", fontSize: ".82rem", marginBottom: "1.4rem" }}>Add your first WhatsApp bot to get started</div>
              <button onClick={() => setShowAddModal(true)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 12, padding: ".8rem 1.5rem", cursor: "pointer", fontFamily: "inherit", fontSize: ".88rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: ".45rem" }}>
                <Plus size={15} /> Add Your First Bot
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <h2 style={{ color: "#94a3b8", fontWeight: 800, fontSize: "1rem" }}>All Bots ({bots.length})</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1rem" }}>
                {bots.map(bot => (
                  <BotCard key={bot.botId || bot._id} bot={bot} adminPw={adminPw} onRefresh={() => loadBots(true)} onToast={addToast} />
                ))}
              </div>
            </>
          )
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <Users size={18} style={{ color: "#818cf8" }} />
              <h2 style={{ color: "#94a3b8", fontWeight: 800, fontSize: "1rem" }}>User Management</h2>
              <div style={{ display: "flex", gap: ".5rem", marginLeft: "auto", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: ".4rem", alignItems: "center", background: "rgba(79,195,247,.06)", border: "1px solid rgba(79,195,247,.15)", borderRadius: 9, padding: ".28rem .7rem", fontSize: ".7rem", color: "#4fc3f7" }}>
                  <DollarSign size={11} /> Balances
                </div>
                <div style={{ display: "flex", gap: ".4rem", alignItems: "center", background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", borderRadius: 9, padding: ".28rem .7rem", fontSize: ".7rem", color: "#818cf8" }}>
                  <Shield size={11} /> Full Admin Control
                </div>
              </div>
            </div>
            <UsersTab adminPw={adminPw} onToast={addToast} />
          </div>
        )}
      </div>
    </div>
  );
}
