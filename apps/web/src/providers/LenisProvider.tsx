'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { gsap, ScrollTrigger } from '@/animations/config/gsap-register';
import { MATCH_MEDIA } from '@/animations/config/defaults';

// ---------------------------------------------------------------------------
// Scroll Progress Context — a ref (NOT state) so Three.js reads it at 60fps
// without causing React re-renders
// ---------------------------------------------------------------------------

const ScrollProgressContext = createContext<MutableRefObject<number> | null>(null);

export function useScrollProgress(): MutableRefObject<number> {
  const ref = useContext(ScrollProgressContext);
  if (!ref) {
    throw new Error('useScrollProgress must be used within a LenisProvider');
  }
  return ref;
}

// ---------------------------------------------------------------------------
// LenisGSAPBridge — inner component that connects Lenis to GSAP's ticker
// Must be rendered inside <ReactLenis> so useLenis() has context
// ---------------------------------------------------------------------------

function LenisGSAPBridge({
  scrollProgressRef,
}: {
  scrollProgressRef: MutableRefObject<number>;
}) {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    // Drive Lenis from GSAP's ticker (single RAF loop)
    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    // Sync ScrollTrigger with Lenis scroll position
    const scrollCallback = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', scrollCallback);

    // Update scroll progress ref on every scroll event
    const progressCallback = () => {
      scrollProgressRef.current = lenis.progress;
    };
    lenis.on('scroll', progressCallback);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.off('scroll', scrollCallback);
      lenis.off('scroll', progressCallback);
    };
  }, [lenis, scrollProgressRef]);

  // Handle prefers-reduced-motion changes.
  //
  // Lenis exposes `.options` as a public, documented mutable property (see
  // https://github.com/darkroomengineering/lenis#lenis-instance-properties)
  // that can be updated at runtime to flip feature flags like smoothWheel
  // without re-instantiating. This is the Lenis-idiomatic pattern and is
  // preferred here over stop()/start() because the Preloader toggles
  // stop()/start() for scroll-locking — coupling both to the same API would
  // create a race where completing the preloader would re-enable smooth
  // wheel scrolling even when the user prefers reduced motion.
  //
  // The react-hooks/immutability rule is over-zealous for this third-party
  // API surface; the lenis instance is a long-lived external object, not a
  // React-managed value. We disable only this specific mutation site with a
  // narrow justification.
  useEffect(() => {
    if (!lenis) return;

    const mql = window.matchMedia(MATCH_MEDIA.reducedMotion);

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // Mutating a documented public field on an external instance — safe.
      // eslint-disable-next-line react-hooks/immutability
      lenis.options.smoothWheel = !e.matches;
    };

    // Apply initial state
    handleChange(mql);

    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [lenis]);

  return null;
}

// ---------------------------------------------------------------------------
// LenisProvider — wraps children with smooth scroll + GSAP sync
// ---------------------------------------------------------------------------

export function LenisProvider({ children }: { children: ReactNode }) {
  const scrollProgressRef = useRef(0);

  return (
    <ScrollProgressContext.Provider value={scrollProgressRef}>
      <ReactLenis root options={{ autoRaf: false, lerp: 0.1 }}>
        <LenisGSAPBridge scrollProgressRef={scrollProgressRef} />
        {children}
      </ReactLenis>
    </ScrollProgressContext.Provider>
  );
}

// Re-export useLenis for direct instance access when needed
export { useLenis as useLenisInstance } from 'lenis/react';
