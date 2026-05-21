export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-deep)", padding: "24px",
    }}>
      <div className="glass-card" style={{ padding: "40px", textAlign: "center", maxWidth: "380px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💥</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>404 Not Found</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>This admin panel page doesn't exist.</p>
        <a href="/"><button className="btn btn-outline btn-sm">← Back to Manager</button></a>
      </div>
    </div>
  );
}
