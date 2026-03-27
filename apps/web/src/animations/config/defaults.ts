// ---------------------------------------------------------------------------
// Animation defaults — pure constants, no React
// Breakpoints mirror ITCSS $bp-* values from settings/_variables.scss
// ---------------------------------------------------------------------------

export const DEFAULT_EASE = 'power3.out' as const;
export const DEFAULT_DURATION = 0.8;
export const DEFAULT_STAGGER = 0.15;

export const SCROLL_TRIGGER_DEFAULTS = {
  start: 'top 80%',
  end: 'top 20%',
  toggleActions: 'play none none none',
} as const;

export const SCRUB_DEFAULTS = {
  scrub: 1,
  start: 'top bottom',
  end: 'bottom top',
} as const;

export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
  ultra: 1920,
} as const;

export const MATCH_MEDIA = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  wide: '(min-width: 1440px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  noReducedMotion: '(prefers-reduced-motion: no-preference)',
} as const;
