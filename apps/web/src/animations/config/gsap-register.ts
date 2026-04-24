import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';

// ScrollToPlugin intentionally NOT registered here.
// Rationale: Lenis owns scroll in this app. The only consumer that
// needs programmatic scrolling is HowItWorks rail-seek, and it calls
// `lenisInstance.scrollTo(...)` directly (with a `window.scrollTo`
// fallback). Leaving ScrollToPlugin out of the global register trims
// ~2.3 KB gzipped from every route. See motion-system.ts docstring
// under PLUGIN_REGISTRATION_POLICY.
gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  CustomEase,
  MotionPathPlugin,
  useGSAP,
);

gsap.defaults({
  ease: 'power3.out',
  duration: 0.8,
});

export {
  gsap,
  ScrollTrigger,
  SplitText,
  CustomEase,
  MotionPathPlugin,
  useGSAP,
};
