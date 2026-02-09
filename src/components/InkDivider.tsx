/** Sumi-e ink wash divider — inline SVG, no external assets */
export function InkDivider() {
  return (
    <svg className="ink-divider" viewBox="0 0 900 60" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="wash">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feDisplacementMap in="SourceGraphic" scale="8" />
        </filter>
        <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(26,26,26,0)" />
          <stop offset="0.12" stopColor="rgba(26,26,26,0.18)" />
          <stop offset="0.5" stopColor="rgba(26,26,26,0.22)" />
          <stop offset="0.88" stopColor="rgba(26,26,26,0.18)" />
          <stop offset="1" stopColor="rgba(26,26,26,0)" />
        </linearGradient>
      </defs>
      <path
        filter="url(#wash)"
        fill="url(#fade)"
        d="M20,32 C140,18 230,42 350,30 C470,18 560,45 690,28 C770,18 830,34 880,26
           L880,40 C820,52 760,42 690,46 C560,54 470,34 350,48 C230,62 140,38 20,54 Z"
      />
    </svg>
  );
}
