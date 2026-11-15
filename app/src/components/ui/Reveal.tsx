// Reveal once on scroll (block 5, D-038). Content is never hidden without JavaScript or under reduced motion: only an
// element that starts BELOW the fold is set pending, and it animates in (rise + fade, spring) the first time it is
// at least 15 % visible. Transform and opacity only. Classes in index.css (.dn-reveal-pending, .dn-reveal-in).
import { createElement, useEffect, useRef, type ReactNode } from 'react';

export interface RevealProps {
  children: ReactNode;
  /** The element to render; defaults to div. */
  as?: 'div' | 'section' | 'li' | 'figure' | 'article';
  className?: string;
  /** Passed through for tests and labelling. */
  id?: string;
  'aria-labelledby'?: string;
  'data-testid'?: string;
}

export function Reveal({ children, as = 'div', className = '', ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: never hide it
    el.classList.add('dn-reveal-pending');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.classList.remove('dn-reveal-pending');
          el.classList.add('dn-reveal-in');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove('dn-reveal-pending');
    };
  }, []);
  return createElement(as, { ref, className, ...rest }, children);
}
