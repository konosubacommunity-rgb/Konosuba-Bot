import { useState } from "react";
import { Link, useLocation } from "wouter";
import { api, setStoredToken } from "@/lib/api";

export default function Auth() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", email: "", password: "", confirm: "" });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.login(loginForm);
      setStoredToken(res.token);
      setSuccess("Welcome back! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (regForm.password !== regForm.confirm) { setError("Passwords do not match."); return; }
    if (regForm.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res = await api.register({ username: regForm.username, email: regForm.email, password: regForm.password });
      setStoredToken(res.token);
      setSuccess("Account created! Welcome to KonoBot!");
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div className="glass-card auth-card">
        <div className="auth-logo">
          <Link href="/">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <div className="navbar-logo-icon">K</div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--cyan)" }}>KonoBot</span>
            </div>
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "6px" }}>
            {tab === "login" ? "Welcome back, adventurer" : "Join the guild today"}
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); setError(""); setSuccess(""); }}>Login</button>
          <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => { setTab("register"); setError(""); setSuccess(""); }}>Register</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="kazuma@konosuba.world" required
                value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Your legendary password" required
                value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <button className="btn btn-cyan" type="submit" style={{ width: "100%", marginTop: "8px" }} disabled={loading}>
              {loading ? "Authenticating..." : "⚡ Login to Dashboard"}
            </button>
            <p style={{ textAlign: "center", marginTop: "16px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <a href="#" style={{ color: "var(--cyan)" }}>Forgot your password?</a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" placeholder="YourAdventurerName" required
                value={regForm.username} onChange={e => setRegForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" required
                value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min. 6 characters" required
                value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat your password" required
                value={regForm.confirm} onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            <p className="form-hint" style={{ marginBottom: "16px" }}>
              By registering you agree to our <a href="#" style={{ color: "var(--cyan)" }}>Terms of Service</a> and <a href="#" style={{ color: "var(--cyan)" }}>Privacy Policy</a>.
            </p>
            <button className="btn btn-cyan" type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating account..." : "⚔️ Join the Guild"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link href="/">
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", cursor: "pointer" }}>
              ← Back to homepage
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
