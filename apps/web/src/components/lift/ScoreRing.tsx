import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';

interface Props {
  score: number;
  /** Starting number to animate "lift" from (e.g. 42 -> 91). Defaults to previous score or 42. */
  from?: number;
  size?: number;
  /** Use bright electric lime on dark ink surfaces, or WCAG-AA deep lime on light paper surfaces */
  surface?: 'dark' | 'light';
  label?: string;
  showBurst?: boolean;
}

function getScoreColor(val: number, surface: 'dark' | 'light'): string {
  if (val >= 85) return surface === 'dark' ? '#B8FF3B' : '#256B14';
  if (val >= 60) return surface === 'dark' ? '#F5B731' : '#B45309';
  return surface === 'dark' ? '#FF6B6B' : '#C93636';
}

export default function ScoreRing({
  score,
  from,
  size = 92,
  surface = 'light',
  label,
  showBurst = true,
}: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const startVal = from !== undefined ? Math.max(0, Math.min(100, Math.round(from))) : clamped;

  const [displayScore, setDisplayScore] = useState(clamped);
  const prevRef = useRef(startVal);
  const ringRef = useRef<SVGCircleElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<HTMLDivElement | null>(null);

  const strokeWidth = Math.max(5, Math.round(size * 0.085));
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const initial = prevRef.current;
    prevRef.current = clamped;

    if (prefersReduced || initial === clamped) {
      setDisplayScore(clamped);
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(
          circumference - (clamped / 100) * circumference,
        );
      }
      return;
    }

    const ctx = gsap.context(() => {
      const proxy = { val: initial };
      gsap.to(proxy, {
        val: clamped,
        duration: isMobile ? 0.55 : 0.85,
        ease: 'power3.out',
        onUpdate: () => {
          const v = Math.round(proxy.val);
          setDisplayScore(v);
          if (ringRef.current) {
            ringRef.current.style.strokeDashoffset = String(
              circumference - (proxy.val / 100) * circumference,
            );
            ringRef.current.style.stroke = getScoreColor(v, surface);
          }
        },
        onComplete: () => {
          if (showBurst && !isMobile && clamped >= 85 && burstRef.current) {
            const dots = burstRef.current.querySelectorAll('.lift-burst-dot');
            gsap.fromTo(
              dots,
              { scale: 0, opacity: 1, x: 0, y: 0 },
              {
                scale: 1,
                opacity: 0,
                duration: 0.65,
                ease: 'power2.out',
                stagger: 0.02,
                x: (i: number) => Math.cos((i / dots.length) * Math.PI * 2) * (size * 0.62),
                y: (i: number) => Math.sin((i / dots.length) * Math.PI * 2) * (size * 0.62),
              },
            );
          }
        },
      });
    }, wrapRef);

    return () => ctx.revert();
  }, [clamped, circumference, size, surface, showBurst]);

  const activeColor = getScoreColor(displayScore, surface);
  const trackColor = surface === 'dark' ? 'rgba(255,255,255,0.12)' : 'var(--border)';
  const textColor = surface === 'dark' ? '#F5F7FA' : 'var(--text)';
  const subColor = surface === 'dark' ? '#9BA3B4' : 'var(--muted)';
  const dashOffset = circumference - (displayScore / 100) * circumference;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
      aria-label={`Listing score ${clamped} out of 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)',
          filter:
            surface === 'dark' && displayScore >= 85
              ? 'drop-shadow(0 0 10px rgba(184, 255, 59, 0.35))'
              : 'none',
        }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          stroke-width={strokeWidth}
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={activeColor}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={dashOffset}
        />
      </svg>

      {/* Desktop particle burst when score lifts into 85+ zone */}
      <div
        ref={burstRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            class="lift-burst-dot"
            style={{
              position: 'absolute',
              width: '5px',
              height: '5px',
              borderRadius: '999px',
              background: activeColor,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <div style={{ position: 'absolute', textAlign: 'center', lineHeight: 1 }}>
        <span
          class="mono"
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: `${Math.round(size * 0.28)}px`,
            color: textColor,
          }}
        >
          {displayScore}
        </span>
        {label && (
          <span
            style={{
              display: 'block',
              marginTop: '3px',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: subColor,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
