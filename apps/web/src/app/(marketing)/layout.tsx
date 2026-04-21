import { LenisProvider } from '@/providers/LenisProvider';
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
      <ScrollProgressIndicator />
      <Header />
      <ClientEnhancements />
      <main style={{ paddingTop: 'var(--header-height)' }}>{children}</main>
      <Footer />
    </LenisProvider>
  );
}
