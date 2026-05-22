export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#05050f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</div>
        <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Page not found</p>
        <a href="/manager" style={{ color: '#00d4ff', textDecoration: 'none', marginTop: '1rem', display: 'inline-block' }}>Back to Manager</a>
      </div>
    </div>
  );
}
