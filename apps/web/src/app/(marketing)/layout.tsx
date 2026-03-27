import dynamic from 'next/dynamic';
import { LenisProvider } from '@/providers/LenisProvider';
import { ThreeProvider } from '@/providers/ThreeProvider';

const SceneCanvas = dynamic(() => import('@/three/canvas/SceneCanvas'), {
  ssr: false,
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <ThreeProvider>
        <SceneCanvas />
        <main>{children}</main>
      </ThreeProvider>
    </LenisProvider>
  );
}
