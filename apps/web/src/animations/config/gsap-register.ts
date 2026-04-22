import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  ScrollToPlugin,
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
  ScrollToPlugin,
  CustomEase,
  MotionPathPlugin,
  useGSAP,
};
