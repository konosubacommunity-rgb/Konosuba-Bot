import { Link } from "wouter";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-deep)", padding: "24px",
    }}>
      <div className="glass-card" style={{ padding: "48px 40px", textAlign: "center", maxWidth: "440px", width: "100%" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "16px" }}>💥</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.8rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>404 — Not Found</h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.7 }}>
          Even Megumin couldn't find this page. It may have been destroyed by an Explosion or it never existed.
        </p>
        <Link href="/">
          <button className="btn btn-cyan">⚔️ Return to Base</button>
        </Link>
      </div>
    </div>
  );
}
