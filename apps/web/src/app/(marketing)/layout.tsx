import { LenisProvider } from '@/providers/LenisProvider';
import { ThreeProvider } from '@/providers/ThreeProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { ClientEnhancements } from '@/components/layout/ClientEnhancements';

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
        <ClientEnhancements />
        <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
        <Footer />
      </ThreeProvider>
    </LenisProvider>
  );
}
