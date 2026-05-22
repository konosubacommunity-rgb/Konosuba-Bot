import { useState } from 'react';

interface CharAvatarProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  initial?: string;
  color?: string;
}

export function CharAvatar({ src, alt, style, className, initial, color = '#00d4ff' }: CharAvatarProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={className} style={{ ...style, background: `radial-gradient(circle at 40% 30%, ${color}18, #050510)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cinzel', serif", fontWeight: 900, color, fontSize: style?.fontSize || '1.2rem' }}>
        {initial || alt.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...style, objectFit: 'cover', objectPosition: 'top center' }}
      onError={() => setFailed(true)}
    />
  );
}

const CHARS = [
  { img: '/assets/images/kazuma.svg',   name: 'Kazuma',   color: '#00d4ff' },
  { img: '/assets/images/aqua.svg',     name: 'Aqua',     color: '#38bdf8' },
  { img: '/assets/images/megumin.svg',  name: 'Megumin',  color: '#f472b6' },
  { img: '/assets/images/darkness.svg', name: 'Darkness', color: '#ffd700' },
  { img: '/assets/images/wiz.svg',      name: 'Wiz',      color: '#8b5cf6' },
  { img: '/assets/images/yunyun.svg',   name: 'Yunyun',   color: '#c084fc' },
];

export function charForLevel(level: number) {
  return CHARS[Math.max(0, Math.min(CHARS.length - 1, Math.floor((level - 1) / 5))) % CHARS.length];
}

export function charForIndex(i: number) { return CHARS[i % CHARS.length]; }

export { CHARS };
