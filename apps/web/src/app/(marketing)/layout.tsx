import dynamic from 'next/dynamic';
import { LenisProvider } from '@/providers/LenisProvider';
import { ThreeProvider } from '@/providers/ThreeProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';

const SceneCanvas = dynamic(() => import('@/three/canvas/SceneCanvas'), {
  ssr: false,
});

const CustomCursor = dynamic(
  () =>
    import('@/components/ui/CustomCursor/CustomCursor').then(
      (m) => m.CustomCursor,
    ),
  { ssr: false },
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <ThreeProvider>
        <ScrollProgressIndicator />
        <Header />
        <SceneCanvas />
        <CustomCursor />
        <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
        <Footer />
      </ThreeProvider>
    </LenisProvider>
  );
}
