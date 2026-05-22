import { useState } from 'react';

// Import all SVG assets via Vite — this ensures they're bundled,
// content-hashed, and served correctly in any deployment environment.
import kazumaImg   from '../assets/images/kazuma.svg';
import aquaImg     from '../assets/images/aqua.svg';
import meguminImg  from '../assets/images/megumin.svg';
import darknessImg from '../assets/images/darkness.svg';
import wizImg      from '../assets/images/wiz.svg';
import yunyunImg   from '../assets/images/yunyun.svg';
import fallbackImg from '../assets/images/fallback.svg';

export const CHARS = [
  { img: kazumaImg,   name: 'Kazuma',   color: '#4effff' },
  { img: aquaImg,     name: 'Aqua',     color: '#38bdf8' },
  { img: meguminImg,  name: 'Megumin',  color: '#f472b6' },
  { img: darknessImg, name: 'Darkness', color: '#ffd700' },
  { img: wizImg,      name: 'Wiz',      color: '#8b5cf6' },
  { img: yunyunImg,   name: 'Yunyun',   color: '#c084fc' },
];

export const CHAR_IMAGES = { kazumaImg, aquaImg, meguminImg, darknessImg, wizImg, yunyunImg, fallbackImg };

export function charForLevel(level: number) {
  return CHARS[Math.max(0, Math.min(CHARS.length - 1, Math.floor((level - 1) / 5))) % CHARS.length];
}
export function charForIndex(i: number) { return CHARS[i % CHARS.length]; }

interface CharAvatarProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  initial?: string;
  color?: string;
}

export function CharAvatar({ src, alt, style, className, initial, color = '#4effff' }: CharAvatarProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: `radial-gradient(circle at 40% 30%, ${color}18, #0b0d12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel', serif", fontWeight: 900,
          color, fontSize: style?.fontSize || '1.2rem',
        }}
      >
        {initial || alt.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...style, objectFit: 'contain', objectPosition: 'center' }}
      onError={() => setFailed(true)}
    />
  );
}
