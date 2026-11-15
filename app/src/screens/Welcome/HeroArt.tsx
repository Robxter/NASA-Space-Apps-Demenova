// "From orbit to the root zone": the Welcome hero illustration (block 5, D-038). Abstract and data-free: a
// constellation of three satellites circling the Earth's limb, rain falling upstream onto a river, and a soil core in
// the ground whose water rises once and moves gently at its surface. Transform and opacity only; the loops pause off
// screen and rest under prefers-reduced-motion (index.css .dn-orbit/.dn-rain/.dn-wave; welcome.css for the rise).
import { useEffect, useRef } from 'react';

function Satellite({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle} 200 480)`}>
      <g transform="translate(200 180)">
        <rect x="-11" y="-2" width="7" height="4" rx="1" fill="#86CDA2" />
        <rect x="4" y="-2" width="7" height="4" rx="1" fill="#86CDA2" />
        <rect x="-3.5" y="-3.5" width="7" height="7" rx="1.5" fill="#F4DF8E" />
      </g>
    </g>
  );
}

const STARS: [number, number, number][] = [
  [34, 36, 1.2], [78, 92, 0.8], [122, 28, 1], [168, 70, 0.7], [236, 34, 1.3], [282, 88, 0.8],
  [330, 40, 1], [370, 104, 0.7], [58, 150, 0.8], [354, 160, 1], [256, 128, 0.6], [146, 120, 0.7],
];

export function HeroArt({ label }: { label: string }) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The water rises once, a beat after the page arrives (a transition: no keyframe, interruptible).
    const raf = requestAnimationFrame(() => el.classList.add('is-in'));
    // Ambient loops stop when the illustration is off screen.
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) el.classList.toggle('is-paused', !e.isIntersecting);
      });
      io.observe(el);
    }
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, []);

  return (
    <svg ref={ref} className="hero-art block h-auto w-full" viewBox="0 0 400 300" role="img" aria-label={label}>
      <defs>
        <linearGradient id="dn-hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A1726" />
          <stop offset="1" stopColor="#14294A" />
        </linearGradient>
        <linearGradient id="dn-hero-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F7A50" />
          <stop offset="0.35" stopColor="#1F4D33" />
          <stop offset="1" stopColor="#3A2E21" />
        </linearGradient>
        <clipPath id="dn-hero-panel">
          <rect width="400" height="300" rx="22" />
        </clipPath>
        <clipPath id="dn-hero-core">
          <rect x="294" y="200" width="28" height="82" rx="6" />
        </clipPath>
      </defs>

      <g clipPath="url(#dn-hero-panel)">
        <rect width="400" height="300" fill="url(#dn-hero-sky)" />
        {STARS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#E7EDF2" opacity={0.35 + r * 0.35} />
        ))}

        {/* Orbit and the constellation (three satellites, one always in view). */}
        <circle cx="200" cy="480" r="300" fill="none" stroke="#E7EDF2" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 6" />
        <g className="dn-orbit hero-orbit">
          <Satellite angle={0} />
          <Satellite angle={120} />
          <Satellite angle={240} />
        </g>

        {/* The Earth's limb, its thin atmosphere, and the soil below the surface. */}
        <circle cx="200" cy="480" r="268" fill="none" stroke="#72CEDA" strokeOpacity="0.35" strokeWidth="3" />
        <circle cx="200" cy="480" r="260" fill="url(#dn-hero-earth)" />

        {/* Upstream: a cloud and its rain, and the river that carries it towards the farm. */}
        <g opacity="0.92" transform="translate(0 46)">
          <circle cx="98" cy="152" r="13" fill="#B3C0CC" />
          <circle cx="116" cy="146" r="17" fill="#C9D3DC" />
          <circle cx="136" cy="154" r="12" fill="#B3C0CC" />
          <rect x="88" y="152" width="58" height="12" rx="6" fill="#C9D3DC" />
        </g>
        <g className="hero-rain" stroke="#72CEDA" strokeWidth="2" strokeLinecap="round">
          {[94, 103, 112, 121, 130, 139].map((x) => (
            <line key={x} className="dn-rain" x1={x} y1="218" x2={x - 3} y2="228" />
          ))}
        </g>
        <path d="M70 240 C 130 232, 170 252, 230 244 S 280 238, 294 246" fill="none" stroke="#72CEDA" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />

        {/* The root zone: a soil core in the ground; its water rises once and its surface moves. */}
        <rect x="290" y="196" width="36" height="90" rx="10" fill="#0A1726" fillOpacity="0.55" />
        <g clipPath="url(#dn-hero-core)">
          <g className="hero-water">
            <rect x="290" y="232" width="40" height="60" fill="#3591A0" />
            <path className="dn-wave" d="M290 232 q 7 -4 14 0 t 14 0 t 14 0 t 14 0 t 14 0 t 14 0 v 8 h -84 z" fill="#3591A0" />
          </g>
        </g>
        <rect x="290" y="196" width="36" height="90" rx="10" fill="none" stroke="#E7EDF2" strokeWidth="2.5" />
        <path d="M296 214 h 24 M296 222 h 24" stroke="#E7EDF2" strokeOpacity="0.25" strokeWidth="1" />
      </g>
    </svg>
  );
}
