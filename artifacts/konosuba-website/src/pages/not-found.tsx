import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="not-found-code">404</div>
        <h1 style={{ color: '#fff', margin: '1rem 0 0.5rem', fontFamily: 'Cinzel, serif' }}>Quest Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>This path leads nowhere, adventurer. Even Kazuma wouldn't follow you here.</p>
        <Link to="/" className="glow-btn">⚔ Return to Guild</Link>
      </div>
    </div>
  );
}
