import { Link } from 'wouter';
export default function NotFound() {
  return (
    <div className="not-found-page">
      <div style={{ textAlign:'center', padding:'2rem' }}>
        <div className="not-found-code">404</div>
        <h1 style={{ color:'var(--text)', fontFamily:'Cinzel,serif', margin:'1rem 0 0.6rem', fontSize:'1.6rem' }}>Quest Not Found</h1>
        <p style={{ color:'var(--muted)', marginBottom:'2rem', fontSize:'0.95rem' }}>This path leads nowhere, adventurer. Even Kazuma wouldn't follow you here.</p>
        <Link to="/" className="btn primary">⚔ Return to Guild</Link>
      </div>
    </div>
  );
}
