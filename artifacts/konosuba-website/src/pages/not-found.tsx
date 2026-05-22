import { Link } from "wouter";
export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-inner">
        <div className="not-found-code">404</div>
        <h1>Lost in the Dungeon</h1>
        <p>This page doesn't exist in our realm.</p>
        <Link to="/" className="glow-btn">Return to Home</Link>
      </div>
    </div>
  );
}
