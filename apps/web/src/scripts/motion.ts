import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let activeContext: gsap.Context | null = null;

export function initPageMotion(): void {
  if (typeof window === 'undefined') return;

  if (activeContext) {
    activeContext.revert();
    activeContext = null;
  }

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    activeContext = gsap.context(() => {
      // Single authored entrance on the hero composition (exponential ease-out, compositor-only)
      const heroItems = document.querySelectorAll('[data-hero-stagger]');
      if (heroItems.length > 0) {
        gsap.from(heroItems, {
          y: 16,
          opacity: 0,
          duration: 0.6,
          stagger: 0.06,
          ease: 'expo.out',
          clearProps: 'transform,opacity',
        });
      }

      // Subtle, restrained reveal for key editorial bands only
      const bands = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      bands.forEach((band) => {
        gsap.from(band, {
          y: 14,
          opacity: 0,
          duration: 0.5,
          ease: 'expo.out',
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: band,
            start: 'top 90%',
            once: true,
          },
        });
      });
    });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageMotion, { once: true });
  } else {
    initPageMotion();
  }
  document.addEventListener('astro:page-load', initPageMotion);
}
