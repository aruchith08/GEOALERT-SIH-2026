import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 28 }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        
        {/* Background rounded squircle */}
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#logoGrad)" />
        
        {/* Topographic Contours */}
        <path
          d="M 12 44 Q 24 32 36 38 T 52 28"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 12 50 Q 26 38 40 44 T 52 38"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Central Beacon Marker */}
        <circle cx="32" cy="24" r="8" fill="#ffffff" />
        <circle cx="32" cy="24" r="4.5" fill="#ef4444" />
        
        {/* Pulse Beacon Ring */}
        <circle
          cx="32"
          cy="24"
          r="13"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeOpacity="0.7"
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
}
