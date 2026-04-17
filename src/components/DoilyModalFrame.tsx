import React from "react";

export function DoilyModalFrame({
  children,
  bgImageUrl,
  size = 460, // max size
}: {
  children: React.ReactNode;
  bgImageUrl: string;
  size?: number;
}) {
  const cx = 210, cy = 210;

  const cloudPath = `
    M210 72
    C270 72 308 110 314 152
    C352 162 364 200 352 230
    C372 266 344 308 302 312
    C290 350 252 368 210 356
    C168 368 130 350 118 312
    C76 308 48 266 68 230
    C56 200 68 162 106 152
    C112 110 150 72 210 72
    Z
  `;

  return (
    <div className="relative flex-shrink-0 overflow-visible" style={{ padding: "8px" }}>
      <div
        className="origin-center"
        style={{
          width: `min(${size}px, 92vw)`,
          height: `min(${size}px, 92vw)`,
          transform: "scale(1.35)",
        }}
      >
        <svg viewBox="0 0 420 420" className="absolute inset-0 w-full h-full">
          <defs>
            <clipPath id="cloudClip">
              <path d={cloudPath} />
            </clipPath>

            <filter id="cloudShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="18" stdDeviation="18" floodOpacity="0.28" />
            </filter>

            <radialGradient id="warmGlow" cx="50%" cy="75%" r="60%">
              <stop offset="0%" stopColor="rgba(253,230,138,0.50)" />
              <stop offset="55%" stopColor="rgba(253,230,138,0.16)" />
              <stop offset="100%" stopColor="rgba(253,230,138,0)" />
            </radialGradient>

            <radialGradient id="topHighlight" cx="50%" cy="10%" r="80%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <g filter="url(#cloudShadow)">
            <image
              href={bgImageUrl}
              x="40"
              y="40"
              width="340"
              height="340"
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#cloudClip)"
              opacity="1"
              style={{ filter: "contrast(1.10) saturate(1.05)" }}
            />

            <circle cx={cx} cy={cy} r={175} clipPath="url(#cloudClip)" fill="url(#warmGlow)" />
            <circle cx={cx} cy={cy} r={185} clipPath="url(#cloudClip)" fill="url(#topHighlight)" />

            {/* very light overlay for readability */}
            <path d={cloudPath} clipPath="url(#cloudClip)" fill="white" opacity="0.10" />

            {/* subtle white outline */}
            <path d={cloudPath} fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="2" />
          </g>
        </svg>

        {/* Content: no clip-path (prevents weird text cutting) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
