import { Link } from 'react-router-dom';

function Logo({ size = 44, lien = '/' }) {
  return (
    <Link to={lien} className="inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 180 180" width={size} height={size}>
        <defs>
          <linearGradient id="degLigneLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7CD9BB" />
            <stop offset="55%" stopColor="#0F6E56" />
            <stop offset="100%" stopColor="#085041" />
          </linearGradient>
          <linearGradient id="degFondLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B2B24" />
            <stop offset="100%" stopColor="#153F34" />
          </linearGradient>
        </defs>

        <rect className="logo-fond" x="0" y="0" width="180" height="180" rx="46" fill="url(#degFondLogo)" />

        <path
          className="logo-trait logo-trait-1"
          d="M98 42
            C60 30, 32 52, 32 90
            C32 128, 60 148, 94 140
            C106 137, 112 130, 114 116"
          fill="none" stroke="url(#degLigneLogo)" strokeWidth="15" strokeLinecap="round" pathLength="1"
        />

        <path
          className="logo-trait logo-trait-2"
          d="M114 116 L114 44"
          fill="none" stroke="url(#degLigneLogo)" strokeWidth="15" strokeLinecap="round" pathLength="1"
        />

        <path
          className="logo-trait logo-trait-3"
          d="M114 44
            C143 44, 155 58, 155 76
            C155 94, 143 101, 117 99"
          fill="none" stroke="url(#degLigneLogo)" strokeWidth="15" strokeLinecap="round" pathLength="1"
        />

        <g className="logo-pixels" fill="#ffffff">
          <rect x="142" y="130" width="6" height="6" />
          <rect x="151" y="130" width="6" height="6" opacity="0.5" />
          <rect x="142" y="139" width="6" height="6" opacity="0.5" />
        </g>
      </svg>
    </Link>
  );
}

export default Logo;